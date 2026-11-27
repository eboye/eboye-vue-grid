import {
  computed,
  nextTick,
  onBeforeUnmount,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import { trackSize } from '../core/columns'
import { columnSpan, parseTracks, virtualTrack } from '../core/virtualColumns'
import type { ResolvedColumn } from '../internal/context'
import type { VirtualColumnsOptions } from '../types'

export interface UseVirtualColumnsOptions {
  root: Ref<HTMLElement | undefined>
  /** `virtual-columns`: on, with options, or off. */
  options: () => VirtualColumnsOptions | boolean | undefined
  /** The shown columns in order, the selection checkbox included. */
  columns: () => readonly (ResolvedColumn & { sized?: boolean })[]
  /** Keep the intrinsic width of columns whose pins may be temporarily suspended. */
  keepSized?: (key: string) => boolean
}

/** What the grid's components need (part of the grid context). */
export interface VirtualColumnsState {
  /** Column virtualization is on. */
  active: ComputedRef<boolean>
  /** The columns to render: in view (plus overscan), pinned, the checkbox and the focused one. */
  rendered: ComputedRef<readonly ResolvedColumn[]>
  /** A column's track (1-based, `grid-column` and `aria-colindex`); undefined when off. */
  at(key: string): number | undefined
  /** Explicit placement for a rendered cell; undefined when off. */
  place(key: string, span?: number): { gridColumn: string } | undefined
  /** Whether columns `index` … `index + span - 1` (0-based) have anything in view. */
  shows(index: number, span: number): boolean
  /** Scrolls the grid sideways until the column is in view (rendering it). */
  reveal(key: string): Promise<void>
  /** The grid template with content-sized tracks of columns that may be left out made definite. */
  template(columns: readonly (ResolvedColumn & { sized?: boolean })[]): string
}

/** Columns rendered before the grid has been laid out (then measured): about a screenful. */
const INITIAL = 24

/** Columns that are always rendered: pinned ones and the selection checkbox. */
const always = (c: ResolvedColumn) => !!c.pinned || c.kind !== 'data'

/**
 * Column virtualization: of the columns between the pinned ones, only those in view (plus
 * `overscan` on each side) render cells. Every column keeps its track in the grid template, so
 * the CSS grid (and the sub-grids sharing it) lays out as before; rendered cells are placed on
 * their track with `grid-column`. Track positions come from the browser (the template as laid
 * out), read again when the grid resizes or the columns change; scrolling only compares numbers.
 * An intrinsic pinned track can also change size without changing the grid's box.
 */
export function useVirtualColumns(o: UseVirtualColumnsOptions): VirtualColumnsState {
  const active = computed(() => !!o.options())
  const config = computed(() => {
    const v = o.options()
    return typeof v === 'object' ? v : {}
  })

  function track(column: ResolvedColumn & { sized?: boolean }): string {
    return always(column) || column.sized || o.keepSized?.(column.key)
      ? trackSize(column.def)
      : virtualTrack(column.def, config.value.width ?? '10rem')
  }

  /** Track sizes in px, as laid out (null: not measured, or not a laid-out grid). */
  const sizes = shallowRef<number[] | null>(null)
  /** Scrolled distance from the start edge, in px (positive in RTL too). */
  const scroll = shallowRef(0)
  const viewport = shallowRef(0)
  /** The column holding focus stays rendered, so focus (and an open editor) isn't lost. */
  const focusKey = shallowRef<string | null>(null)
  /** The layout can't be read (no layout engine, e.g. jsdom): every column renders. */
  const unmeasurable = shallowRef(false)

  const index = computed(() => new Map(o.columns().map((c, i) => [c.key, i])))

  const windowOf = () => {
    const s = sizes.value
    if (!active.value || !s || s.length !== o.columns().length || !viewport.value) return null
    return columnSpan(s, scroll.value, viewport.value, config.value.overscan ?? 2)
  }
  // Two numbers, so a scroll that keeps the same columns in view re-renders nothing.
  const first = computed(() => windowOf()?.first ?? -1)
  const last = computed(() => windowOf()?.last ?? -1)

  const rendered = computed<readonly ResolvedColumn[]>(() => {
    const cols = o.columns()
    if (!active.value || unmeasurable.value) return cols
    // not laid out yet (first render): a first screenful, not every column
    const a = first.value < 0 ? 0 : first.value
    const b = first.value < 0 ? INITIAL - 1 : last.value
    return cols.filter(
      (c, i) => (i >= a && i <= b) || always(c) || o.keepSized?.(c.key) || c.key === focusKey.value,
    )
  })

  function read() {
    const el = o.root.value
    if (!el) return
    scroll.value = Math.abs(el.scrollLeft)
    viewport.value = el.clientWidth
  }

  function measure() {
    const el = o.root.value
    if (!el || !active.value) return
    const next = parseTracks(getComputedStyle(el).gridTemplateColumns)
    unmeasurable.value = !next
    const prev = sizes.value
    if (
      !next ||
      !prev ||
      next.length !== prev.length ||
      next.some((v, i) => Math.abs(v - prev[i]!) > 0.5)
    )
      sizes.value = next
    read()
  }

  let frame = 0
  const schedule = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }
  const onScroll = () => read()
  const onFocusIn = (e: FocusEvent) => {
    const cell = (e.target as Element | null)?.closest?.('[data-col-key]')
    // a cell of this grid only (not of a grid nested in a detail row)
    focusKey.value =
      cell && cell.closest('.vg') === o.root.value ? cell.getAttribute('data-col-key') : null
  }

  const observedKeys = computed(
    () =>
      new Set(
        o
          .columns()
          .filter((column) => always(column) || o.keepSized?.(column.key))
          .map((column) => column.key),
      ),
  )
  watch(
    () => [o.root.value, active.value, observedKeys.value] as const,
    ([el, on, keys], _, onCleanup) => {
      if (!el || !on) return
      el.addEventListener('scroll', onScroll, { passive: true })
      el.addEventListener('focusin', onFocusIn)
      const observer =
        typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule)
      if (observer) {
        observer.observe(el)
        const cells = el.querySelectorAll<HTMLElement>(':scope > .vg-header > [data-col-key]')
        for (const cell of cells)
          if (keys.has(cell.dataset.colKey!)) observer.observe(cell, { box: 'border-box' })
      }
      measure()
      onCleanup(() => {
        el.removeEventListener('scroll', onScroll)
        el.removeEventListener('focusin', onFocusIn)
        observer?.disconnect()
      })
    },
    { flush: 'post', immediate: true },
  )
  // New columns, a resize or a reorder: the tracks move.
  watch(
    () => active.value && JSON.stringify(o.columns().map((column) => [column.key, track(column)])),
    schedule,
    { flush: 'post' },
  )
  onBeforeUnmount(() => cancelAnimationFrame(frame))

  const at = (key: string) => {
    if (!active.value) return undefined
    const i = index.value.get(key)
    return i === undefined ? undefined : i + 1
  }

  async function reveal(key: string) {
    const el = o.root.value
    const i = index.value.get(key)
    const cols = o.columns()
    if (!el || i === undefined || !active.value || always(cols[i]!)) return
    measure()
    const s = sizes.value
    if (!s || s.length !== cols.length) return
    let start = 0
    for (let j = 0; j < i; j++) start += s[j]!
    const end = start + s[i]!
    let left = 0
    let right = 0
    // the sticky columns cover part of the view
    cols.forEach((c, j) => {
      if (c.pinned === 'left') left += s[j]!
      else if (c.pinned === 'right') right += s[j]!
    })
    const now = Math.abs(el.scrollLeft)
    const width = el.clientWidth
    let next = now
    if (start < now + left) next = start - left
    else if (end > now + width - right) next = end - width + right
    if (next !== now) {
      const rtl = getComputedStyle(el).direction === 'rtl'
      el.scrollLeft = rtl ? -Math.max(0, next) : Math.max(0, next)
      read()
    }
    await nextTick()
  }

  return {
    active,
    rendered,
    at,
    place: (key, span = 1) => {
      const n = at(key)
      return n === undefined ? undefined : { gridColumn: span > 1 ? `${n} / span ${span}` : `${n}` }
    },
    shows: (i, n) => first.value < 0 || (i + n - 1 >= first.value && i <= last.value),
    reveal,
    template: (columns) => columns.map(track).join(' '),
  }
}
