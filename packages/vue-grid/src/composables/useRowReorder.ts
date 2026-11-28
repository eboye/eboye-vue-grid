import { nextTick, onBeforeUnmount, watch, type Component, type Ref } from 'vue'
import VGridRowHandle from '../components/VGridRowHandle.vue'
import { DRAG_COLUMN_KEY, type ResolvedColumn } from '../internal/context'
import { domRowKey, gridElement, rowKeyAttrs } from '../internal/gridDom'
import type { RowKey, RowMoveEvent } from '../types'

export interface RowReorderOptions<T> {
  root: Ref<HTMLElement | undefined>
  /** `row-reorder` is on (the handle column shows). */
  on: () => boolean
  /** Rows can be moved right now: not while they are sorted or grouped. */
  enabled: () => boolean
  /** Visits every row that passes the filters, children included (to find one by key). */
  walk: (visit: (row: T) => void) => void
  getKey: (row: T) => RowKey
  emit: (event: RowMoveEvent<T>) => void
}

/** What the grid's cells need (part of the grid context). */
export interface RowReorderState {
  /** The handle column (pinned on the left when other columns are). */
  column: (pinned: 'left' | undefined) => ResolvedColumn
  /** The handle, rendered in the handle column's cells. */
  Handle: Component
  enabled: () => boolean
  /** Pointer down on a handle: starts a drag. */
  start: (event: PointerEvent) => void
}

const THRESHOLD = 4
/** Px from the grid's top / bottom edge where a drag scrolls it, and the most it scrolls a frame. */
const EDGE = 32
const MAX_STEP = 24

const ROW = '.vg-row[data-row-key]:not(.vg-rowgroup)'

/** The rows' parent: the grid, or a sub-grid (its `data-subgrid-for`). */
const parentKeyOf = (row: Element) => {
  const parent = row.parentElement
  if (!parent) return null
  const key = parent.getAttribute('data-subgrid-for')
  return key === null ? null : domRowKey(key, parent.getAttribute('data-vg-subgrid-key-type'))
}
const rowKeyOf = (row: Element) =>
  domRowKey(row.getAttribute('data-row-key')!, row.getAttribute('data-vg-row-key-type'))

/** The data rows next to each other at this row's level. */
function siblings(row: Element): Element[] {
  return Array.from(row.parentElement?.children ?? []).filter((el) => el.matches(ROW))
}

/**
 * Row reordering: a handle per row (drag with mouse, pen or touch) and Alt+↑ / Alt+↓ on a row's
 * cells. Rows move among their siblings only (a nested row stays under its parent). Controlled,
 * like editing: the grid emits `row-move` and the app moves the row in its data.
 */
export function useRowReorder<T>(o: RowReorderOptions<T>): RowReorderState {
  let drag: {
    key: RowKey
    parent: RowKey | null
    pointerId: number
    x: number
    y: number
    moving: boolean
    pointer: { x: number; y: number }
  } | null = null
  let marked: Element | null = null
  let frame = 0

  const find = (key: RowKey) => {
    let found: T | undefined
    o.walk((row) => {
      if (found === undefined && o.getKey(row) === key) found = row
    })
    return found
  }

  const rowEl = (key: RowKey) => gridElement(o.root.value, `${ROW}${rowKeyAttrs(key)}`)

  function mark(target: Element | null, side?: 'before' | 'after') {
    if (marked && marked !== target) marked.removeAttribute('data-vg-drop')
    marked = target
    if (target && side) target.setAttribute('data-vg-drop', side)
  }

  /** The row under the pointer at the dragged row's level, and which half of it. */
  function targetAt(x: number, y: number) {
    if (!drag) return null
    const el = document.elementFromPoint(x, y)?.closest(ROW)
    if (!el || el.closest('.vg') !== o.root.value || parentKeyOf(el) !== drag.parent) return null
    const key = rowKeyOf(el)
    if (key === drag.key) return null
    const r = (el.firstElementChild ?? el).getBoundingClientRect()
    const side: 'before' | 'after' = y < r.top + r.height / 2 ? 'before' : 'after'
    // next to itself already: no move
    const source = rowEl(drag.key)
    if (source) {
      const list = siblings(source)
      const at = list.indexOf(source)
      if ((side === 'before' && list[at + 1] === el) || (side === 'after' && list[at - 1] === el))
        return null
    }
    return { el, key, side }
  }

  function update() {
    if (!drag?.moving) return
    const t = targetAt(drag.pointer.x, drag.pointer.y)
    mark(t?.el ?? null, t?.side)
  }

  /** Near the top or bottom edge: scroll, and look again for the row under the pointer. */
  function autoScroll() {
    cancelAnimationFrame(frame)
    const el = o.root.value
    if (!drag?.moving || !el) return
    const box = el.getBoundingClientRect()
    const header =
      el.querySelector(':scope > .vg-header')?.getBoundingClientRect().bottom ?? box.top
    const y = drag.pointer.y
    const step = (d: number) => Math.max(-MAX_STEP, Math.min(MAX_STEP, d / 2))
    const dy =
      y < header + EDGE
        ? step(y - header - EDGE)
        : y > box.bottom - EDGE
          ? step(y - box.bottom + EDGE)
          : 0
    if (dy) {
      const before = el.scrollTop
      el.scrollTop += dy
      if (el.scrollTop !== before) update()
    }
    frame = requestAnimationFrame(autoScroll)
  }

  function onMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    drag.pointer = { x: e.clientX, y: e.clientY }
    if (!drag.moving) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < THRESHOLD) return
      drag.moving = true
      rowEl(drag.key)?.setAttribute('data-vg-dragging', '')
      o.root.value?.setAttribute('data-vg-row-drag', '')
      autoScroll()
    }
    e.preventDefault()
    update()
  }

  function onUp(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    const t = drag.moving ? targetAt(e.clientX, e.clientY) : null
    const key = drag.key
    stop()
    if (t) move(key, t.key, t.side, 'drag')
  }

  function stop() {
    cancelAnimationFrame(frame)
    mark(null)
    if (drag) rowEl(drag.key)?.removeAttribute('data-vg-dragging')
    o.root.value?.removeAttribute('data-vg-row-drag')
    drag = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', stop)
  }

  function start(e: PointerEvent) {
    if (e.button !== 0 || !o.enabled()) return
    const row = (e.currentTarget as Element).closest(ROW)
    if (!row) return
    e.preventDefault() // no text selection, no focus jump while dragging
    drag = {
      key: rowKeyOf(row),
      parent: parentKeyOf(row),
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moving: false,
      pointer: { x: e.clientX, y: e.clientY },
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', stop)
  }

  /** Emits the move; afterwards, focus stays with the moved row (Vue moves its cells). */
  function move(
    key: RowKey,
    targetKey: RowKey,
    position: 'before' | 'after',
    source: 'drag' | 'keyboard',
  ) {
    const row = find(key)
    const target = find(targetKey)
    if (row === undefined || target === undefined) return
    const targetEl = rowEl(targetKey)
    const parentKey = targetEl ? parentKeyOf(targetEl) : null
    const parent = parentKey === null ? null : (find(parentKey) ?? null)
    const focused = document.activeElement
    const colKey =
      focused && focused.closest('.vg') === o.root.value
        ? focused.closest('[data-col-key]')?.getAttribute('data-col-key')
        : null
    o.emit({
      row,
      rowKey: o.getKey(row),
      target,
      targetKey: o.getKey(target),
      position,
      parent,
      parentKey: parent === null ? null : o.getKey(parent),
      source,
    })
    if (!colKey) return
    void nextTick(() => {
      const cell = rowEl(key)?.querySelector<HTMLElement>(
        `:scope > [data-col-key="${CSS.escape(colKey)}"]`,
      )
      if (cell && document.activeElement !== cell) {
        const inner = focused instanceof HTMLElement && cell.contains(focused) ? focused : cell
        inner.focus({ preventScroll: true })
      }
      cell?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    })
  }

  /** Alt+↑ / Alt+↓ on a row's cell (or its handle): one place up or down among its siblings. */
  function onKeyDown(e: KeyboardEvent) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    const row = (e.target as Element).closest?.(ROW)
    if (!row || row.closest('.vg') !== o.root.value || !o.enabled()) return
    if ((e.target as Element).closest('input, textarea, select, [contenteditable]')) return
    const list = siblings(row)
    const at = list.indexOf(row)
    const up = e.key === 'ArrowUp'
    const next = list[up ? at - 1 : at + 1]
    e.preventDefault()
    e.stopPropagation()
    if (next) move(rowKeyOf(row), rowKeyOf(next), up ? 'before' : 'after', 'keyboard')
  }

  watch(
    () => [o.root.value, o.on()] as const,
    ([el, on], _, onCleanup) => {
      if (!el || !on) return
      // capture: before keyboard navigation reads Alt+↑ / Alt+↓ as plain arrows
      el.addEventListener('keydown', onKeyDown, true)
      onCleanup(() => el.removeEventListener('keydown', onKeyDown, true))
    },
    { immediate: true, flush: 'post' },
  )
  onBeforeUnmount(stop)

  return {
    Handle: VGridRowHandle,
    enabled: o.enabled,
    start,
    column: (pinned) => ({
      key: DRAG_COLUMN_KEY,
      kind: 'drag',
      def: { key: DRAG_COLUMN_KEY, width: 'var(--vg-drag-column-width)' },
      component: undefined,
      definition: undefined,
      options: {},
      align: 'center',
      pinned,
      pinEdge: false,
      isTree: false,
      isDetail: false,
    }),
  }
}
