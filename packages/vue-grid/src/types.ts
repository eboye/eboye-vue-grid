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
  /**
   * Header group label (column groups feature): adjacent visible columns with the same `group`
   * share one header cell above their own headers.
   */
  group?: string
  /** Cell and header alignment (default: the renderer's, e.g. `end` for numbers, else `start`). */
  align?: Align
  /** A sort button in the header (sorting feature). Client sorting needs `sort-mode="client"`. */
  sortable?: boolean
  /** The value client sorting compares (default: the renderer's sort value, else the cell value). */
  sortValue?: (row: T) => unknown
  /** A full comparator for client sorting; wins over `sortValue`. */
  sortFn?: (a: T, b: T) => number
  /** Initial pin side (the header menu can change it at runtime unless `pinnable: false`). */
  pinned?: PinSide
  /** Can the user pin/unpin it from the header menu? Default `true`. */
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
  /** Fixed row height in px. */
  rowHeight: number
  /** Extra rows rendered above/below the viewport. Default 6. */
  overscan?: number
  /**
   * Estimated height in px of a detail row (`#detail` slot) until it has been rendered and
   * measured. Default 4 × `rowHeight`. Data rows always have `rowHeight`.
   */
  detailHeight?: number
}

export type MenuTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'accent'

export interface MenuAction {
  /** Emitted as the action name. */
  name: string
  /** Text of the item. */
  label: string
  /** Shown but can’t be chosen. */
  disabled?: boolean
  /** Colour, e.g. `danger` for a delete item. */
  tone?: MenuTone
  /** An icon component before the label. */
  icon?: Component
  /** Shown right-aligned, e.g. a shortcut hint. */
  hint?: string
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
export interface VGridExposed {
  /** Scrolls the grid back to its first row. */
  scrollToTop(): void
  /** Scrolls a row (top-level or nested, also in virtual mode) into view. */
  scrollToRow(key: RowKey): void
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
   * Copies rows to the clipboard as tab-separated text (pastes as cells into spreadsheets): the
   * selected rows by default, as displayed, no header. Resolves `false` if nothing was copied.
   * Export feature.
   */
  copyRows(options?: ExportOptions): Promise<boolean>
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

/** Something was copied to the clipboard (export feature): rows (`copyRows`, Ctrl+C) or one cell. */
export interface CopyEvent<T = any> {
  kind: 'rows' | 'cell'
  text: string
  rows: readonly T[]
  columns: readonly ColumnDef<T>[]
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
}

/** One `summary` column of the status bar: its aggregates over the selected rows. */
export interface StatusBarSummary {
  key: string
  /** The column's header (or key). */
  label: string
  /** Each aggregate with its value and the text shown (formatted like the column's cells). */
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
  clearFilters: () => void
}

// ── Features (opt-in, tree-shakeable) ─────────────────────────────────────────────────────────
// A grid only gets the features you register — per grid (`<VGrid :features>`) or app-wide
// (`createVueGrid({ features })`) — and only those reach your bundle.

export interface SortingFeature {
  readonly feature: 'sorting'
  sortRows: typeof import('./core/sort').sortRows
}
export interface FilteringFeature {
  readonly feature: 'filtering'
  useFilters: typeof import('./composables/useGridFilters').useGridFilters
  /** The header funnel and its popover. */
  FilterButton: Component
  /** The filter-row editor. */
  FilterInput: Component
}
export interface ServerDataFeature {
  readonly feature: 'serverData'
  useDataSource: typeof import('./composables/useDataSource').useDataSource
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
export interface StatusBarFeature {
  readonly feature: 'statusBar'
  useStatusBar: typeof import('./composables/useStatusBar').useStatusBar
  /** The status bar's default content. */
  StatusBar: Component
}
export type GridFeature =
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
}
