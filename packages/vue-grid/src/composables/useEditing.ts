import { computed, nextTick, shallowRef, watch, type Ref } from 'vue'
import { getCellValue } from '../core/value'
import type {
  CellEditEvent,
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
      const event: CellEditEvent<T> = { row, rowKey, column, value, oldValue }
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
