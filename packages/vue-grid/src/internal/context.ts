/* eslint-disable @typescript-eslint/no-explicit-any -- rows are an opaque, type-erased T inside the grid internals; the public <VGrid generic="T"> API stays fully typed. */
import { inject, type Component, type ComputedRef, type InjectionKey, type Slots } from 'vue'
import type { Align, CellRendererDefinition, ClassValue, ColumnDef, FlashMode, GridPart, RowKey } from '../types'
import type { ColumnFilter, FilterState, FilterType } from '../core/filter'
import type { SelectionSummary } from '../core/selection'
import type { SubRowEntry } from '../composables/useSubRows'
import type { DistinctValue } from '../composables/useGridFilters'
import type { VirtualRowsContext } from '../composables/useVirtualRows'

export const SELECT_COLUMN_KEY = '__vg_select'

/** A visible column with everything the cells need precomputed. */
export interface ResolvedColumn {
  key: string
  kind: 'data' | 'select'
  def: ColumnDef
  component: Component | undefined
  definition: CellRendererDefinition | undefined
  options: Record<string, unknown>
  align: Align
  pinned: 'left' | 'right' | undefined
  /** Last left-pinned or first right-pinned column. Only set where CSS `:has()` is unsupported. */
  pinEdge: boolean
  /** First data column — hosts the expander and the depth indent. */
  isTree: boolean
}

export interface GridContext {
  columns: ComputedRef<ResolvedColumn[]>
  slots: Slots
  ui: ComputedRef<Partial<Record<GridPart, ClassValue>>>
  getKey(row: any): RowKey
  /**
   * Keyboard navigation (ARIA grid) is on: cells are `gridcell`s and the grid's own controls are
   * `tabindex="-1"` (reached with the arrow keys). Off: an ARIA `table` with tabbable controls.
   */
  keyboardNav: boolean
  /** `gridcell` or `cell`, by `keyboardNav`. */
  cellRole: 'gridcell' | 'cell'
  /** Tabindex for the grid's own controls and cells: `-1` with keyboard navigation, else none. */
  rovingTabindex: -1 | undefined
  /** Filters (client mode) and sorts one level of rows. */
  sortRows(rows: readonly any[]): any[]
  /** The sorting feature is on and the column is `sortable`. */
  sortable(col: ColumnDef): boolean
  /** Only with the column resizing feature. */
  resize?: {
    /** The header edge grip component. */
    Handle: Component
    can(col: ColumnDef): boolean
    start(event: PointerEvent, key: string): void
    autosize(key: string): void
    step(key: string, delta: number): void
    /** Has a resized width (or is being resized): its cells clip their content. */
    isSized(key: string): boolean
  }
  /** Header rows above the body (2 with column groups). */
  headerRows: ComputedRef<number>
  /** Pinned rows (and a totals row) above the body: offsets the body's `aria-rowindex`. */
  pinnedTopCount: ComputedRef<number>
  /** Aggregation feature with a totals row: the values by column key, and the row's label. */
  totals?: {
    values: ComputedRef<Record<string, unknown>>
    label: ComputedRef<string>
  }
  /** Row grouping feature, with rows grouped: renders the cells of group rows. */
  grouping?: { GroupCells: Component; isGroup(row: any): boolean }
  // expansion
  /** Rows nest (sub-grids, or grouped rows): the first column has the expander gutter. */
  treeMode: ComputedRef<boolean>
  hasDetail: ComputedRef<boolean>
  canExpand(row: any): boolean
  isExpanded(key: RowKey): boolean
  toggleExpanded(row: any): void
  children(row: any): any[] | undefined
  subRowState(row: any): SubRowEntry | undefined
  ensureSubRows(row: any): void
  retrySubRows(row: any): void
  // selection
  selectMode: ComputedRef<false | 'multi' | 'single'>
  /** The selection checkbox (from the selection feature; only rendered when `selectMode` is set). */
  Checkbox: Component | undefined
  isRowSelectable(row: any): boolean
  rowCheckState(row: any): SelectionSummary
  toggleRow(row: any): void
  // presentation & events
  isHighlighted(key: RowKey): boolean
  rowClass(row: any, index: number): ClassValue
  rowClickable: ComputedRef<boolean>
  /** Grid-wide change highlight (columns may override with `flash`). */
  flash: ComputedRef<FlashMode>
  /** Only with the filtering feature. */
  filters?: {
    FilterButton: Component
    FilterInput: Component
    state: ComputedRef<FilterState>
    setSearch(search: string): void
    setColumnFilter(key: string, filter: ColumnFilter | undefined): void
    isActive(key: string): boolean
    typeOf(col: ColumnDef): FilterType | 'custom'
    /** Show the filter row (inputs inside the header cells). */
    filterRow: ComputedRef<boolean>
    /** Distinct values of a column, for its value-list filter. */
    distinct(key: string): DistinctValue[]
    /** DOM id of a column's filter popover. */
    idFor(key: string): string
    /** Opens a column's filter popover (header menu, filter row). */
    open(key: string): void
  }
  virtual: ComputedRef<boolean>
  /** With the virtual scrolling feature: windowing of each level of rows, and measuring. */
  virtualRows?: VirtualRowsContext
  pinStyle(key: string): Record<string, string> | undefined
  onRowClick(row: any, key: RowKey, event: MouseEvent | KeyboardEvent): void
  onCellClick(row: any, key: RowKey, column: ResolvedColumn, event: MouseEvent | KeyboardEvent): void
  onCellAction(row: any, key: RowKey, column: ResolvedColumn, name: string, payload: unknown): void
  onCellContextMenu(row: any, key: RowKey, column: ResolvedColumn, event: MouseEvent, el: HTMLElement): void
  onHeaderContextMenu(column: ResolvedColumn, event: MouseEvent, el: HTMLElement): void
  /** Menus feature: a `pointerdown` on a body cell (touch: hold for its menu). */
  onCellPointerDown?(row: any, key: RowKey, column: ResolvedColumn, event: PointerEvent, el: HTMLElement): void
}

/** A row in a pinned section: a pinned data row, or the totals row. */
export interface PinnedRowItem {
  /** Unique within the grid's pinned rows. */
  id: string
  kind: 'row' | 'total'
  row: any
  key: RowKey
  /** Shows the selection checkbox (pinned rows of the data, not the app's extra rows). */
  selectable: boolean
}

export const GRID_CONTEXT_KEY: InjectionKey<GridContext> = Symbol('vue-grid:context')

export function useInternalGrid(): GridContext {
  const ctx = inject(GRID_CONTEXT_KEY)
  if (!ctx) throw new Error('[vue-grid] internal component used outside <VGrid>')
  return ctx
}
