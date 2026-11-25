import { computed, onScopeDispose, shallowRef, type Ref } from 'vue'
import { guardFormula, plainText, toDelimited } from '../core/csv'
import { getCellValue } from '../core/value'
import { copyText } from '../internal/clipboard'
import type { PasteCell } from './useEditing'
import type {
  CellRange,
  CellRef,
  CellRendererDefinition,
  CellsPasteEvent,
  ColumnDef,
  CopyEvent,
  FormatContext,
  RowKey,
} from '../types'

/** A visible data column, as the grid resolved it (its renderer and options). */
export interface RangeColumn<T> {
  key: string
  def: ColumnDef<T>
  definition?: {
    format?: (value: never, options: never, ctx: FormatContext, row: never) => string
  }
  options: Record<string, unknown>
}

export interface CellRangeOptions<T> {
  root: Ref<HTMLElement | undefined>
  /** The `range-selection` prop. */
  enabled: () => boolean
  /** `v-model:range`: null unless the range covers more than one cell. */
  model: Ref<CellRange | null>
  /** How the body nests (as virtual scrolling reads it), to list its rows as laid out. */
  levels: {
    /** The top level on screen (this page; group rows when grouped). */
    top: () => readonly T[]
    keyOf: () => (row: T) => RowKey
    open: () => ReadonlySet<RowKey>
    tree: () =>
      ((keyOf: (row: T) => RowKey) => { children(row: T): readonly T[] | undefined }) | null
    prepare: () => (rows: readonly T[]) => readonly T[]
    isGroup: () => ((row: T) => boolean) | undefined
  }
  /** The visible data columns, left to right. */
  columns: () => readonly RangeColumn<T>[]
  getKey: (row: T) => RowKey
  format: () => FormatContext
  onCopy: (event: CopyEvent<T>) => void
  /** Editing feature: writes pasted text into cells. Without it there's no pasting. */
  paste?: (cells: PasteCell<T>[]) => Promise<CellsPasteEvent<T>>
  /** Ctrl/⌘+V pastes (`parts.pasteShortcut`). */
  pasteKeys: () => boolean
}

const ROW = '[role="row"][data-row-key]'
const CELL = `${ROW} > .vg-cell[data-col-key]`
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="menu"], .vg-editor'

/**
 * Cell-range selection (spreadsheet-like): drag across cells, or Shift+click, to select a block;
 * Shift+arrows extend it from the keyboard, Ctrl/⌘+A selects every cell, Esc clears it, and
 * Ctrl/⌘+C copies it as tab-separated text (as the cells show it). The range is kept as two corner
 * cells (row key + column key), so it follows sorting, filtering and scrolling, and spans rows that
 * virtual scrolling hasn't rendered.
 */
export function useCellRange<T>(opts: CellRangeOptions<T>) {
  /** Where the range starts: the last cell clicked or focused (also with a one-cell "range"). */
  const anchor = shallowRef<CellRef | null>(null)
  let dragging = false
  /** Focus is going back to a cell after a paste: not a new range. */
  let refocusing = false

  /** The body's data rows as laid out, top to bottom: expanded children in, group rows out. */
  const ordered = computed<T[]>(() => {
    const l = opts.levels
    const key = l.keyOf()
    const open = l.open()
    const tree = l.tree()?.(key)
    const prepare = l.prepare()
    const isGroup = l.isGroup()
    const out: T[] = []
    const walk = (level: readonly T[]) => {
      for (const row of level) {
        if (!isGroup?.(row)) out.push(row)
        if (!tree || !open.has(key(row))) continue
        const kids = tree.children(row)
        if (kids?.length) walk(prepare(kids))
      }
    }
    walk(l.top())
    return out
  })

  /** Row positions by key, as text (DOM attributes are text). Read only while a range exists. */
  const rowIndex = computed(() => {
    const map = new Map<string, number>()
    ordered.value.forEach((row, i) => map.set(String(opts.getKey(row)), i))
    return map
  })
  const colIndex = computed(() => {
    const map = new Map<string, number>()
    opts.columns().forEach((col, i) => map.set(col.key, i))
    return map
  })

  /** The range's rows and columns, as positions; null without a range (or once it's gone). */
  const bounds = computed(() => {
    const range = opts.enabled() ? opts.model.value : null
    if (!range) return null
    const r = [range.start, range.end].map((c) => rowIndex.value.get(String(c.rowKey)))
    const c = [range.start, range.end].map((c) => colIndex.value.get(c.columnKey))
    if (r.some((i) => i === undefined) || c.some((i) => i === undefined)) return null
    const [r1, r2, c1, c2] = [...r, ...c] as number[]
    return {
      top: Math.min(r1!, r2!),
      bottom: Math.max(r1!, r2!),
      left: Math.min(c1!, c2!),
      right: Math.max(c1!, c2!),
    }
  })

  const same = (a: CellRef, b: CellRef) =>
    String(a.rowKey) === String(b.rowKey) && a.columnKey === b.columnKey

  /** Sets the range; one cell is no range (`null`), but stays the anchor. */
  function set(start: CellRef, end: CellRef) {
    anchor.value = start
    const next = same(start, end) ? null : { start, end }
    const prev = opts.model.value
    if (next === prev || (next && prev && same(next.start, prev.start) && same(next.end, prev.end)))
      return
    opts.model.value = next
  }

  function clear() {
    if (opts.model.value) opts.model.value = null
  }

  /** A body cell from the DOM: its row key (the row's own, not text) and column key. */
  function refOf(el: Element | null): CellRef | null {
    const cell = el?.closest<HTMLElement>(CELL)
    if (!cell || !opts.root.value?.contains(cell)) return null
    const key = cell.parentElement!.dataset.rowKey!
    const at = rowIndex.value.get(key)
    const columnKey = cell.dataset.colKey!
    if (at === undefined || !colIndex.value.has(columnKey)) return null
    return { rowKey: opts.getKey(ordered.value[at]!), columnKey }
  }

  const cellEl = (ref: CellRef) =>
    opts.root.value?.querySelector<HTMLElement>(
      `[data-row-key="${CSS.escape(String(ref.rowKey))}"] > .vg-cell[data-col-key="${CSS.escape(ref.columnKey)}"]`,
    )

  // ── Mouse ────────────────────────────────────────────────────────────────────────────────
  /** The pointer during a drag (viewport px), for scrolling at the edges. */
  const pointer = { x: 0, y: 0 }
  let frame = 0
  /** How close to an edge (px) the grid starts scrolling, and its fastest step per frame. */
  const EDGE = 28
  const MAX_STEP = 36

  function stopDrag() {
    dragging = false
    cancelAnimationFrame(frame)
    frame = 0
    opts.root.value?.classList.remove('vg-range-dragging')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDrag)
    window.removeEventListener('pointercancel', stopDrag)
  }

  function onPointerDown(event: PointerEvent) {
    // Touch drags scroll; a press on a control belongs to it.
    if (!opts.enabled() || event.button !== 0 || event.pointerType === 'touch') return
    if ((event.target as Element).closest(INTERACTIVE)) return
    const ref = refOf(event.target as Element)
    if (!ref) return
    if (event.shiftKey && anchor.value) {
      // Shift+click: from the anchor to here. No focus move (it would restart the range) and no
      // text selection.
      event.preventDefault()
      set(anchor.value, ref)
      return
    }
    set(ref, ref)
    dragging = true
    // on the window: the drag goes on when the pointer leaves the grid (it then scrolls)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stopDrag)
    window.addEventListener('pointercancel', stopDrag)
  }

  function extendTo(ref: CellRef | null) {
    if (!ref || !anchor.value) return
    if (!same(ref, anchor.value)) {
      // Past the first cell it's a range, not a text selection.
      opts.root.value?.classList.add('vg-range-dragging')
      globalThis.getSelection?.()?.removeAllRanges()
    }
    set(anchor.value, ref)
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || !anchor.value) return
    if (!(event.buttons & 1)) return stopDrag()
    pointer.x = event.clientX
    pointer.y = event.clientY
    extendTo(refOf(event.target as Element))
    if (!frame) frame = requestAnimationFrame(autoScroll)
  }

  /** Near or past an edge of the rows, the grid scrolls, and the range follows the pointer. */
  function autoScroll() {
    frame = 0
    const el = opts.root.value
    if (!dragging || !el) return
    const box = el.getBoundingClientRect()
    // the rows' area: below the sticky header
    const top = Math.max(
      box.top,
      el.querySelector('.vg-header')?.getBoundingClientRect().bottom ?? 0,
    )
    const step = (over: number) =>
      Math.sign(over) * Math.min(MAX_STEP, Math.ceil(Math.abs(over) / 2))
    const dy =
      pointer.y < top + EDGE
        ? step(pointer.y - top - EDGE)
        : pointer.y > box.bottom - EDGE
          ? step(pointer.y - box.bottom + EDGE)
          : 0
    const dx =
      pointer.x < box.left + EDGE
        ? step(pointer.x - box.left - EDGE)
        : pointer.x > box.right - EDGE
          ? step(pointer.x - box.right + EDGE)
          : 0
    if (!dx && !dy) return
    const before = [el.scrollLeft, el.scrollTop]
    el.scrollBy(dx, dy)
    if (el.scrollLeft === before[0] && el.scrollTop === before[1]) return // at the end
    // the cell under the pointer, kept inside the rows
    const x = Math.min(Math.max(pointer.x, box.left + 2), box.right - 2)
    const y = Math.min(Math.max(pointer.y, top + 2), box.bottom - 2)
    // after the scroll has rendered (virtual scrolling draws the new rows first)
    frame = requestAnimationFrame(() => {
      frame = 0
      if (!dragging) return
      extendTo(refOf(document.elementFromPoint(x, y)))
      frame = requestAnimationFrame(autoScroll)
    })
  }

  onScopeDispose(stopDrag)

  // ── Keyboard ─────────────────────────────────────────────────────────────────────────────
  /** A body cell taking focus (click, arrow keys) starts a new range there. */
  function onFocusIn(event: FocusEvent) {
    if (!opts.enabled() || refocusing) return
    const target = event.target as Element
    if (!target.matches(CELL)) return
    const ref = refOf(target)
    if (ref) set(ref, ref)
  }

  const MOVES: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }

  /** Handles the range keys; true when it did (the grid then skips its other key handling). */
  function onKeyDown(event: KeyboardEvent): boolean {
    if (!opts.enabled()) return false
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return false
    const ctrl = event.ctrlKey || event.metaKey
    const key = event.key

    if (key === 'Escape' && opts.model.value) {
      clear()
      event.preventDefault()
      return true
    }
    if (ctrl && !event.altKey && !event.shiftKey && key.toLowerCase() === 'c') {
      // A text selection wins; without a range, rows / the focused cell are copied (export).
      const selection = globalThis.getSelection?.()
      if (!opts.model.value || (selection && !selection.isCollapsed && selection.toString()))
        return false
      event.preventDefault()
      void copyRange()
      return true
    }
    if (ctrl && !event.altKey && !event.shiftKey && key.toLowerCase() === 'v') {
      if (!opts.paste || !opts.pasteKeys() || !start()) return false
      catchPaste() // the browser's own paste lands in a hidden text area, which reads it
      return true
    }
    if (ctrl && !event.altKey && !event.shiftKey && key.toLowerCase() === 'a') {
      if (target.closest('.vg-header')) return false
      if (!selectAll()) return false
      event.preventDefault()
      return true
    }
    const move = MOVES[key]
    if (move && event.shiftKey && !ctrl && !event.altKey) {
      const start = anchor.value ?? refOf(target)
      if (!start) return false
      const end = opts.model.value?.end ?? start
      const rows = ordered.value
      const cols = opts.columns()
      const r = rowIndex.value.get(String(end.rowKey))
      const c = colIndex.value.get(end.columnKey)
      if (r === undefined || c === undefined) return false
      // right-to-left: ← goes to the next column
      const rtl = opts.root.value && getComputedStyle(opts.root.value).direction === 'rtl'
      const nr = Math.max(0, Math.min(rows.length - 1, r + move[0]))
      const nc = Math.max(0, Math.min(cols.length - 1, c + move[1] * (rtl ? -1 : 1)))
      const next = { rowKey: opts.getKey(rows[nr]!), columnKey: cols[nc]!.key }
      set(start, next)
      cellEl(next)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      event.preventDefault()
      return true
    }
    return false
  }

  // ── Reading and copying ──────────────────────────────────────────────────────────────────
  /** The range's rows and columns (null without a range). */
  const cells = computed(() => {
    const b = bounds.value
    if (!b) return null
    return {
      rows: ordered.value.slice(b.top, b.bottom + 1),
      columns: opts.columns().slice(b.left, b.right + 1),
    }
  })

  /** The range's values, row by row (raw). */
  function values(): unknown[][] {
    const c = cells.value
    if (!c) return []
    return c.rows.map((row) => c.columns.map((col) => getCellValue(row, col.def)))
  }

  /** The range as tab-separated text, as the cells show it (`exportValue` wins). */
  function text(): string {
    const c = cells.value
    if (!c) return ''
    const ctx = opts.format()
    const lines = c.rows.map((row) =>
      c.columns.map((col) => {
        if (col.def.exportValue) return guardFormula(plainText(col.def.exportValue(row)))
        const value = getCellValue(row, col.def)
        const format = col.definition?.format as
          ((v: unknown, o: unknown, ctx: FormatContext, row: unknown) => string) | undefined
        return guardFormula(plainText(format ? format(value, col.options, ctx, row) : value))
      }),
    )
    return toDelimited(lines, '\t', '\n')
  }

  /** Copies the range (Ctrl/⌘+C). Resolves `false` when there's none or the copy failed. */
  async function copyRange(): Promise<boolean> {
    const c = cells.value
    if (!c) return false
    const copied = text()
    if (!(await copyText(copied))) return false
    opts.onCopy({ kind: 'range', text: copied, rows: c.rows, columns: c.columns.map((x) => x.def) })
    return true
  }

  // ── Pasting ──────────────────────────────────────────────────────────────────────────────
  /** Where a paste starts: the range's top-left cell, else the anchor (row and column positions). */
  function start(): { row: number; col: number } | null {
    const b = bounds.value
    if (b) return { row: b.top, col: b.left }
    const a = anchor.value
    const row = a && rowIndex.value.get(String(a.rowKey))
    const col = a && colIndex.value.get(a.columnKey)
    return row == null || col == null ? null : { row, col }
  }

  /**
   * Pastes tab-separated text from the start cell: the block as it is (clipped at the grid's
   * edges), or repeated over the selected range when that's a whole number of blocks. The pasted
   * area becomes the range. Null when there's nowhere to paste or nothing in the text.
   */
  async function pasteText(text: string): Promise<CellsPasteEvent<T> | null> {
    // where it goes, read before anything else can move the range
    const from = start()
    const b = bounds.value
    const rows = ordered.value
    const cols = opts.columns()
    if (!opts.paste || !from) return null
    // the reading of pasted text loads on the first paste (own chunk)
    const { parseClipboard, pasteArea } = await import('../core/paste')
    const block = parseClipboard(text)
    if (!block.length) return null
    const width = Math.max(...block.map((r) => r.length))
    const area = pasteArea(
      { rows: block.length, cols: width },
      b && { rows: b.bottom - b.top + 1, cols: b.right - b.left + 1 },
    )
    const lastRow = Math.min(rows.length - 1, from.row + area.rows - 1)
    const lastCol = Math.min(cols.length - 1, from.col + area.cols - 1)
    const cells: PasteCell<T>[] = []
    for (let r = from.row; r <= lastRow; r++) {
      const line = block[(r - from.row) % block.length]!
      for (let c = from.col; c <= lastCol; c++) {
        const cellText = line[(c - from.col) % width]
        if (cellText === undefined) continue // a short line: those cells stay as they are
        const row = rows[r]!
        const col = cols[c]!
        cells.push({
          row,
          rowKey: opts.getKey(row),
          column: col.def,
          definition: col.definition as CellRendererDefinition | undefined,
          text: cellText,
        })
      }
    }
    const corner = (r: number, c: number) => ({
      rowKey: opts.getKey(rows[r]!),
      columnKey: cols[c]!.key,
    })
    set(corner(from.row, from.col), corner(lastRow, lastCol))
    return opts.paste(cells)
  }

  /**
   * Ctrl/⌘+V: a hidden text area takes focus for this one keystroke, so the browser pastes into it
   * (cells aren't editable, and reading the clipboard from script needs a permission). Its `paste`
   * event hands over the text, and focus goes back.
   */
  function catchPaste() {
    const back = document.activeElement as HTMLElement | null
    const area = document.createElement('textarea')
    area.setAttribute('aria-hidden', 'true')
    area.tabIndex = -1
    area.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      area.remove()
      // focus coming back to its cell isn't a click on it: the range stays
      refocusing = true
      back?.focus({ preventScroll: true })
      refocusing = false
    }
    area.addEventListener('paste', (event) => {
      event.preventDefault()
      // pasted (and the range set to the pasted area) before focus goes back
      void pasteText(event.clipboardData?.getData('text/plain') ?? '')
      finish()
    })
    // a paste the browser didn't allow never fires: tidy up anyway
    const timer = setTimeout(finish, 1000)
    document.body.append(area)
    area.focus({ preventScroll: true })
  }

  /** Every cell in the body. False when there are none. */
  function selectAll(): boolean {
    const rows = ordered.value
    const cols = opts.columns()
    if (!rows.length || !cols.length) return false
    const first = { rowKey: opts.getKey(rows[0]!), columnKey: cols[0]!.key }
    const last = {
      rowKey: opts.getKey(rows[rows.length - 1]!),
      columnKey: cols[cols.length - 1]!.key,
    }
    set(first, last)
    return true
  }

  // ── Cells ────────────────────────────────────────────────────────────────────────────────
  /** A cell's classes while it is in the range: in it, and on which of its edges (null outside). */
  function forCell(cell: () => { rowKey: RowKey; columnKey: string; data: boolean }) {
    return computed<string[] | null>(() => {
      const b = bounds.value
      if (!b) return null
      const c = cell()
      if (!c.data) return null
      const r = rowIndex.value.get(String(c.rowKey))
      const col = colIndex.value.get(c.columnKey)
      if (r === undefined || col === undefined) return null
      if (r < b.top || r > b.bottom || col < b.left || col > b.right) return null
      const classes = ['vg-in-range']
      if (r === b.top) classes.push('vg-range-top')
      if (r === b.bottom) classes.push('vg-range-bottom')
      if (col === b.left) classes.push('vg-range-left')
      if (col === b.right) classes.push('vg-range-right')
      return classes
    })
  }

  return {
    bounds,
    cells,
    forCell,
    onPointerDown,
    onFocusIn,
    onKeyDown,
    values,
    text,
    copyRange,
    pasteText,
    selectAll,
    clear,
    /** Selects the block around these cells (after an undo: the cells it changed). */
    selectCells(refs: readonly CellRef[]) {
      const at = refs
        .map((r) => [rowIndex.value.get(String(r.rowKey)), colIndex.value.get(r.columnKey)])
        .filter((p): p is [number, number] => p[0] !== undefined && p[1] !== undefined)
      if (!at.length) return
      const rs = at.map((p) => p[0])
      const cs = at.map((p) => p[1])
      const rows = ordered.value
      const cols = opts.columns()
      const corner = (r: number, c: number) => ({
        rowKey: opts.getKey(rows[r]!),
        columnKey: cols[c]!.key,
      })
      set(corner(Math.min(...rs), Math.min(...cs)), corner(Math.max(...rs), Math.max(...cs)))
    },
    /** Sets the range from code (`null` clears it). */
    select(range: CellRange | null) {
      if (range) set(range.start, range.end)
      else clear()
    },
    stopDrag,
  }
}

/** The cell-range state the grid shares with its cells. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CellRangeState = ReturnType<typeof useCellRange<any>>
