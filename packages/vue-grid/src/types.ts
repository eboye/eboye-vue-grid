/* eslint-disable @typescript-eslint/no-explicit-any -- `any` defaults (ColumnDef<T = any>, renderer props) let untyped columns and renderers accept any row; createColumnHelper<T>() gives the strict form. */
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

export type PinSide = 'left' | 'right'

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
export type ColumnHelper<T> = <R extends RendererName = 'text'>(def: ColumnDef<T, R>) => ColumnDef<T>

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
}

export interface VueGridConfig {
  renderers?: CellRendererDefinition[]
  locale?: string
  currency?: string
  timeZone?: string
  density?: Density
}
