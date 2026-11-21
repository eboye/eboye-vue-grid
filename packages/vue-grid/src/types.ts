import type { Component } from 'vue'

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

export interface ColumnState {
  /** Column keys in display order (all known columns, visible or not). */
  order: string[]
  /** Keys of hidden columns. */
  hidden: string[]
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

export type RendererOptions<R> = R extends keyof CellRendererRegistry
  ? CellRendererRegistry[R]
  : Record<string, unknown>

export interface ColumnDef<T = any, R extends RendererName = RendererName> {
  /** Unique, stable column id. Also used for sort state, column state and slot names. */
  key: string
  header?: string
  headerTooltip?: string
  /** Dot path into the row, e.g. `user.address.city`. Defaults to `key`. */
  field?: string
  /** Computes the cell value; wins over `field`. */
  value?: (row: T) => unknown
  /** Renderer name from the registry, or a component. Defaults to `text`. */
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
  pinned?: 'left' | 'right'
  /** Initial visibility (column state wins once it exists). */
  hidden?: boolean
  /** Can the user hide it from the column menu? Default `true`. */
  hideable?: boolean
  /** Can the user move it? Default `true`. */
  reorderable?: boolean
  /** Cell click emits `cell-click` instead of `row-click`. */
  clickable?: boolean
  cellClass?: ClassValue | ((row: T) => ClassValue)
  headerClass?: ClassValue
}

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

export interface VueGridConfig {
  renderers?: CellRendererDefinition[]
  locale?: string
  currency?: string
  timeZone?: string
  density?: Density
}
