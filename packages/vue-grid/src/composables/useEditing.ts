import { computed, nextTick, shallowRef, watch, type Ref } from 'vue'
import { getCellValue } from '../core/value'
import type {
  CellEditEvent,
  CellsPasteEvent,
  PasteSkip,
  CellRendererDefinition,
  ColumnDef,
  EditorName,
  EditorOption,
  GridMessages,
  RowKey,
} from '../types'

/** What the open editor edits. */
export interface EditState<T = unknown> {
  row: T
  rowKey: RowKey
  column: ColumnDef<T>
  definition: CellRendererDefinition | undefined
  /** Started by typing: this text replaces the value. */
  initial?: string
  /** Enter / Tab pressed while the editor was still opening: done once it opens. */
  queued?: EditMove
  /** A value that failed validation or saving, shown again in the editor. */
  draft?: { value: unknown }
  error?: string
  saving: boolean
}

export interface EditingOptions<T> {
  root: Ref<HTMLElement | undefined>
  messages: () => GridMessages
  emit: (event: CellEditEvent<T>) => void
  /** `save-cell`: may return a Promise; a rejection keeps the editor open with its message. */
  save: () => ((event: CellEditEvent<T>) => unknown) | undefined
  /** The rows a select's default choices come from (their distinct values). */
  rows: () => readonly T[]
  columns: () => readonly ColumnDef<T>[]
  /** Loads the editor's chunk. */
  preload: () => Promise<unknown>
  /** The format locale: how pasted numbers and dates are read. */
  locale: () => string
  /** How many changes undo remembers (`undo-limit`); 0: none. */
  historyLimit: () => number
  /** Ctrl/⌘+Z, Ctrl+Y / Ctrl/⌘+Shift+Z undo and redo (`parts.undoShortcut`). */
  undoKeys: () => boolean
  /** Known child rows of a row (sub-grids), to find a row by key for undo. */
  children: (row: T) => readonly T[] | undefined
  getKey: (row: T) => RowKey
  /** After an undo / redo: the cells it changed (to select or show them). */
  onTravel?: (cells: { rowKey: RowKey; columnKey: string }[]) => void
}

/** One change to a cell, as undo remembers it: its value before (`from`) and after (`to`). */
interface HistoryChange<T> {
  row: T
  rowKey: RowKey
  column: ColumnDef<T>
  from: unknown
  to: unknown
}

/** A cell to paste into: its row and column, and the pasted text for it. */
export interface PasteCell<T> {
  row: T
  rowKey: RowKey
  column: ColumnDef<T>
  definition: CellRendererDefinition | undefined
  /** Pasted text, read as the column's kind of value. */
  text?: string
  /** A filled value (fill handle), kept when it fits the column. */
  value?: unknown
}

/** What a cell tells the editing feature about itself. */
export interface EditCell<T> {
  row: T
  rowKey: RowKey
  pinned?: boolean
  column: {
    kind: string
    key: string
    def: ColumnDef<T>
    definition: CellRendererDefinition | undefined
  }
}

/** Where focus goes after a commit: the next / previous editable cell, or back to this cell. */
export type EditMove = -1 | 0 | 1

/** The editor a column gets: its own, else one that fits its renderer. */
export function editorOf(
  column: ColumnDef,
  definition: CellRendererDefinition | undefined,
): EditorName | 'custom' {
  if (column.editor) return typeof column.editor === 'string' ? column.editor : 'custom'
  if (definition?.name === 'datetime') return 'datetime'
  switch (definition?.filterType) {
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'boolean':
      return 'checkbox'
    case 'set':
      return 'select'
    default:
      return 'text'
  }
}

const cellSelector = (rowKey: RowKey, key: string) =>
  `[data-row-key="${CSS.escape(String(rowKey))}"] > .vg-cell[data-col-key="${CSS.escape(key)}"]`

/**
 * Inline cell editing (editing feature): one editor at a time. Opens on double-click, Enter / F2
 * or typing on a focused cell; Enter commits, Tab commits and edits the next editable cell, Esc
 * cancels. A commit validates, emits `cell-edit` and awaits `save-cell`; the grid never writes the
 * value itself.
 */
export function useEditing<T>(opts: EditingOptions<T>) {
  const state = shallowRef<EditState<T> | null>(null)
  /** Tab is moving the editor on: a checkbox cell takes focus instead of flipping. */
  let moving = false

  const canEdit = (row: T, column: ColumnDef<T>) =>
    typeof column.editable === 'function' ? !!column.editable(row) : !!column.editable

  const isEditing = (rowKey: RowKey, key: string) =>
    state.value?.rowKey === rowKey && state.value.column.key === key

  const cellEl = (rowKey: RowKey, key: string) =>
    opts.root.value?.querySelector<HTMLElement>(cellSelector(rowKey, key)) ?? null

  function focusCell(rowKey: RowKey, key: string) {
    const el = cellEl(rowKey, key)
    if (el?.tabIndex === -1 || el?.hasAttribute('tabindex')) el.focus({ preventScroll: true })
  }

  /** Opens a cell's editor; a checkbox flips at once instead. */
  function start(
    row: T,
    rowKey: RowKey,
    column: ColumnDef<T>,
    definition: CellRendererDefinition | undefined,
    initial?: string,
  ): boolean {
    if (!canEdit(row, column) || state.value?.saving) return false
    if (state.value && !isEditing(rowKey, column.key)) state.value = null
    if (editorOf(column, definition) === 'checkbox') {
      if (initial !== undefined) return false
      if (moving) {
        focusCell(rowKey, column.key)
        return true
      }
      void save(row, rowKey, column, !getCellValue(row, column), 0, definition, true)
      return true
    }
    state.value = { row, rowKey, column, definition, initial, saving: false }
    return true
  }

  function cancel(refocus = true) {
    const s = state.value
    if (!s || s.saving) return
    state.value = null
    if (refocus) void nextTick(() => focusCell(s.rowKey, s.column.key))
  }

  /** Commits the open editor's value; `move` picks where editing goes on. `blur`: an invalid value is dropped. */
  async function commit(value: unknown, move: EditMove | 'blur' = 0) {
    const s = state.value
    if (!s || s.saving) return
    await save(s.row, s.rowKey, s.column, value, move, s.definition)
  }

  async function save(
    row: T,
    rowKey: RowKey,
    column: ColumnDef<T>,
    value: unknown,
    move: EditMove | 'blur',
    definition: CellRendererDefinition | undefined,
    toggle = false,
  ) {
    const m = opts.messages()
    const oldValue = getCellValue(row, column)
    const fail = (error: string) => {
      if (move === 'blur' && !toggle) return cancel(false)
      state.value = toggle
        ? null
        : { row, rowKey, column, definition, draft: { value }, error, saving: false }
    }
    if (value instanceof Error) return fail(value.message) // the editor couldn't parse it
    const invalid = column.validate?.(value, row)
    if (invalid) return fail(invalid)
    if (!Object.is(value, oldValue) && !sameDate(value, oldValue)) {
      const event: CellEditEvent<T> = { row, rowKey, column, value, oldValue, source: 'edit' }
      opts.emit(event)
      const saver = opts.save()
      if (saver) {
        if (!toggle)
          state.value = { row, rowKey, column, definition, draft: { value }, saving: true }
        try {
          await saver(event)
        } catch (error) {
          const message =
            (error instanceof Error && error.message) ||
            (typeof error === 'string' && error) ||
            (m.editSaveFailed ?? "Couldn't save the change.")
          if (toggle) return
          // reopened even after a blur: the change didn't happen
          state.value = {
            row,
            rowKey,
            column,
            definition,
            draft: { value },
            error: message,
            saving: false,
          }
          return
        }
      }
      record([event])
    }
    if (!toggle && !isEditing(rowKey, column.key)) return // another cell took over meanwhile
    state.value = null
    if (move === 'blur') return
    await nextTick()
    if (move === 0 || !next(rowKey, column.key, move)) focusCell(rowKey, column.key)
  }

  /** Opens the next / previous editable cell on screen (rows in display order). */
  function next(rowKey: RowKey, key: string, dir: -1 | 1): boolean {
    const cells = Array.from(
      opts.root.value?.querySelectorAll<HTMLElement>('.vg-row > .vg-cell[data-vg-editable]') ?? [],
    )
    const here = cellEl(rowKey, key)
    const target = here ? cells[cells.indexOf(here) + dir] : undefined
    if (!target) return false
    target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    // the cell opens its own editor (it knows its row and column)
    moving = true
    try {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }),
      )
    } finally {
      moving = false
    }
    return true
  }

  /** A key on a focused body cell: Enter / F2 edit, a printable character edits from scratch. */
  function onCellKeyDown(
    event: KeyboardEvent,
    row: T,
    rowKey: RowKey,
    column: ColumnDef<T>,
    definition: CellRendererDefinition | undefined,
  ) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey)
      return
    // The editor is still opening (its chunk loading): keep the keys for it, in order.
    const s = state.value
    if (s && isEditing(rowKey, column.key) && !s.saving) {
      event.preventDefault()
      event.stopPropagation()
      if (event.key === 'Escape') cancel()
      else if (event.key === 'Enter') state.value = { ...s, queued: 0 }
      else if (event.key === 'Tab') state.value = { ...s, queued: event.shiftKey ? -1 : 1 }
      else if (event.key.length === 1 && s.queued === undefined)
        // like typing into the editor, whose text starts selected: the keys replace the value
        state.value = { ...s, initial: (s.initial ?? '') + event.key }
      return
    }
    let initial: string | undefined
    if (event.key === 'Enter' || event.key === 'F2') initial = undefined
    else if (event.key.length === 1 && event.key !== ' ') initial = event.key
    else return
    if (start(row, rowKey, column, definition, initial)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  /** Opens the editor of a cell on screen by keys (the imperative `startEdit`). */
  function startAt(rowKey: RowKey, key: string): boolean {
    const el = cellEl(rowKey, key)
    if (!el?.hasAttribute('data-vg-editable')) return false
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }))
    return isEditing(rowKey, key)
  }

  /** The open editor reports its current value here (for `stopEdit()`). */
  let read: (() => unknown) | null = null
  const register = (fn: (() => unknown) | null) => (read = fn)
  /** Closes the open editor: commits its value (an invalid one is dropped), or cancels. */
  function stop(cancelIt = false) {
    if (cancelIt || !read) return cancel()
    void commit(read(), 'blur')
  }

  /** A select's choices: `editorOptions.options`, else the column's distinct values (up to 500). */
  function choices(column: ColumnDef<T>): EditorOption[] {
    const given = column.editorOptions?.options
    if (given) return given.map((o) => (o !== null && typeof o === 'object' ? o : { value: o }))
    const seen = new Set<unknown>()
    for (const row of opts.rows()) {
      const v = getCellValue(row, column)
      if (v !== null && v !== undefined && v !== '') seen.add(v)
      if (seen.size >= 500) break
    }
    return [...seen].sort((a, b) => String(a).localeCompare(String(b))).map((value) => ({ value }))
  }

  /**
   * Pastes text into many cells at once (range selection): each editable cell's text becomes its
   * column's kind of value, `validate` checks it, and a changed cell is emitted as `cell-edit`,
   * then all of them are saved with `save-cell` together. No editor opens; what didn't fit is
   * reported in `skipped`, the saves that failed in `failed`.
   */
  async function writeCells(
    cells: readonly PasteCell<T>[],
    source: 'paste' | 'fill',
  ): Promise<CellsPasteEvent<T>> {
    if (state.value && !state.value.saving) state.value = null
    // loads on the first paste or fill (own chunk)
    const { fillValue, pasteValue } = await import('../core/paste')
    const m = opts.messages()
    const result: CellsPasteEvent<T> = { edits: [], skipped: [], failed: [] }
    for (const cell of cells) {
      const { row, rowKey, column, definition } = cell
      const text = cell.text ?? (cell.value == null ? '' : String(cell.value))
      const skip = (reason: PasteSkip['reason'], message?: string) =>
        result.skipped.push({ rowKey, columnKey: column.key, text, reason, message })
      if (!canEdit(row, column)) {
        skip('read-only')
        continue
      }
      const kind = editorOf(column, definition)
      if (kind === 'custom') {
        skip('unsupported')
        continue
      }
      const oldValue = getCellValue(row, column)
      const ctx = {
        locale: opts.locale(),
        oldValue,
        options: kind === 'select' ? choices(column) : undefined,
        yes: m.yes,
        no: m.no,
      }
      const value =
        cell.text !== undefined
          ? pasteValue(cell.text, kind, ctx)
          : fillValue(cell.value, kind, ctx)
      if (value instanceof Error) {
        skip('invalid', value.message)
        continue
      }
      const { min, max } = column.editorOptions ?? {}
      if (
        typeof value === 'number' &&
        ((min !== undefined && value < min) || (max !== undefined && value > max))
      ) {
        skip(
          'invalid',
          m.editOutOfRange?.(min, max) ?? `Out of range (${min ?? '…'}–${max ?? '…'}).`,
        )
        continue
      }
      const invalid = column.validate?.(value, row)
      if (invalid) {
        skip('invalid', invalid)
        continue
      }
      if (Object.is(value, oldValue) || sameDate(value, oldValue)) continue
      const event: CellEditEvent<T> = { row, rowKey, column, value, oldValue, source }
      result.edits.push(event)
      opts.emit(event)
    }
    const saver = opts.save()
    if (saver && result.edits.length) {
      const settled = await Promise.allSettled(result.edits.map((e) => saver(e)))
      settled.forEach((s, i) => {
        if (s.status === 'rejected') result.failed.push({ edit: result.edits[i]!, error: s.reason })
      })
    }
    const failed = new Set(result.failed.map((f) => f.edit))
    record(result.edits.filter((e) => !failed.has(e))) // the whole paste / fill is one undo step
    return result
  }
  const pasteCells = (cells: readonly PasteCell<T>[]) => writeCells(cells, 'paste')
  /** Fills cells with values (the fill handle, Ctrl/⌘+D): like pasting, without reading text. */
  const fillCells = (cells: readonly PasteCell<T>[]) => writeCells(cells, 'fill')

  // ── Undo / redo ─────────────────────────────────────────────────────────────────────────
  /** Changes to undo (oldest first) and undone changes to redo; each step is one edit or paste. */
  const past = shallowRef<HistoryChange<T>[][]>([])
  const future = shallowRef<HistoryChange<T>[][]>([])
  let travelling = false

  /** Remembers saved changes as one step; a new change drops what could be redone. */
  function record(events: readonly CellEditEvent<T>[]) {
    const limit = opts.historyLimit()
    if (travelling || limit <= 0 || !events.length) return
    const step = events.map((e) => ({
      row: e.row,
      rowKey: e.rowKey,
      column: e.column,
      from: e.oldValue,
      to: e.value,
    }))
    past.value = [...past.value, step].slice(-limit)
    future.value = []
  }

  /**
   * Undo (back to each cell's `from`) or redo (forward to its `to`): every cell still holding the
   * value the step left is emitted and saved like an edit; one changed since by something else is
   * left alone. The cells that changed move to the other stack, as one step.
   */
  async function travel(dir: 'undo' | 'redo'): Promise<boolean> {
    const stack = dir === 'undo' ? past : future
    const step = stack.value.at(-1)
    if (!step || travelling || state.value?.saving) return false
    travelling = true
    try {
      stack.value = stack.value.slice(0, -1)
      state.value = null
      // the rows the grid has now, nested ones too (rows may have been replaced since the edit)
      const byKey = new Map<string, T>()
      const walk = (rows: readonly T[]) => {
        for (const row of rows) {
          byKey.set(String(opts.getKey(row)), row)
          const kids = opts.children(row)
          if (kids?.length) walk(kids)
        }
      }
      walk(opts.rows())
      const find = (key: RowKey) => byKey.get(String(key))
      const moves: { change: HistoryChange<T>; event: CellEditEvent<T> }[] = []
      for (const change of step) {
        const row = find(change.rowKey) ?? change.row
        const now = getCellValue(row, change.column)
        const [expected, value] =
          dir === 'undo' ? [change.to, change.from] : [change.from, change.to]
        if (!Object.is(now, expected) && !sameDate(now, expected)) continue // changed since
        const event: CellEditEvent<T> = {
          row,
          rowKey: change.rowKey,
          column: change.column,
          value,
          oldValue: now,
          source: dir,
        }
        moves.push({ change: { ...change, row }, event })
        opts.emit(event)
      }
      const saver = opts.save()
      let done = moves
      if (saver && moves.length) {
        const settled = await Promise.allSettled(moves.map((m) => saver(m.event)))
        done = moves.filter((_, i) => settled[i]!.status === 'fulfilled')
        // a save that failed: that change stays where it was, to try again
        const kept = moves.filter((_, i) => settled[i]!.status === 'rejected')
        if (kept.length) stack.value = [...stack.value, kept.map((m) => m.change)]
      }
      if (!done.length) return false
      const other = dir === 'undo' ? future : past
      other.value = [...other.value, done.map((m) => m.change)]
      const cells = done.map((m) => ({ rowKey: m.change.rowKey, columnKey: m.change.column.key }))
      await nextTick()
      // show where it happened: the first cell takes focus if the grid had it
      if (opts.root.value?.contains(document.activeElement))
        focusCell(cells[0]!.rowKey, cells[0]!.columnKey)
      opts.onTravel?.(cells)
      return true
    } finally {
      travelling = false
    }
  }

  /** Ctrl/⌘+Z undoes, Ctrl+Y / Ctrl/⌘+Shift+Z redo (not inside an editor: that's its own text). */
  function onHistoryKey(event: KeyboardEvent): boolean {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || !opts.undoKeys()) return false
    if (opts.historyLimit() <= 0) return false
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return false
    const key = event.key.toLowerCase()
    const dir =
      key === 'z'
        ? event.shiftKey
          ? 'redo'
          : 'undo'
        : key === 'y' && !event.shiftKey
          ? 'redo'
          : null
    if (!dir) return false
    event.preventDefault()
    void travel(dir)
    return true
  }

  /** A body cell's editing state and handlers. */
  function forCell(cell: () => EditCell<T>) {
    const editable = computed(() => {
      const c = cell()
      return c.column.kind === 'data' && !c.pinned && canEdit(c.row, c.column.def)
    })
    const active = computed(() => isEditing(cell().rowKey, cell().column.key))
    return {
      editable,
      active,
      onKeyDown(event: KeyboardEvent) {
        const c = cell()
        if (editable.value) onCellKeyDown(event, c.row, c.rowKey, c.column.def, c.column.definition)
      },
      onDblClick(event: MouseEvent) {
        if (!editable.value || active.value) return
        // a double-click on a link, button or input in the cell belongs to it
        const inner = (event.target as Element).closest('a, button, input, select, textarea')
        if (inner && (event.currentTarget as Element).contains(inner)) return
        const c = cell()
        start(c.row, c.rowKey, c.column.def, c.column.definition)
      },
    }
  }

  // The editor's chunk loads once the grid has an editable column, while the browser is idle, so
  // the first keystroke of an edit doesn't wait for it.
  if (typeof window !== 'undefined') {
    const stopPreload = watch(
      () => opts.columns().some((c) => c.editable),
      (any) => {
        if (!any) return
        const idle = window.requestIdleCallback ?? ((fn: () => void) => setTimeout(fn, 200))
        idle(() => void opts.preload().catch(() => {}))
        queueMicrotask(() => stopPreload())
      },
      { immediate: true },
    )
  }

  return {
    forCell,
    pasteCells,
    fillCells,
    undo: () => travel('undo'),
    redo: () => travel('redo'),
    canUndo: () => past.value.length > 0,
    canRedo: () => future.value.length > 0,
    clearHistory() {
      past.value = []
      future.value = []
    },
    onHistoryKey,
    state,
    canEdit,
    isEditing,
    start,
    commit,
    cancel,
    stop,
    register,
    choices,
    onCellKeyDown,
    startAt,
  }
}

const sameDate = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date && a.getTime() === b.getTime()

export type Editing<T = unknown> = ReturnType<typeof useEditing<T>>
