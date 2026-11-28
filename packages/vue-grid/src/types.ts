/* eslint-disable @typescript-eslint/no-explicit-any -- `any` defaults (ColumnDef<T = any>, renderer props) let untyped columns and renderers accept any row; createColumnHelper<T>() gives the strict form. */
import type { Component } from 'vue'
import type { ColumnFilter, FilterState, FilterType } from './core/filter'
import type { AggregateFn, AggregateName } from './core/aggregate'

export type { AggregateFn, AggregateName } from './core/aggregate'

export type RowKey = string | number

/** Anything Vue accepts in a `class` binding. */
export type ClassValue = string | Record<string, unknown> | ClassValue[] | null | undefined | false

export type Align = 'start' | 'center' | 'end'
export type SortDir = 'asc' | 'desc'
export type Density = 'compact' | 'cozy' | 'comfortable'

export interface SortState {
  /** The sorted column’s `key`. */
  key: string
  /** `asc` or `desc`. */
  dir: SortDir
  /**
   * In a server query (`query.sort`, `query.sorts`, `query-change`): what the backend sorts by,
   * the column's `sortField`, else its key. The grid adds it; you don't pass it.
   */
  field?: string
}

export type PinSide = 'left' | 'right'

/** Rows pinned above / below the body, by row key (row pinning feature). */
export interface PinnedRowsState {
  /** Keys of the rows pinned above the body, in display order. */
  top?: RowKey[]
  /** Keys of the rows pinned below the body, in display order. */
  bottom?: RowKey[]
}

export type { ColumnFilter, FilterState, FilterStateStorage, FilterType } from './core/filter'

export interface FilterOption {
  /** The value rows are matched against. */
  value: unknown
  /** Text shown for the option (default: the value). */
  label?: string
  /** Shown next to the option (e.g. number of rows). */
  count?: number
}

export type FilterOptionsLoader = (
  search: string,
  ctx: { signal: AbortSignal },
) => Promise<readonly FilterOption[]>

export interface ColumnFilterOptions {
  /** `text`, `number`, `date`, `boolean` or `set` (default: from the renderer). */
  type?: FilterType
  /**
   * Choices for a `set` filter: a list, or a loader called with the search text (e.g. from a
   * backend — honour `signal`). Default: distinct values from the rows.
   */
  options?: readonly FilterOption[] | FilterOptionsLoader
  /** Placeholder of the filter-row input. */
  placeholder?: string
}

/** Props of a column's custom `filterComponent`. */
export interface FilterComponentProps<T = any> {
  modelValue: ColumnFilter | undefined
  column: ColumnDef<T>
}

/** Change highlight: off, a neutral tint, or green / red by numeric direction. */
export type FlashMode = boolean | 'direction'

export interface ColumnState {
  /** Column keys in display order (all known columns, visible or not). */
  order: string[]
  /** Keys of hidden columns. */
  hidden: string[]
  /**
   * Runtime pin overrides (e.g. from the header menu). `null` = explicitly unpinned; a missing key
   * falls back to the column's `pinned` definition. Optional so older persisted state still loads.
   */
  pinned?: Record<string, PinSide | null>
  /** Widths the user resized columns to (CSS lengths, e.g. `'240px'`). Column resizing feature. */
  widths?: Record<string, string>
}

export interface ColumnStateStorage {
  load(): Partial<ColumnState> | null
  save(state: ColumnState): void
}

/**
 * Augment this interface to register typed renderer names and their options:
 *
 * ```ts
 * declare module '@nocopypaste/vue-grid' {
 *   interface CellRendererRegistry { rating: { max?: number } }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CellRendererRegistry {}

export type RendererName = keyof CellRendererRegistry | (string & {})

/**
 * How a column picks its renderer: a registered name (`'currency'`), or the renderer definition
 * itself (`currencyRenderer`) — the tree-shakeable way: only imported renderers end up in the bundle.
 */
export type RendererRef = RendererName | CellRendererDefinition<any>

export type RendererOptions<R> =
  R extends CellRendererDefinition<infer O>
    ? O
    : R extends keyof CellRendererRegistry
      ? CellRendererRegistry[R]
      : Record<string, unknown>

export interface ColumnHeaderGroup {
  /** Stable identifier within the parent group. */
  key: string
  /** Visible label, which can change without changing the key. */
  label: string
}

export interface ColumnDef<T = any, R extends RendererRef = RendererName> {
  /** Unique, stable column id. Also used for sort state, column state and slot names. */
  key: string
  /** Header text (default: the key). */
  header?: string
  /** Tooltip on the header cell. */
  headerTooltip?: string
  /** Dot path into the row, e.g. `user.address.city`. Defaults to `key`. */
  field?: string
  /** Computes the cell value; wins over `field`. */
  value?: (row: T) => unknown
  /** A renderer definition (`currencyRenderer`), a registered renderer name, or a component. Defaults to `text`. */
  renderer?: R | Component
  /** Options of the column's renderer, typed against it (merged over the renderer's defaults). */
  rendererOptions?: RendererOptions<R>
  /** Any CSS grid track size. Defaults to `auto`. */
  width?: string
  /** Lower bound; combined with `width` into `minmax(minWidth, width)`, and the resize minimum. */
  minWidth?: string
  /** Upper bound when the user resizes the column (column resizing feature). */
  maxWidth?: string
  /** Can the user resize this column (column resizing feature)? Default `true`. */
  resizable?: boolean
  /** Fit the column to its first rendered data and header, within the resize bounds (column resizing feature). */
  initialAutoSize?: boolean
  /**
   * Header group label (column groups feature): adjacent visible columns with the same `group`
   * share one header cell above their own headers.
   */
  group?: string
  /** Column header groups from outermost to innermost. Takes precedence over `group`. */
  groupPath?: readonly ColumnHeaderGroup[]
  /** Cell and header alignment (default: the renderer's, e.g. `end` for numbers, else `start`). */
  align?: Align
  /** A sort button in the header (sorting feature). Client sorting needs `sort-mode="client"`. */
  sortable?: boolean
  /**
   * Server sorting: the name the backend sorts this column by, when it isn't the column key
   * (e.g. `'player.lastName'` or `'PLACED_AT'`). It arrives as `field` in `query.sort` /
   * `query.sorts`; `v-model:sort` keeps the column key.
   */
  sortField?: string
  /** The value client sorting compares (default: the renderer's sort value, else the cell value). */
  sortValue?: (row: T) => unknown
  /** A full comparator for client sorting; wins over `sortValue`. */
  sortFn?: (a: T, b: T) => number
  /** Initial pin side (the header menu can change it at runtime unless `pinnable: false`). */
  pinned?: PinSide
  /** Allow runtime pin changes. `false` keeps the definition's pin and ignores saved overrides. */
  pinnable?: boolean
  /** Initial visibility (column state wins once it exists). */
  hidden?: boolean
  /** Can the user hide it from the column menu? Default `true`. */
  hideable?: boolean
  /** Can the user move it? Default `true`. */
  reorderable?: boolean
  /** Cell click emits `cell-click` instead of `row-click`. */
  clickable?: boolean
  /** Show a filter for this column (funnel in the header, and an input in the filter row). */
  filterable?: boolean
  /** Filter type — default from the renderer (number, date, boolean, set for status/chip, else text) — or options. */
  filter?: FilterType | ColumnFilterOptions
  /** Value used for filtering (default: the cell value). */
  filterValue?: (row: T) => unknown
  /** Custom predicate; replaces the built-in matching for this column. */
  filterFn?: (row: T, filter: ColumnFilter, value: unknown) => boolean
  /** Custom filter UI (popover), receives `modelValue` / emits `update:modelValue` with a filter. */
  filterComponent?: Component
  /** Include in the quick search. Default `true` for visible columns. */
  searchable?: boolean
  /**
   * Briefly highlight the cell when its value changes (overrides the grid's `flash` prop).
   * `'direction'`: green when a number goes up, red when it goes down.
   */
  flash?: FlashMode
  /**
   * The column's value in the totals row (aggregation feature): `'sum' | 'avg' | 'min' | 'max'`
   * over the cell values (empty values skipped), `'count'` of rows, or a function of the values and
   * the rows. Shown with the column's renderer (`count` as a plain number).
   */
  aggregate?: AggregateName | AggregateFn<T>
  /**
   * The header menu offers Group by / Ungroup for this column (row grouping feature). Any column can
   * be grouped through `v-model:group-by`; this only adds the menu items.
   */
  groupable?: boolean
  /**
   * The value rows are grouped by (row grouping feature), e.g. `(row) => row.placedAt.slice(0, 7)`
   * for months. Default: the cell value, shown with the column's renderer; a `groupValue` is shown
   * as text (or with the `#group-<key>` slot).
   */
  groupValue?: (row: T) => unknown
  /**
   * The value exports and copying use (export feature), e.g. a plain id for a link or an object.
   * Wins over the cell value and the renderer's text.
   */
  exportValue?: (row: T) => unknown
  /** Included in CSV exports and copied rows (export feature)? Default `true`; set `false` on action columns. */
  exportable?: boolean
  /**
   * Cells can be edited in place (editing feature): `true`, or per row. Double-click, Enter or F2
   * on a focused cell, or typing, opens the editor; the grid emits `cell-edit` and your handler
   * updates the data (the grid never changes rows itself).
   */
  editable?: boolean | ((row: T) => boolean)
  /**
   * The editor (editing feature): `text`, `number`, `date`, `datetime`, `select`,
   * `checkbox`, or your own component (`CellEditorProps`). Default from the renderer: numbers
   * and money → number, dates → date, booleans → checkbox, status / chip → select, else text.
   */
  editor?: EditorName | Component
  /** Options of the editor: the choices of a select, a number's `min` / `max`, a `placeholder`. */
  editorOptions?: EditorOptions
  /**
   * Checks an edited value before it is saved (editing feature): return an error message to keep
   * the editor open with it, or nothing to accept the value.
   */
  validate?: (value: unknown, row: T) => string | null | undefined | void
  /** Extra classes for the column's body cells (or a function of the row). */
  cellClass?: ClassValue | ((row: T) => ClassValue)
  /** Extra classes for the column's header cell. */
  headerClass?: ClassValue
}

/**
 * Typed column factory. `renderer` is inferred per column, so `rendererOptions` is checked against
 * that renderer's options (including addon renderers registered via module augmentation).
 *
 * ```ts
 * const col = createColumnHelper<Order>()
 * const columns = [col({ key: 'total', renderer: 'currency', rendererOptions: { currency: 'EUR' } })]
 * ```
 */
export type ColumnHelper<T> = <R extends RendererRef = 'text'>(def: ColumnDef<T, R>) => ColumnDef<T>

export interface FormatContext {
  locale: string
  currency: string
  timeZone?: string
}

/** Props every cell renderer component receives. */
export interface CellRendererProps<T = any, V = any, O = Record<string, any>> {
  value: V
  row: T
  rowKey: RowKey
  rowIndex: number
  depth: number
  column: ColumnDef<T>
  options: O
}

/** Events a cell renderer may emit. `action` is re-emitted by the grid as `cell-action`. */
export interface CellRendererEmits {
  (e: 'action', name: string, payload?: unknown): void
}

export interface CellRendererDefinition<O = any> {
  name: string
  component: Component
  defaults?: Partial<O>
  align?: Align
  /** Sort key derived from the cell value (used in client sort mode). */
  sortValue?: (value: unknown, options: O) => unknown
  /**
   * Plain-text form of the value, as the cell shows it: what copying and formatted exports use
   * (export feature). `options` are the column's: resolve `(value, row)` option functions with
   * `row`. Without it the value is copied as is.
   */
  format?: (value: unknown, options: O, ctx: FormatContext, row?: unknown) => string
  /** Default filter type for columns using this renderer (default `text`). */
  filterType?: FilterType
}

export interface CellActionEvent<T = any> {
  /** The action, e.g. `click`, `change`, `toggle`, `copy` or a button’s `name`. */
  name: string
  /** Action data: the new value of a toggle or input, the copied text, a line index… */
  payload: unknown
  /** The row the cell belongs to. */
  row: T
  /** The row’s key (`row-key`). */
  rowKey: RowKey
  /** The cell’s column definition. */
  column: ColumnDef<T>
}

/** A built-in cell editor (editing feature). */
export type EditorName = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'checkbox'

/** A choice of a select editor: a value, and the text shown for it (default: the value). */
export interface EditorOption {
  value: unknown
  label?: string
}

/** Options of a column's editor (`editorOptions`). */
export interface EditorOptions {
  /** Select: the choices (default: the column's distinct values in the rows). */
  options?: readonly (EditorOption | string | number | boolean)[]
  /** Number: the smallest value. */
  min?: number
  /** Number: the largest value. */
  max?: number
  /** Text and number: shown while empty. */
  placeholder?: string
  /** Text: the longest value. */
  maxLength?: number
  /** Anything your own editor component needs. */
  [option: string]: unknown
}

/**
 * Props of your own editor component (`editor: MyEditor`). Emit `update:modelValue` as the value
 * changes; Enter, Tab and Esc are handled around it (commit, commit and move, cancel). Emit
 * `commit` / `cancel` yourself where a key or a click should do that.
 */
export interface CellEditorProps<T = any> {
  /** The value being edited (starts as the cell value). */
  modelValue: unknown
  row: T
  column: ColumnDef<T>
  options: EditorOptions
  /** The validation or save error, if any. */
  error?: string
  /** Saving: the value can't change. */
  disabled?: boolean
  /** The accessible name for the control, e.g. "Edit Stake". */
  label: string
  /** Editing started by typing a character: it replaces the value. */
  initial?: string
}

/** An edited cell value, committed (editing feature): `cell-edit` and `save-cell` get it. */
export interface CellEditEvent<T = any> {
  /** The row the cell belongs to. */
  row: T
  /** The row's key (`row-key`). */
  rowKey: RowKey
  /** The edited column. */
  column: ColumnDef<T>
  /** The new value, typed by the editor: a number, a string, a date, a boolean, a select's value. */
  value: unknown
  /** The value before the edit. */
  oldValue: unknown
  /**
   * What made the change: `edit` (an editor, a checkbox), `paste` (Ctrl/⌘+V into a range), `fill`
   * (the fill handle, Ctrl/⌘+D), `replace` (find and replace), `clear` (Delete / Backspace),
   * `cut` (Ctrl/⌘+X), or
   * `undo` / `redo` (Ctrl/⌘+Z, Ctrl+Y, or the methods). Store it the same way in every case.
   */
  source?: 'edit' | 'paste' | 'fill' | 'replace' | 'clear' | 'cut' | 'undo' | 'redo'
}

/** A pasted cell that wasn't changed (range selection + editing). */
export interface PasteSkip {
  rowKey: RowKey
  columnKey: string
  /** The pasted text for it. */
  text: string
  /**
   * `read-only`: the column isn't `editable` for the row. `invalid`: the text isn't a value of the
   * column's kind (a number, a date, a choice…) or `validate` refused it. `unsupported`: the column
   * has its own editor component, which only it can parse.
   */
  reason: 'read-only' | 'invalid' | 'unsupported'
  /** Why it was invalid. */
  message?: string
}

/**
 * A paste into the grid finished (`cells-paste`): every changed cell (each also emitted as
 * `cell-edit` and saved with `save-cell`), the cells left alone, and the saves that failed.
 */
/**
 * A row dragged (or moved with Alt+↑ / Alt+↓) to a new place (`row-move`, row reorder feature).
 * The grid doesn't move it: put `row` just before or after `target` in your rows (`moveRow()`).
 */
export interface RowMoveEvent<T = any> {
  /** The row being moved. */
  row: T
  rowKey: RowKey
  /** The row it goes next to. */
  target: T
  targetKey: RowKey
  /** Just before or just after `target`. */
  position: 'before' | 'after'
  /** For a nested row: its parent (rows only move among their siblings); null at the top. */
  parent: T | null
  parentKey: RowKey | null
  /** How it was moved. */
  source: 'drag' | 'keyboard'
}

export interface CellsPasteEvent<T = any> {
  edits: CellEditEvent<T>[]
  skipped: PasteSkip[]
  failed: { edit: CellEditEvent<T>; error: unknown }[]
}

export interface CellClickEvent<T = any> {
  /** The row the cell belongs to. */
  row: T
  /** The row’s key (`row-key`). */
  rowKey: RowKey
  /** The clicked column (one with `clickable: true`). */
  column: ColumnDef<T>
  /** The cell value. */
  value: unknown
  /** The DOM event of the click (Enter on a focused cell clicks it too). */
  event: MouseEvent | KeyboardEvent
}

export type GridPart =
  'root' | 'header' | 'headerCell' | 'row' | 'cell' | 'subgrid' | 'detail' | 'empty'

export interface VirtualOptions {
  /** Fixed row height in px. Default text uses one line. Allow room for multiline or custom cells. */
  rowHeight: number
  /** Extra rows rendered above/below the viewport. Default 6. */
  overscan?: number
  /**
   * Estimated height in px of a detail row (`#detail` slot) until it has been rendered and
   * measured. Default 4 × `rowHeight`. Data rows always have `rowHeight`.
   */
  detailHeight?: number
}

/** `virtual-columns` options (column virtualization feature). */
export interface VirtualColumnsOptions {
  /** Extra columns rendered on each side of the ones in view. Default 2. */
  overscan?: number
  /**
   * The width of a column whose own `width` follows its content (`auto`, the default,
   * `min-content`, a bare `1fr`), which can't be measured while its cells aren't rendered; a
   * bare `fr` keeps stretching from it. Pinned columns and the checkbox keep their own sizing.
   * Default `'10rem'`.
   */
  width?: string
}

export type MenuTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'accent'

export interface MenuAction {
  /** Emitted as the action name. */
  name: string
  /** Text of the item. */
  label: string
  /**
   * Shown but can’t be chosen. A string also says why (“Settled bets can’t be voided”): shown under
   * the label and read out as the item’s description. Such an item stays focusable, so keyboard
   * and screen reader users reach the reason too.
   */
  disabled?: boolean | string
  /** Colour, e.g. `danger` for a delete item. */
  tone?: MenuTone
  /** An icon component before the label. */
  icon?: Component
  /** Shown right-aligned, e.g. a shortcut hint. */
  hint?: string
  /**
   * A submenu: this item opens these items beside it (hover, click, → / Enter / Space) instead of
   * being chosen; ← or Esc goes back. Choosing one of them emits it like any other item.
   */
  items?: readonly MenuItem[]
}

export interface MenuSeparator {
  separator: true
}

export type MenuItem = MenuAction | MenuSeparator

/** What was right-clicked in the body. */
export interface CellContext<T = any> {
  /** The row the cell belongs to. */
  row: T
  /** The row’s key (`row-key`). */
  rowKey: RowKey
  /** The cell’s column definition. */
  column: ColumnDef<T>
  /** The cell value (`value` / `field` / `key`). */
  value: unknown
}

/**
 * Extra attributes for a row or a cell (`rowAttrs` / `cellAttrs`, attributes feature), such as
 * test hooks: `{ 'data-test': 'row-0' }`. Values are written as text; `null` and `undefined`
 * leave an attribute out. The grid keeps its own: `role`, `aria-*`, `tabindex`, `id`, `class`,
 * `style` and its `data-*` hooks (`data-row-key`, `data-col-key`, `data-vg-*`, …) are ignored
 * here, and so are `on…` handlers. For classes, use `rowClass` and `cellClass`.
 */
export type ExtraAttrs = Record<string, string | number | boolean | null | undefined>

/** Row-specific accessible name and data attributes for an expansion button. */
export interface ExpanderAttrs {
  /** A non-blank name overrides the grid's localized default. */
  'aria-label'?: string | null
  [name: `data-${string}`]: string | number | boolean | null | undefined
}

/** The row and current state of the expansion button being rendered. */
export interface ExpanderAttrsContext<T = unknown> {
  row: T
  rowKey: RowKey
  expanded: boolean
}

/** What `rowAttrs` gets for a data row (group, detail and totals rows get none). */
export interface RowAttrsContext<T = any> {
  row: T
  /** The row’s key (`row-key`). */
  rowKey: RowKey
  /**
   * The row’s position, from 0, among the rows shown at its level, as sorted and filtered (on
   * its page with pagination; in a pinned section, its position there). Tree children count
   * from 0 under their parent.
   */
  rowIndex: number
  /** Tree depth: 0 for top-level rows. */
  depth: number
  /** Set for a pinned row: the section it's in. */
  pinned?: 'top' | 'bottom'
}

/** What `cellAttrs` gets for a cell of a data row. */
export interface CellAttrsContext<T = any> extends RowAttrsContext<T> {
  /** The cell’s column definition. */
  column: ColumnDef<T>
  /** The column key (`data-col-key`). */
  columnKey: string
  /** The column’s position, from 0, among the shown columns, the selection checkbox included. */
  columnIndex: number
  /** `select`: the selection checkbox column; `drag`: the row handle column; `data`: one of yours. */
  kind: 'data' | 'select' | 'drag'
  /** Set for a pinned column: its side. */
  columnPinned?: PinSide
}

export interface ContextActionEvent<T = any> extends CellContext<T> {
  /** The chosen item’s `name`. */
  name: string
  /** The chosen item. */
  item: MenuAction
}

export interface HeaderMenuContext<T = any> {
  column: ColumnDef<T>
  /** The built-in items (sort, pin, move, hide, reset) for this column. */
  items: MenuItem[]
}

export interface HeaderActionEvent<T = any> {
  /** The chosen item’s `name`. */
  name: string
  /** The chosen item. */
  item: MenuAction
  /** The column whose header menu it was. */
  column: ColumnDef<T>
}

/** Methods exposed on a `<VGrid>` template ref: `const grid = ref<VGridExposed>()`. */
export interface VGridExposed<T = unknown> {
  /** Scrolls the grid back to its first row. */
  scrollToTop(): void
  /** Scrolls a row (top-level or nested, also in virtual mode) into view. */
  scrollToRow(key: RowKey): void
  /** Scrolls a column into view sideways (with `virtual-columns`, renders it first). */
  scrollToColumn(key: string): Promise<void>
  /**
   * Current page's visible body data in display order, including expanded children and rows outside
   * the virtual viewport. Omits generated group headers, details, totals, and pinned rows.
   * Reactive when called in a computed. Treat the returned rows as read-only.
   */
  getVisibleRows(): readonly T[]
  /** Expands every expandable row (sub-grids and detail rows) that passes the filters. */
  expandAll(): void
  /** Collapses every row. */
  collapseAll(): void
  /** Replaces the column state (order, hidden, pins, widths), and saves it with `storage`. */
  setColumnState(state: ColumnState): void
  /**
   * Applies field patches to lazily loaded child rows (`loadSubRows`), which the grid caches and the
   * app can't reach. Top-level and synchronous `subRows` data belong to the app: update them there
   * (assign fields on reactive rows, or use `patchRows`). Returns the number of rows patched.
   */
  patchLoadedRows(
    patches: ReadonlyMap<RowKey, Record<string, unknown>> | readonly Record<string, unknown>[],
  ): number
  /** Replaces the filter model (also persisted with `filter-storage`). */
  setFilters(state: FilterState): void
  /** Removes every column filter and the search. */
  clearFilters(): void
  /** Opens a column's filter popover. */
  openFilter(key: string): void
  /** Re-runs the `dataSource` with the current query; lazily loaded child rows load again too. */
  reload(): Promise<void>
  /** Forgets lazily loaded child rows (one row's, or all): expanded rows load them again. */
  reloadSubRows(key?: RowKey): void
  /** Pins a top-level row above or below the body, or unpins it (`null`). Row pinning feature. */
  pinRow(key: RowKey, side: 'top' | 'bottom' | null): void
  /** Clears the selection, "all matching rows" included. Selection feature. */
  clearSelection(): void
  /** The rows as CSV text: the filtered, sorted rows, visible columns, raw values. Export feature. */
  getCsv(options?: ExportOptions): string
  /** Downloads the rows as a CSV file (`filename`, default `export.csv`; UTF-8 with a BOM). Export feature. */
  exportCsv(options?: ExportOptions & { filename?: string; bom?: boolean }): void
  /**
   * The rows as an Excel workbook (.xlsx): typed cells (numbers, dates, booleans), number formats
   * from the columns' renderers, a bold frozen header. The writer loads on demand. Export feature.
   */
  getXlsx(options?: XlsxExportOptions): Promise<Blob>
  /** Downloads the rows as an Excel file (`filename`, default `export.xlsx`). Export feature. */
  exportXlsx(options?: XlsxExportOptions & { filename?: string }): Promise<void>
  /**
   * Prints the rows as a table (the browser's print dialog): the filtered, sorted rows on every page
   * (not just those in view), as the cells show them, the header repeated on each printed page,
   * numbers right-aligned, the totals in bold. Resolves when printing is over. Export feature.
   */
  print(options?: PrintOptions): Promise<void>
  /**
   * Copies rows to the clipboard as tab-separated text (pastes as cells into spreadsheets): the
   * selected rows by default, as displayed, no header. Resolves `false` if nothing was copied.
   * Export feature.
   */
  copyRows(options?: ExportOptions): Promise<boolean>
  /**
   * Opens the editor of a cell (editing feature), if the column is `editable` for that row and the
   * row is on screen. Returns whether it opened.
   */
  startEdit(rowKey: RowKey, columnKey: string): boolean
  /** Closes the open editor: saves its value, or with `cancel` drops it. Editing feature. */
  stopEdit(cancel?: boolean): void
  /**
   * Selects a block of cells (`null` clears it), as `v-model:range` does. Range selection feature,
   * with `range-selection`.
   */
  selectRange(range: CellRange | null): void
  /** The selected range's raw values, row by row (`[]` without a range). Range selection feature. */
  getRangeValues(): unknown[][]
  /**
   * Copies the selected range as tab-separated text, as the cells show it (Ctrl/⌘+C does the same).
   * Resolves `false` without a range. Range selection feature.
   */
  copyRange(): Promise<boolean>
  /**
   * Pastes tab-separated text (what spreadsheets copy) into the editable cells from the selected
   * range's top-left cell, as Ctrl/⌘+V does; a range a whole number of blocks in size is filled.
   * Resolves the `cells-paste` event, or `null` with nowhere to paste. Range selection and editing
   * features.
   */
  pasteText(text: string): Promise<CellsPasteEvent | null>
  /**
   * Fills the selected range down from its top row, as Ctrl/⌘+D does (the fill handle's rules:
   * one value repeats). Resolves the `cells-fill` event, or `null` without a range of two or
   * more rows. Range selection and editing features.
   */
  fillDown(): Promise<CellsPasteEvent | null>
  /**
   * Opens the find bar (Ctrl/⌘+F in the grid; `replace: true` also shows the replace row, as
   * Ctrl/⌘+H does), searching the selected range if there is one, else every cell. Range
   * selection feature (replacing needs the editing feature too).
   */
  openFind(options?: { replace?: boolean; text?: string }): void
  /** Closes Find and focuses the current match, or returns focus to the opener when available. */
  closeFind(): void
  /**
   * Clears the selected range's editable cells (else the selected cell's), as Delete /
   * Backspace do: blank text, no number or date, an unticked checkbox. Resolves the `cells-clear`
   * event, or `null` with nothing selected. Range selection and editing features.
   */
  clearRange(): Promise<CellsPasteEvent | null>
  /** Copies the selected cells, then clears them (Ctrl/⌘+X). Range selection and editing features. */
  cutRange(): Promise<CellsPasteEvent | null>
  /**
   * Undoes the last change made in the grid (an edit, a checkbox, a whole paste): each cell gets
   * its value back through `cell-edit` (`source: 'undo'`) and `save-cell`, as Ctrl/⌘+Z does.
   * Cells changed since by something else are left alone. Resolves whether anything changed.
   * Editing feature.
   */
  undo(): Promise<boolean>
  /** Redoes the last undone change (Ctrl+Y, Ctrl/⌘+Shift+Z). Editing feature. */
  redo(): Promise<boolean>
  /** Whether there's a change to undo (for your own buttons; reactive). */
  canUndo(): boolean
  /** Whether there's an undone change to redo (for your own buttons; reactive). */
  canRedo(): boolean
  /** Forgets every change (e.g. after saving or reloading). */
  clearHistory(): void
}

/** A cell, by its row's key and its column's key (cell-range selection). */
export interface CellRef {
  rowKey: RowKey
  columnKey: string
}

/**
 * A block of cells (`v-model:range`): from the cell where it started (`start`) to the opposite
 * corner (`end`), in the rows' and columns' current order.
 */
export interface CellRange {
  start: CellRef
  end: CellRef
}

/** Which rows, columns and values an export or copy takes (export feature). */
export interface ExportOptions {
  /**
   * `filtered` (default for exports): the rows that pass the filters, sorted, on every page.
   * `all`: filters ignored. `page`: the current page. `selected` (default for `copyRows`).
   */
  rows?: 'filtered' | 'all' | 'page' | 'selected'
  /** Also the known child rows (sub-grids), each after its parent. Default `false`. */
  children?: boolean
  /** Column keys, in order (hidden columns too). Default: the visible columns without `exportable: false`. */
  columns?: string[]
  /** `raw` (default for exports): the cell values. `formatted` (default for copying): as the cells show them. */
  values?: 'raw' | 'formatted'
  /** A header line. Default `true` for exports, `false` for copying. */
  header?: boolean
  /** A last line with the totals row (aggregation feature). Default `false`. */
  totals?: boolean
  /** Field separator. Default `,` for CSV, a tab for copying. */
  delimiter?: string
  /** Prefix text a spreadsheet would run as a formula (`=…`, `+…`, `@…`) with `'`. Default `true`. */
  guard?: boolean
}

/** Options of `getXlsx` / `exportXlsx` (export feature): the CSV ones, without the text-only ones. */
export interface XlsxExportOptions extends Omit<ExportOptions, 'delimiter' | 'guard'> {
  /** The sheet's name (31 characters at most; `[]:*?/\` and an apostrophe at either end are dropped). Default `Sheet1`. */
  sheetName?: string
}

/** Options of `print` (export feature): which rows and columns, as for exports, plus the page. */
export interface PrintOptions extends Omit<ExportOptions, 'delimiter' | 'guard' | 'values'> {
  /** A heading above the table, also the document title (some browsers print it in the page header). */
  title?: string
  /** Landscape pages, for wide grids. Default: the browser's setting. */
  landscape?: boolean
}

/**
 * Something was copied to the clipboard: rows (`copyRows`, Ctrl+C) or one cell (export feature), or
 * a block of cells (`range`: range selection feature; `rows` and `columns` are the range's).
 */
export interface CopyEvent<T = any> {
  kind: 'rows' | 'cell' | 'range'
  text: string
  rows: readonly T[]
  columns: readonly ColumnDef<T>[]
}

/** The built-in pager's options (`pagination` prop, pagination feature). */
export interface PaginationOptions {
  /** Page-size choices: a selector appears when there are any. */
  pageSizes?: number[]
  /** Page buttons on each side of the current one. Default `1`. */
  siblings?: number
  /**
   * The "1–25 of 240" text, with `{from}`, `{to}` and `{total}`; `''` hides it. Default:
   * `messages.pageSummary`, else `{from}–{to} of {total}`.
   */
  summary?: string
  /** The first and last page buttons (« »). Default `true`. */
  firstLast?: boolean
}

/** An aggregate the status bar can show for the selected rows. */
export type StatusBarAggregate = 'sum' | 'avg' | 'min' | 'max'

/** The `status-bar` prop's options (status bar feature). */
export interface StatusBarOptions {
  /**
   * Column keys to summarise over the selected rows, like a spreadsheet's status bar: e.g.
   * `['stake']` shows "Stake: Sum €1,234.50 Average €123.45" while rows are selected.
   */
  summary?: string[]
  /** What to show for each `summary` column. Default `['sum', 'avg']`. */
  aggregates?: StatusBarAggregate[]
  /** The row count (`84 of 200 rows`). Default `true`. */
  rows?: boolean
  /** Count filtered top-level rows (default), or the data rows shown on the current page, including expanded children. */
  rowCountMode?: 'filtered' | 'visible'
  /** App-supplied row count with all branches expanded. Omit to hide this figure. */
  fullyExpandedCount?: number
  /** Show a button that scrolls to the top of the current page. Default `false`. */
  backToTop?: boolean
  /** The selected count. Default `true`. */
  selected?: boolean
  /** The active filter count. Default `true`. */
  filters?: boolean
  /** The Clear button next to the filter count. Default `true`. */
  clear?: boolean
}

/** One `summary` column of the status bar: its aggregates over the selected rows. */
export interface StatusBarSummary {
  key: string
  /** The column's header (or key). */
  label: string
  /** Each aggregate with its value and the text shown (formatted like the column's cells). */
  items: { name: StatusBarAggregate; value: unknown; text: string }[]
}

/** The status bar's figures for a selected cell range. */
export interface StatusBarRange {
  /** Cells in the range. */
  cells: number
  /** Each aggregate over the range's values (sum and average skip what isn't a number). */
  items: { name: StatusBarAggregate; value: unknown; text: string }[]
}

/** The `#status-bar` slot's props (status bar feature). */
export interface StatusBarScope {
  /** Top-level rows that pass the filters, on every page (the server's `total` with a data source). */
  rowCount: number
  /** Top-level rows before filtering; undefined with a data source. */
  totalRowCount: number | undefined
  /** Selected rows (with "select all matching", the server's total). */
  selectedCount: number
  /** "Select all N matching rows" is on (server data). */
  allSelected: boolean
  /** Active column filters, plus one for the quick search. */
  filterCount: number
  /** The `summary` columns over the selected rows (empty when none are selected). */
  summary: StatusBarSummary[]
  /**
   * The selected cell range (range selection feature), while it covers more than one cell: how many
   * cells, and the `aggregates` (sum, average…) of its numbers, formatted like the cells when they
   * all come from one column. Null without a range.
   */
  range: StatusBarRange | null
  clearFilters: () => void
}

// ── Features (opt-in, tree-shakeable) ─────────────────────────────────────────────────────────
// A grid only gets the features you register — per grid (`<VGrid :features>`) or app-wide
// (`createVueGrid({ features })`) — and only those reach your bundle.

export interface SortingFeature {
  readonly feature: 'sorting'
  sortRows: typeof import('./core/sort').sortRows
  useSorting: typeof import('./composables/useSorting').useSorting
  /** A header's place in a multi-column sort. */
  SortMarker: Component
  SortIcon?: Component
}
export interface FilteringFeature {
  readonly feature: 'filtering'
  useFilters: typeof import('./composables/useGridFilters').useGridFilters
  /** The header funnel and its popover. */
  FilterButton: Component
  /** The filter-row editor. */
  FilterInput: Component
  /** "No rows match the current filters" with Clear filters (the `#no-match` slot replaces it). */
  NoMatch: Component
}
export interface ServerDataFeature {
  readonly feature: 'serverData'
  useDataSource: typeof import('./composables/useDataSource').useDataSource
  /** A failed request: the notice with Retry (the `#load-error` slot replaces it). */
  LoadError: Component
}
export interface PaginationFeature {
  readonly feature: 'pagination'
  Pagination: Component
}
export interface SelectionFeature {
  readonly feature: 'selection'
  useSelection: typeof import('./composables/useGridSelection').useGridSelection
  Checkbox: Component
  /** Server data: the "select all N matching rows" banner. */
  Banner: Component
}
export interface SubGridsFeature {
  readonly feature: 'subGrids'
  useSubRows: typeof import('./composables/useSubRows').useSubRows
}
export interface MenusFeature {
  readonly feature: 'menus'
  useMenus: typeof import('./composables/useGridMenus').useGridMenus
  Menu: Component
}
export interface ColumnReorderFeature {
  readonly feature: 'columnReorder'
  useColumnDrag: typeof import('./composables/useColumnDrag').useColumnDrag
  moveColumn: typeof import('./core/columns').moveColumn
  moveColumnRelative: typeof import('./core/columns').moveColumnRelative
}
export interface ColumnPinningFeature {
  readonly feature: 'columnPinning'
  usePinnedOffsets: typeof import('./composables/usePinnedOffsets').usePinnedOffsets
  useScrollEdges: typeof import('./composables/useScrollEdges').useScrollEdges
  usePinFit: typeof import('./composables/usePinFit').usePinFit
}
export interface VirtualScrollingFeature {
  readonly feature: 'virtualScrolling'
  useVirtualRows: typeof import('./composables/useVirtualRows').useVirtualRows
}
export interface ColumnVisibilityFeature {
  readonly feature: 'columnVisibility'
  setColumnHidden: typeof import('./core/columns').setColumnHidden
}
export interface KeyboardNavigationFeature {
  readonly feature: 'keyboardNavigation'
  useGridKeyboard: typeof import('./composables/useGridKeyboard').useGridKeyboard
}
export interface ColumnResizingFeature {
  readonly feature: 'columnResizing'
  useColumnResize: typeof import('./composables/useColumnResize').useColumnResize
  /** The header edge grip. */
  Handle: Component
}
export interface ColumnGroupsFeature {
  readonly feature: 'columnGroups'
  /** The group header row. */
  GroupRow: Component
}
export interface RowPinningFeature {
  readonly feature: 'rowPinning'
  usePinnedRows: typeof import('./composables/usePinnedRows').usePinnedRows
  /** The sticky pinned-rows section. */
  PinnedRows: Component
}
export interface AggregationFeature {
  readonly feature: 'aggregation'
  useTotals: typeof import('./composables/useTotals').useTotals
  /** The sticky section the totals row renders in. */
  PinnedRows: Component
}
export interface RowGroupingFeature {
  readonly feature: 'rowGrouping'
  useRowGrouping: typeof import('./composables/useRowGrouping').useRowGrouping
  /** The cells of a group row. */
  GroupCells: Component
}
export interface ExportFeature {
  readonly feature: 'export'
  useExport: typeof import('./composables/useGridExport').useGridExport
}
export interface RowReorderFeature {
  readonly feature: 'rowReorder'
  useRowReorder: typeof import('./composables/useRowReorder').useRowReorder
}
export interface ColumnVirtualizationFeature {
  readonly feature: 'columnVirtualization'
  useVirtualColumns: typeof import('./composables/useVirtualColumns').useVirtualColumns
}
export interface AttributesFeature {
  readonly feature: 'attributes'
  useExtraAttrs: typeof import('./composables/useExtraAttrs').useExtraAttrs
}
export interface StatusBarFeature {
  readonly feature: 'statusBar'
  useStatusBar: typeof import('./composables/useStatusBar').useStatusBar
  /** The status bar's default content. */
  StatusBar: Component
}
export interface EditingFeature {
  readonly feature: 'editing'
  useEditing: typeof import('./composables/useEditing').useEditing
  /** The cell editor (loads on demand). */
  Editor: Component
  /** Loads the editor's chunk ahead of the first edit (when a grid has editable columns). */
  preload: () => Promise<unknown>
}
export interface ServerGroupingFeature {
  readonly feature: 'serverGrouping'
  useServerGroups: typeof import('./composables/useServerGroups').useServerGroups
}
export interface RangeSelectionFeature {
  readonly feature: 'rangeSelection'
  useCellRange: typeof import('./composables/useCellRange').useCellRange
  /** The find bar (loads on demand). */
  FindBar: Component
  /** Loads the find bar's chunk ahead of the first Ctrl/⌘+F (while the browser is idle). */
  preloadFind: () => Promise<unknown>
}
export type GridFeature =
  | RowReorderFeature
  | ColumnVirtualizationFeature
  | AttributesFeature
  | RangeSelectionFeature
  | EditingFeature
  | ServerGroupingFeature
  | StatusBarFeature
  | ExportFeature
  | RowGroupingFeature
  | AggregationFeature
  | RowPinningFeature
  | ColumnGroupsFeature
  | ColumnResizingFeature
  | KeyboardNavigationFeature
  | ColumnVisibilityFeature
  | VirtualScrollingFeature
  | ColumnReorderFeature
  | ColumnPinningFeature
  | SortingFeature
  | FilteringFeature
  | ServerDataFeature
  | PaginationFeature
  | SelectionFeature
  | SubGridsFeature
  | MenusFeature
export type GridFeatureName = GridFeature['feature']

export interface VueGridConfig {
  /** Renderers every grid can use by name (`renderer: 'currency'`); `allRenderers` for all of them. */
  renderers?: CellRendererDefinition[]
  /** Features every grid in the app gets (`allFeatures` for all of them). */
  features?: readonly GridFeature[]
  /** Default locale for number and date renderers (default: the browser’s). */
  locale?: string
  /** Default ISO 4217 currency for currency renderers. */
  currency?: string
  /** Default IANA time zone for date renderers and date filters. */
  timeZone?: string
  /** Default density: `compact`, `cozy` (default) or `comfortable`. */
  density?: Density
  /** Built-in text for every grid (translations, wording); a grid's own `messages` win. */
  messages?: GridMessages
  /** Built-in parts to turn off in every grid; a grid's own `parts` win. */
  parts?: GridParts
}

/**
 * Every built-in text of the grid, its menus, filters, pager, status bar and renderers: set the
 * ones you need, the rest stay English. Functions get the values that go into the text. App-wide in
 * `createVueGrid({ messages })`, per grid with `:messages`. Props that name a text (`empty-text`,
 * `no-match-text`, `totals-label`, a renderer's `label`…) still win.
 */
export interface GridMessages {
  // ── States ──
  /** Default `Loading…`. */
  loading?: string
  /** No rows at all. Default `No data to show.` */
  empty?: string
  /** No row passes the filters. Default `No rows match the current filters.` */
  noMatch?: string
  /** The button next to `noMatch`. Default `Clear filters`. */
  clearFilters?: string
  /** A server request failed. Default `Couldn't load the rows.` */
  loadError?: string
  /** Added when the rows from before stay on screen. Default `These are from before.` */
  staleRows?: string
  /** Default `Retry`. */
  retry?: string
  /** A row's lazy children failed to load. Default `Could not load rows.` */
  subRowsError?: string
  /** The totals row's label. Default `Total`. */
  total?: string
  /** A group of rows with no value. Default `(blank)`. */
  blank?: string
  /** A group row's count, for screen readers. Default `` `${count} rows` ``. */
  groupRowCount?: (count: number) => string

  // ── Selection and expansion ──
  /** Default `Select all rows`. */
  selectAllRows?: string
  /** Default `Select row`. */
  selectRow?: string
  /** Default `Select group`. */
  selectGroup?: string
  /** The row handle (row reorder feature). Default `Move row`. */
  moveRow?: string
  /** The row handle's tooltip. Default `Drag, or Alt+↑ / Alt+↓`. */
  moveRowHint?: string
  /** Default `` `All ${count} rows on this page are selected.` `` */
  pageSelected?: (count: number) => string
  /** Default `` `Select all ${total} rows` `` */
  selectAllMatching?: (total: number) => string
  /** Default `` `All ${total} rows are selected.` `` */
  allSelected?: (total: number) => string
  /** Default `Clear selection`. */
  clearSelection?: string
  /** Default `Expand row`. */
  expandRow?: string
  /** Default `Collapse row`. */
  collapseRow?: string
  /** Default `Show row details`. */
  showRowDetails?: string
  /** Default `Hide row details`. */
  hideRowDetails?: string
  /** Default `Expand group`. */
  expandGroup?: string
  /** Default `Collapse group`. */
  collapseGroup?: string

  // ── Header menu and columns ──
  /** A header menu's name for screen readers. Default `` `${column} column` `` */
  columnMenu?: (column: string) => string
  /** The cell menu's name for screen readers. Default `Row actions`. */
  rowActions?: string
  /** Default `Sort ascending`. */
  sortAscending?: string
  /** Default `Sort descending`. */
  sortDescending?: string
  /** Default `Clear sort`. */
  clearSort?: string
  /** Multi-column sort: the header menu item that adds a column ascending. Default `Then sort ascending`. */
  thenSortAscending?: string
  /** Default `Then sort descending`. */
  thenSortDescending?: string
  /**
   * Multi-column sort, for screen readers on a sorted header. Default
   * `` `, sorted ${position} of ${count}, ascending` `` (`count`: how many keys; the third argument).
   */
  sortPosition?: (position: number, dir: 'asc' | 'desc', count: number) => string
  /** The header menu item that opens the column's filter. Default `Filter…`. */
  filterMenu?: string
  /** Default `Clear filter`. */
  clearFilter?: string
  /** Default `Clear all filters`. */
  clearAllFilters?: string
  /** Default `` `Group by ${column}` `` */
  groupBy?: (column: string) => string
  /** Default `Ungroup`. */
  ungroup?: string
  /** Default `Ungroup all`. */
  ungroupAll?: string
  /** Default `Pin left`. */
  pinLeft?: string
  /** Default `Pin right`. */
  pinRight?: string
  /** Default `Unpin`. */
  unpin?: string
  /** Default `Move left`. */
  moveLeft?: string
  /** Default `Move right`. */
  moveRight?: string
  /** Default `Fit width`. */
  fitWidth?: string
  /** Default `Reset width`. */
  resetWidth?: string
  /** Default `Hide column`. */
  hideColumn?: string
  /** Default `Reset columns`. */
  resetColumns?: string
  /** A column's resize grip. Default `` `Resize ${column}` `` */
  resizeColumn?: (column: string) => string
  /** `<VGridColumnMenu>`'s button. Default `Columns`. */
  columns?: string
  /** `<VGridColumnMenu>`'s search. Default `Filter columns…`. */
  filterColumns?: string
  /** Default `No matching columns`. */
  noMatchingColumns?: string
  /** `<VGridMenu>`'s button, when it has no label. Default `Menu`. */
  menu?: string

  // ── Filters ──
  /** A header's filter button. Default `` `Filter ${column}` `` */
  filterColumn?: (column: string) => string
  /** A header's filter button while its filter is on. Default `` `Filter ${column} (active)` `` */
  filterColumnActive?: (column: string) => string
  /** The filter row's placeholder. Default `Filter…`. */
  filterPlaceholder?: string
  /** A filter row cell showing a filter it can't edit. Default `` `Filter ${column}: ${summary}` `` */
  filterSummary?: (column: string, summary: string) => string
  /** A filter made in the popover, in the filter row. Default `Custom`. */
  customFilter?: string
  /** Values ticked in a value list. Default `` `${count} selected` `` */
  valuesSelected?: (count: number) => string
  /** The condition select of a filter. Default `` `${column}: condition` `` */
  filterCondition?: (column: string) => string
  /** A filter's value input. Default `Value` (labelled `` `${column}: value` ``). */
  filterValue?: string
  /** A range filter's first input. Default `` `${column}: from` `` */
  filterFrom?: (column: string) => string
  /** A range filter's second input. Default `` `${column}: to` `` */
  filterTo?: (column: string) => string
  /** Default `Contains`. */
  opContains?: string
  /** Default `Does not contain`. */
  opNotContains?: string
  /** Default `Equals`. */
  opEquals?: string
  /** Default `Does not equal`. */
  opNotEquals?: string
  /** Default `Starts with`. */
  opStartsWith?: string
  /** Default `Ends with`. */
  opEndsWith?: string
  /** Default `Is empty`. */
  opEmpty?: string
  /** Default `Is not empty`. */
  opNotEmpty?: string
  /** Default `Between`. */
  opBetween?: string
  /** Date filters. Default `On`. */
  opOn?: string
  /** Date filters. Default `Before`. */
  opBefore?: string
  /** Date filters. Default `After`. */
  opAfter?: string
  /** Yes / no filters. Default `Any`. */
  any?: string
  /** Yes / no filters. Default `Yes`. */
  yes?: string
  /** Yes / no filters. Default `No`. */
  no?: string
  /** Yes / no filters, and a value list's empty value. Default `Empty`. */
  emptyValue?: string
  /** A value list's entry for empty values. Default `(Blanks)`. */
  blanks?: string
  /** A value list's search. Default `Search values`. */
  searchValues?: string
  /** A value list's "tick all". Default `All`. */
  all?: string
  /** A value list's "tick all" while searching. Default `All shown`. */
  allShown?: string
  /** Values a long list leaves out. Default `` `${count} more — search to narrow the list` `` */
  moreValues?: (count: number) => string
  /** Default `No matching values`. */
  noMatchingValues?: string
  /** `<VGridSearch>`'s placeholder. Default `Search…`. */
  searchPlaceholder?: string
  /** `<VGridSearch>`'s name for screen readers. Default `Search rows`. */
  searchLabel?: string

  // ── Pager ──
  /** Default `Pagination`. */
  pagination?: string
  /** Default `Rows per page`. */
  rowsPerPage?: string
  /** A page size option. Default `` `${size} / page` `` */
  pageSize?: (size: number) => string
  /** Default `` `${from}–${to} of ${total}` `` (the numbers as text). */
  pageSummary?: (from: string, to: string, total: string) => string
  /** Default `First page`. */
  firstPage?: string
  /** Default `Previous page`. */
  previousPage?: string
  /** Default `Next page`. */
  nextPage?: string
  /** Default `Last page`. */
  lastPage?: string
  /** Default `` `Page ${page}` `` */
  page?: (page: number) => string

  // ── Status bar ──
  /** The status bar's name for screen readers. Default `Grid status`. */
  statusBar?: string
  /**
   * Default `` `${shown} of ${total} rows` `` while filtered, else `` `${shown} rows` `` (`1 row`).
   * `shown` and `total` are formatted; `count` and `totalCount` are the numbers, for plurals.
   */
  rowCount?: (
    shown: string,
    total: string | undefined,
    count: number,
    totalCount: number | undefined,
  ) => string
  /** Format the visible row count. Default `N rows shown` (`1 row shown`). */
  visibleRowCount?: (formatted: string, count: number) => string
  /** Format the app-supplied fully expanded count. Default `N fully expanded`. */
  fullyExpandedCount?: (formatted: string, count: number) => string
  /** Label for the status bar's scroll button. Default `Back to top`. */
  backToTop?: string
  /**
   * Default `` `${count} selected` `` (`All ${count} selected` with all matching rows). `count` is
   * formatted; `amount` is the number, for plurals.
   */
  selectedCount?: (count: string, all: boolean, amount: number) => string
  /** Default `` `${count} filters` `` (`1 filter`). */
  filterCount?: (count: number) => string
  /** The status bar's button. Default `Clear`. */
  clear?: string
  /** Default `Sum`. */
  sum?: string
  /** Default `Average`. */
  average?: string
  /** Default `Min`. */
  min?: string
  /** Default `Max`. */
  max?: string
  /** A selected cell range's size (range selection). Default `` `${count} cells` `` (`1 cell`). */
  cellCount?: (count: number) => string

  // ── Find and replace (range selection) ──
  /** The find bar's name and its search box. Default `Find`. */
  find?: string
  /** The replacement box. Default `Replace with`. */
  replaceWith?: string
  /** Default `Match case`. */
  matchCase?: string
  /** Only cells whose whole text matches. Default `Whole cell`. */
  wholeCell?: string
  /** Search the selected range only. Default `In selection`. */
  inSelection?: string
  /** Default `Next match`. */
  findNext?: string
  /** Default `Previous match`. */
  findPrevious?: string
  /** Shows the replace row. Default `Replace…`. */
  showReplace?: string
  /** Replaces the current match. Default `Replace`. */
  replace?: string
  /** Default `Replace all`. */
  replaceAll?: string
  /** Default `` `${current} of ${total}` `` (numbers formatted). */
  findCount?: (current: string, total: string, count: number) => string
  /** Default `No matches`. */
  noMatches?: string
  /** After replacing. Default `` `${count} replaced` `` (`, ${skipped} left as they were`). */
  replacedCount?: (count: number, skipped: number) => string

  // ── Editing ──
  /** The editor's accessible name. Default `Edit ${column}`. */
  editCell?: (column: string) => string
  /** A number editor holds something else. Default `Enter a number.` */
  editNotANumber?: string
  /** A number editor's value is outside `min` / `max`. Default `Enter a number from ${min} to ${max}.` (or at least / at most). */
  editOutOfRange?: (min: number | undefined, max: number | undefined) => string
  /** `save-cell` rejected without a message. Default `Couldn't save the change.` */
  editSaveFailed?: string
  /** Default `Saving…` (for screen readers while `save-cell` runs). */
  editSaving?: string

  // ── Renderers (a renderer's own `label` options win) ──
  /** `json`'s button. Default `View`. */
  view?: string
  /** Dialogs and popovers. Default `Close`. */
  close?: string
  /** `copy`'s button. Default `Copy` (`` `Copy ${title}` `` with a `title`). */
  copy?: string
  /** Announced after copying. Default `Copied`. */
  copied?: string
  /** `actions-menu`'s button. Default `Actions`. */
  actions?: string
  /** `details`' button. Default `Details`. */
  details?: string
  /** `json-tree`'s toggle. Default `More info`. */
  moreInfo?: string
  /** `list`'s toggle. Default `` `+${count} more` `` */
  moreItems?: (count: number) => string
  /** `list`'s toggle when open. Default `Show less`. */
  showLess?: string
  /** `change` and `multi-line` trends, for screen readers. Default `Increased`. */
  increased?: string
  /** Default `Decreased`. */
  decreased?: string
  /** `icon-toggle`'s name when it has no label. Default `Toggle`. */
  toggle?: string
  /** `edit`'s button, before the column name. Default `Edit`. */
  edit?: string
}

/**
 * Built-in parts a feature adds, each on by default: set one to `false` to leave it out (a slot can
 * replace some instead). App-wide in `createVueGrid({ parts })`, per grid with `:parts`. A column's
 * own options (`resizable`, `reorderable`, `filterable`…) work as before.
 */
export interface GridParts {
  /** The thin bar at the top of the grid while loading. */
  progressBar?: boolean
  /** Server data: the notice above the rows when a request fails while rows are shown (`#load-error`). */
  loadErrorNotice?: boolean
  /** The Retry buttons of load errors and of lazy children that failed. */
  retry?: boolean
  /** The Clear filters button next to the no-match message (`#no-match`). */
  clearFiltersButton?: boolean
  /** Selection: the select-all checkbox in the header. */
  selectAll?: boolean
  /** Selection with server data: the "Select all N rows" banner (`#select-all-banner`). */
  selectAllBanner?: boolean
  /** Filtering: the funnel buttons in `filterable` headers (the filter row and search still work). */
  filterButtons?: boolean
  /** Column resizing: the grips on header edges (the header menu's Fit / Reset width stay). */
  resizeGrips?: boolean
  /** Column reordering: dragging headers (Alt+←/→ and the header menu still move columns). */
  headerDrag?: boolean
  /** Export: Ctrl/⌘+C copying in the grid. */
  copyShortcut?: boolean
  /**
   * Range selection with editing: the fill handle on the selection's corner, and Ctrl/⌘+D
   * (`fillDown()` still works).
   */
  fillHandle?: boolean
  /**
   * Range selection with editing: Delete / Backspace clear the selected cells, Ctrl/⌘+X cuts them
   * (`clearRange()` / `cutRange()` still work).
   */
  clearShortcut?: boolean
  /** Range selection: Ctrl/⌘+F and Ctrl/⌘+H open the find bar (`openFind()` still works). */
  findShortcut?: boolean
  /** Editing: Ctrl/⌘+Z and Ctrl+Y / Ctrl/⌘+Shift+Z (`undo()` / `redo()` still work). */
  undoShortcut?: boolean
  /** Range selection with editing: Ctrl/⌘+V pasting into editable cells (`pasteText()` still works). */
  pasteShortcut?: boolean
  /** Row grouping: the row count on group rows. */
  groupCounts?: boolean
}
