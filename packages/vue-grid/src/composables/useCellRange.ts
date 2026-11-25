import { computed, nextTick, onScopeDispose, shallowRef, watch, type Ref } from 'vue'
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
  /** Editing feature: writes filled values into cells. Without it there's no fill handle. */
  fill?: (cells: PasteCell<T>[]) => Promise<CellsPasteEvent<T>>
  /** The fill handle and Ctrl/⌘+D are on (`parts.fillHandle`). */
  fillOn: () => boolean
  /** Editing feature: writes replaced text into cells. Without it, find only finds. */
  replace?: (cells: PasteCell<T>[]) => Promise<CellsPasteEvent<T>>
  /** Editing feature: empties cells (Delete / Backspace, Ctrl/⌘+X). Without it, no clearing. */
  clear?: (cells: PasteCell<T>[], source: 'clear' | 'cut') => Promise<CellsPasteEvent<T>>
  /** Delete / Backspace and Ctrl/⌘+X are on (`parts.clearShortcut`). */
  clearKeys: () => boolean
  /** Ctrl/⌘+F, Ctrl/⌘+H open the find bar (`parts.findShortcut`). */
  findKeys: () => boolean
  /** Brings a row into view (virtual scrolling renders it first). */
  scrollToRow: (key: RowKey) => void
  /** Loads the find bar's chunk. */
  preloadFind?: () => Promise<unknown>
}

/** A block of cells by position: first and last row, first and last column. */
interface Box {
  top: number
  bottom: number
  left: number
  right: number
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
  /** A fill-handle drag: the cells it fills from, and the area it covers so far. */
  const filling = shallowRef<{ source: Box; area: Box } | null>(null)

  // Find and replace: the bar's state; the bar (own chunk) does the searching.
  const findOpen = shallowRef(false)
  /** The replace row shows. */
  const findReplace = shallowRef(false)
  /** The range when find opened with one ("In selection"); null: every cell. */
  const findScope = shallowRef<Box | null>(null)
  /** Text to search for when it opens (`openFind({ text })`). */
  const findText = shallowRef('')
  /**
   * The bar's search box has focus. Until then (it loads on demand, then takes focus), keys
   * typed in the grid go into `findText` instead of reaching the cells.
   */
  const findMounted = shallowRef(false)
  /** Bumped to send focus back into the bar's search box (Ctrl/⌘+F again). */
  const findFocus = shallowRef(0)
  /** The matching cells, and the current one, as `cellId`s. */
  const findHits = shallowRef<ReadonlySet<string>>(new Set())
  const findCurrent = shallowRef<string | null>(null)
  /** A cell's id for find: its row key and column key. */
  const cellId = (rowKey: RowKey, columnKey: string) => `${String(rowKey)}\u0000${columnKey}`

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

  /** What's selected: the range, else the anchor cell alone. */
  const selection = computed<Box | null>(() => {
    if (bounds.value) return bounds.value
    const a = opts.enabled() ? anchor.value : null
    const r = a && rowIndex.value.get(String(a.rowKey))
    const c = a && colIndex.value.get(a.columnKey)
    return r == null || c == null ? null : { top: r, bottom: r, left: c, right: c }
  })
  const canFill = () => !!opts.fill && opts.fillOn()

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
  /** The fill handle's grab area (px) in the corner cell's corner. */
  const HANDLE = 10

  /** Ends a drag; a fill drag ends without filling (`pointerup` fills: `onPointerUp`). */
  function stopDrag() {
    dragging = false
    cancelAnimationFrame(frame)
    frame = 0
    opts.root.value?.classList.remove('vg-range-dragging', 'vg-range-filling')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', stopDrag)
    const f = filling.value
    filling.value = null
    return f
  }

  function onPointerUp() {
    const f = stopDrag()
    if (f) void fillArea(f.source, f.area)
  }

  function listen() {
    dragging = true
    // on the window: the drag goes on when the pointer leaves the grid (it then scrolls)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', stopDrag)
  }

  /** The press is on the fill handle: the bottom-right corner (bottom-left, right to left) of the corner cell. */
  function onHandle(event: PointerEvent): boolean {
    if (!canFill() || filling.value) return false
    const cell = (event.target as Element).closest<HTMLElement>('.vg-range-corner')
    if (!cell) return false
    const box = cell.getBoundingClientRect()
    const rtl = getComputedStyle(cell).direction === 'rtl'
    const x = rtl ? event.clientX - box.left : box.right - event.clientX
    return (
      x >= 0 &&
      x <= HANDLE &&
      box.bottom - event.clientY >= 0 &&
      box.bottom - event.clientY <= HANDLE
    )
  }

  function onPointerDown(event: PointerEvent) {
    // Touch drags scroll; a press on a control belongs to it.
    if (!opts.enabled() || event.button !== 0 || event.pointerType === 'touch') return
    if ((event.target as Element).closest(INTERACTIVE)) return
    if (onHandle(event) && selection.value) {
      // the fill handle: no focus move, no text selection; the drag shows what it will fill
      event.preventDefault()
      filling.value = { source: selection.value, area: selection.value }
      opts.root.value?.classList.add('vg-range-filling')
      listen()
      return
    }
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
    listen()
  }

  function extendTo(ref: CellRef | null) {
    if (filling.value) return fillTo(ref)
    if (!ref || !anchor.value) return
    if (!same(ref, anchor.value)) {
      // Past the first cell it's a range, not a text selection.
      opts.root.value?.classList.add('vg-range-dragging')
      globalThis.getSelection?.()?.removeAllRanges()
    }
    set(anchor.value, ref)
  }

  /**
   * A fill drag reaching a cell: the fill area runs from the source to its row (up or down) or
   * its column (left or right), whichever it went further past.
   */
  function fillTo(ref: CellRef | null) {
    const f = filling.value
    const r = ref && rowIndex.value.get(String(ref.rowKey))
    const c = ref && colIndex.value.get(ref.columnKey)
    if (!f || r == null || c == null) return
    const s = f.source
    const dr = r > s.bottom ? r - s.bottom : r < s.top ? s.top - r : 0
    const dc = c > s.right ? c - s.right : c < s.left ? s.left - c : 0
    const area =
      dr && dr >= dc
        ? { ...s, top: Math.min(s.top, r), bottom: Math.max(s.bottom, r) }
        : dc
          ? { ...s, left: Math.min(s.left, c), right: Math.max(s.right, c) }
          : s
    const a = f.area
    if (
      a.top !== area.top ||
      a.bottom !== area.bottom ||
      a.left !== area.left ||
      a.right !== area.right
    )
      filling.value = { source: s, area }
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || (!anchor.value && !filling.value)) return
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

  // The find bar's chunk loads while the browser is idle, once range selection is on, so the
  // first keys typed after Ctrl/⌘+F (or a Find button) aren't lost while it loads.
  if (typeof window !== 'undefined' && opts.preloadFind) {
    const stop = watch(
      opts.enabled,
      (on) => {
        if (!on) return
        const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 200))
        idle(() => void opts.preloadFind!().catch(() => {}))
        queueMicrotask(() => stop())
      },
      { immediate: true },
    )
  }

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

  /**
   * While the find bar is opening (its chunk loads, then it takes focus), what's typed is the
   * search, wherever focus still is: a cell (where the first letter would start an edit) or the
   * button that opened it. Listens on the document, in the capture phase, until the bar's box
   * has focus.
   */
  function bufferKey(event: KeyboardEvent) {
    if (!findOpen.value || findMounted.value) return stopBuffer()
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
    findText.value += event.key
    event.preventDefault()
    event.stopPropagation()
  }
  const stopBuffer = () => document.removeEventListener('keydown', bufferKey, true)
  watch(findMounted, (ready) => ready && stopBuffer())
  onScopeDispose(stopBuffer)

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
    if (
      (key === 'Delete' || key === 'Backspace') &&
      !ctrl &&
      !event.altKey &&
      !event.shiftKey &&
      opts.clear &&
      opts.clearKeys() &&
      selection.value
    ) {
      event.preventDefault()
      void clearRange()
      return true
    }
    if (ctrl && !event.altKey && !event.shiftKey && key.toLowerCase() === 'x') {
      if (!opts.clear || !opts.clearKeys() || !selection.value) return false
      const text = globalThis.getSelection?.()
      if (text && !text.isCollapsed && text.toString()) return false // selected text: the browser's
      event.preventDefault()
      void cutRange()
      return true
    }
    if (ctrl && !event.altKey && !event.shiftKey && key.toLowerCase() === 'v') {
      if (!opts.paste || !opts.pasteKeys() || !start()) return false
      catchPaste() // the browser's own paste lands in a hidden text area, which reads it
      return true
    }
    if (
      ctrl &&
      !event.altKey &&
      !event.shiftKey &&
      (key.toLowerCase() === 'f' || key.toLowerCase() === 'h')
    ) {
      if (!opts.findKeys()) return false
      event.preventDefault() // the grid's find, not the browser's (only with focus in the grid)
      openFind({ replace: key.toLowerCase() === 'h' })
      return true
    }
    if (ctrl && !event.altKey && !event.shiftKey && key.toLowerCase() === 'd') {
      // fill down: the range's top row into the rows below it
      const b = bounds.value
      if (!canFill() || !b || b.bottom === b.top) return false
      event.preventDefault()
      void fillArea({ ...b, bottom: b.top }, b)
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
  /** A block's rows and columns. */
  const cellsOf = (b: Box) => ({
    rows: ordered.value.slice(b.top, b.bottom + 1),
    columns: opts.columns().slice(b.left, b.right + 1),
  })
  const cells = computed(() => (bounds.value ? cellsOf(bounds.value) : null))

  /** The range's values, row by row (raw). */
  function values(): unknown[][] {
    const c = cells.value
    if (!c) return []
    return c.rows.map((row) => c.columns.map((col) => getCellValue(row, col.def)))
  }

  /** A cell's text as it shows (`exportValue` wins): what's copied and what find searches. */
  function cellText(row: T, col: RangeColumn<T>, ctx = opts.format()): string {
    if (col.def.exportValue) return plainText(col.def.exportValue(row))
    const value = getCellValue(row, col.def)
    const format = col.definition?.format as
      ((v: unknown, o: unknown, ctx: FormatContext, row: unknown) => string) | undefined
    return plainText(format ? format(value, col.options, ctx, row) : value)
  }

  /** The range as tab-separated text, as the cells show it (`exportValue` wins). */
  function text(b: Box | null = bounds.value): string {
    const c = b && cellsOf(b)
    if (!c) return ''
    const ctx = opts.format()
    const lines = c.rows.map((row) => c.columns.map((col) => guardFormula(cellText(row, col, ctx))))
    return toDelimited(lines, '\t', '\n')
  }

  /** Copies the range (Ctrl/⌘+C). Resolves `false` when there's none or the copy failed. */
  async function copyRange(b: Box | null = bounds.value): Promise<boolean> {
    if (!b) return false
    const c = cellsOf(b)
    const copied = text(b)
    // Where the Clipboard API is refused (plain http, no permission) the copy goes through a
    // hidden text area that takes focus for a moment: focus coming back to the cell isn't a
    // click on it, so the range stays.
    refocusing = true
    let ok: boolean
    try {
      ok = await copyText(copied)
    } finally {
      refocusing = false
    }
    if (!ok) return false
    opts.onCopy({ kind: 'range', text: copied, rows: c.rows, columns: c.columns.map((x) => x.def) })
    return true
  }

  // ── Clearing and cutting ─────────────────────────────────────────────────────────────────
  /**
   * Empties the selected cells (the range, else the selected cell): each column's empty value,
   * through the same checks as a paste (read-only cells and a `validate` that wants a value
   * leave a cell as it is). Null with nothing selected.
   */
  function clearRange(
    source: 'clear' | 'cut' = 'clear',
    b: Box | null = selection.value,
  ): Promise<CellsPasteEvent<T> | null> {
    if (!b || !opts.clear) return Promise.resolve(null)
    const c = cellsOf(b)
    const cells: PasteCell<T>[] = []
    for (const row of c.rows)
      for (const col of c.columns)
        cells.push({
          row,
          rowKey: opts.getKey(row),
          column: col.def,
          definition: col.definition as CellRendererDefinition | undefined,
          value: '', // read per column: '' text, no number / date / choice, false
        })
    return opts.clear(cells, source)
  }

  /** Copies the selected cells (as Ctrl/⌘+C would), then clears them. Null when nothing was copied. */
  async function cutRange(): Promise<CellsPasteEvent<T> | null> {
    const b = selection.value
    if (!b || !opts.clear || !(await copyRange(b))) return null
    return clearRange('cut', b) // the block it copied
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

  // ── Filling ──────────────────────────────────────────────────────────────────────────────
  /**
   * Fills `area` from `source` (inside it, at one end): each column (filling up or down) or row
   * (left or right) goes on from its source cells, a series where they make one, else repeating
   * them. The whole area becomes the range. Null when there's nothing to fill.
   */
  async function fillArea(source: Box, area: Box): Promise<CellsPasteEvent<T> | null> {
    const vertical = area.top !== source.top || area.bottom !== source.bottom
    const horizontal = area.left !== source.left || area.right !== source.right
    if (!opts.fill || (!vertical && !horizontal)) return null
    const rows = ordered.value
    const cols = opts.columns()
    const { fillSeries } = await import('../core/paste') // with the paste code (own chunk)
    const cells: PasteCell<T>[] = []
    const add = (r: number, c: number, value: unknown) => {
      const row = rows[r]!
      const col = cols[c]!
      cells.push({
        row,
        rowKey: opts.getKey(row),
        column: col.def,
        definition: col.definition as CellRendererDefinition | undefined,
        value,
      })
    }
    const at = (r: number, c: number) => getCellValue(rows[r]!, cols[c]!.def)
    const span = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => from + i)
    // each line (a column when filling up / down, a row when filling sideways) on its own
    const lines = vertical ? span(source.left, source.right) : span(source.top, source.bottom)
    for (const line of lines) {
      const cell = (i: number) => (vertical ? at(i, line) : at(line, i))
      const put = (i: number, v: unknown) => (vertical ? add(i, line, v) : add(line, i, v))
      const [lo, hi, aLo, aHi] = vertical
        ? [source.top, source.bottom, area.top, area.bottom]
        : [source.left, source.right, area.left, area.right]
      const src = span(lo, hi).map(cell)
      if (aHi > hi) fillSeries(src, aHi - hi).forEach((v, i) => put(hi + 1 + i, v))
      if (aLo < lo)
        // upwards / leftwards: the series runs backwards from the source's first cell
        fillSeries([...src].reverse(), lo - aLo).forEach((v, i) => put(lo - 1 - i, v))
    }
    const corner = (r: number, c: number) => ({
      rowKey: opts.getKey(rows[r]!),
      columnKey: cols[c]!.key,
    })
    set(corner(area.top, area.left), corner(area.bottom, area.right))
    return opts.fill(cells)
  }

  // ── Find and replace ─────────────────────────────────────────────────────────────────────
  /** Opens the find bar: in the selected range if there is one, else every cell. */
  function openFind(o: { replace?: boolean; text?: string } = {}) {
    if (!opts.enabled()) return
    if (!findOpen.value) findScope.value = bounds.value
    if (o.text !== undefined) findText.value = o.text
    if (o.replace && opts.replace) findReplace.value = true
    findOpen.value = true
    if (!findMounted.value) document.addEventListener('keydown', bufferKey, true)
    findFocus.value++
  }

  /** Closes the bar; the current match becomes the selected cell, with focus. */
  function closeFind() {
    if (!findOpen.value) return
    findOpen.value = false
    findReplace.value = false
    findText.value = ''
    stopBuffer()
    findHits.value = new Set()
    const id = findCurrent.value
    findCurrent.value = null
    const [rowKey, columnKey] = id ? id.split('\u0000') : []
    const r = rowKey !== undefined ? rowIndex.value.get(rowKey) : undefined
    if (r !== undefined && columnKey !== undefined) {
      const ref = { rowKey: opts.getKey(ordered.value[r]!), columnKey }
      set(ref, ref)
      refocusing = true
      ;(cellEl(ref) ?? opts.root.value)?.focus({ preventScroll: true })
      refocusing = false
    } else opts.root.value?.focus({ preventScroll: true })
  }

  /** What find searches: the rows and columns of its scope (or of every cell). */
  function findArea(inSelection: boolean) {
    const b = inSelection ? findScope.value : null
    const rows = ordered.value
    const cols = opts.columns()
    return b
      ? { rows: rows.slice(b.top, b.bottom + 1), columns: cols.slice(b.left, b.right + 1) }
      : { rows, columns: cols }
  }

  /** Marks a match as the current one and brings it into view. */
  async function showMatch(row: T, col: RangeColumn<T>) {
    const rowKey = opts.getKey(row)
    findCurrent.value = cellId(rowKey, col.key)
    opts.scrollToRow(rowKey)
    await nextTick()
    cellEl({ rowKey, columnKey: col.key })?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
    })
  }

  /** Writes replaced text into cells (like a paste: read as each column's kind). */
  function replaceIn(cells: { row: T; column: RangeColumn<T>; text: string }[]) {
    if (!opts.replace) return Promise.resolve(null)
    return opts.replace(
      cells.map(({ row, column, text }) => ({
        row,
        rowKey: opts.getKey(row),
        column: column.def,
        definition: column.definition as CellRendererDefinition | undefined,
        text,
      })),
    )
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
      const sel = selection.value
      const f = filling.value
      const hits = findHits.value
      if (!sel && !f && !hits.size) return null
      const c = cell()
      if (!c.data) return null
      const r = rowIndex.value.get(String(c.rowKey))
      const col = colIndex.value.get(c.columnKey)
      if (r === undefined || col === undefined) return null
      const inside = (x: Box) => r >= x.top && r <= x.bottom && col >= x.left && col <= x.right
      const classes: string[] = []
      const b = bounds.value
      if (b && inside(b)) {
        classes.push('vg-in-range')
        if (r === b.top) classes.push('vg-range-top')
        if (r === b.bottom) classes.push('vg-range-bottom')
        if (col === b.left) classes.push('vg-range-left')
        if (col === b.right) classes.push('vg-range-right')
      }
      // while dragging the handle: the cells it will fill
      if (f && inside(f.area) && !inside(f.source)) classes.push('vg-fill-preview')
      // the handle sits on the selection's last cell
      else if (!f && sel && canFill() && r === sel.bottom && col === sel.right)
        classes.push('vg-range-corner')
      if (hits.size) {
        const id = cellId(c.rowKey, c.columnKey)
        if (hits.has(id)) classes.push('vg-find-match')
        if (findCurrent.value === id) classes.push('vg-find-current')
      }
      return classes.length ? classes : null
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
    copyRange: () => copyRange(),
    clearRange: () => clearRange(),
    cutRange,
    pasteText,
    /** Fills the range down from its top row (Ctrl/⌘+D). Null without a range of 2+ rows. */
    fillDown() {
      const b = bounds.value
      return b && b.bottom > b.top ? fillArea({ ...b, bottom: b.top }, b) : Promise.resolve(null)
    },
    selectAll,
    clear,
    /** Find and replace: the bar's state and what it works with. */
    find: {
      open: findOpen,
      mounted: findMounted,
      replace: findReplace,
      scope: findScope,
      text: findText,
      focus: findFocus,
      hits: findHits,
      current: findCurrent,
      canReplace: () => !!opts.replace,
      cellId,
      rowKey: opts.getKey,
      cellText,
      area: findArea,
      show: showMatch,
      write: replaceIn,
      close: closeFind,
    },
    openFind,
    closeFind,
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
