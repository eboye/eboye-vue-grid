/* eslint-disable @typescript-eslint/no-explicit-any -- `any` defaults (ColumnDef<T = any>, renderer props) let untyped columns and renderers accept any row; createColumnHelper<T>() gives the strict form. */
import type { Component } from 'vue'
import type { ColumnFilter, FilterState, FilterType } from './core/filter'

export type RowKey = string | number

/** Anything Vue accepts in a `class` binding. */
export type ClassValue = string | Record<string, unknown> | ClassValue[] | null | undefined | false

export type Align = 'start' | 'center' | 'end'
export type SortDir = 'asc' | 'desc'
export type Density = 'compact' | 'cozy' | 'comfortable'

export interface SortState {
  key: string
  dir: SortDir
}

export type PinSide = 'left' | 'right'

export type { ColumnFilter, FilterState, FilterStateStorage, FilterType } from './core/filter'

export interface FilterOption {
  value: unknown
  label?: string
  /** Shown next to the option (e.g. number of rows). */
  count?: number
}

export type FilterOptionsLoader = (search: string, ctx: { signal: AbortSignal }) => Promise<readonly FilterOption[]>

export interface ColumnFilterOptions {
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
}

export interface ColumnStateStorage {
  load(): Partial<ColumnState> | null
  save(state: ColumnState): void
}

/**
 * Augment this interface to register typed renderer names and their options:
 *
 * ```ts
 * declare module '@eboye/vue-grid' {
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
  header?: string
  headerTooltip?: string
  /** Dot path into the row, e.g. `user.address.city`. Defaults to `key`. */
  field?: string
  /** Computes the cell value; wins over `field`. */
  value?: (row: T) => unknown
  /** A renderer definition (`currencyRenderer`), a registered renderer name, or a component. Defaults to `text`. */
  renderer?: R | Component
  rendererOptions?: RendererOptions<R>
  /** Any CSS grid track size. Defaults to `auto`. */
  width?: string
  /** Lower bound; combined with `width` into `minmax(minWidth, width)`. */
  minWidth?: string
  align?: Align
  sortable?: boolean
  sortValue?: (row: T) => unknown
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
  cellClass?: ClassValue | ((row: T) => ClassValue)
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
  /** Plain-text form of the value (tooltips, accessibility, exports). */
  format?: (value: unknown, options: O, ctx: FormatContext) => string
  /** Default filter type for columns using this renderer (default `text`). */
  filterType?: FilterType
}

export interface CellActionEvent<T = any> {
  name: string
  payload: unknown
  row: T
  rowKey: RowKey
  column: ColumnDef<T>
}

export interface CellClickEvent<T = any> {
  row: T
  rowKey: RowKey
  column: ColumnDef<T>
  value: unknown
  event: MouseEvent | KeyboardEvent
}

export type GridPart =
  | 'root'
  | 'header'
  | 'headerCell'
  | 'row'
  | 'cell'
  | 'subgrid'
  | 'detail'
  | 'empty'

export interface VirtualOptions {
  /** Fixed row height in px. */
  rowHeight: number
  /** Extra rows rendered above/below the viewport. Default 6. */
  overscan?: number
}

export type MenuTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'accent'

export interface MenuAction {
  /** Emitted as the action name. */
  name: string
  label: string
  disabled?: boolean
  tone?: MenuTone
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
  row: T
  rowKey: RowKey
  column: ColumnDef<T>
  value: unknown
}

export interface ContextActionEvent<T = any> extends CellContext<T> {
  name: string
  item: MenuAction
}

export interface HeaderMenuContext<T = any> {
  column: ColumnDef<T>
  /** The built-in items (sort, pin, move, hide, reset) for this column. */
  items: MenuItem[]
}

export interface HeaderActionEvent<T = any> {
  name: string
  item: MenuAction
  column: ColumnDef<T>
}

/** Methods exposed on a `<VGrid>` template ref: `const grid = ref<VGridExposed>()`. */
export interface VGridExposed {
  scrollToTop(): void
  scrollToRow(key: RowKey): void
  expandAll(): void
  collapseAll(): void
  setColumnState(state: ColumnState): void
  /**
   * Applies field patches to lazily loaded child rows (`loadSubRows`), which the grid caches and the
   * app can't reach. Top-level and synchronous `subRows` data belong to the app: update them there
   * (assign fields on reactive rows, or use `patchRows`). Returns the number of rows patched.
   */
  patchLoadedRows(patches: ReadonlyMap<RowKey, Record<string, unknown>> | readonly Record<string, unknown>[]): number
  /** Replaces the filter model (also persisted with `filter-storage`). */
  setFilters(state: FilterState): void
  /** Removes every column filter and the search. */
  clearFilters(): void
  /** Opens a column's filter popover. */
  openFilter(key: string): void
  /** Re-runs the `dataSource` with the current query. */
  reload(): Promise<void>
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
}
export interface VirtualScrollingFeature {
  readonly feature: 'virtualScrolling'
  useVirtualRows: typeof import('./composables/useVirtualRows').useVirtualRows
}
export type GridFeature =
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
  renderers?: CellRendererDefinition[]
  /** Features every grid in the app gets (`allFeatures` for all of them). */
  features?: readonly GridFeature[]
  locale?: string
  currency?: string
  timeZone?: string
  density?: Density
}
