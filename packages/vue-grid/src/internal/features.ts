import type {
  AggregationFeature,
  AttributesFeature,
  ColumnVirtualizationFeature,
  ExportFeature,
  RowGroupingFeature,
  RowPinningFeature,
  ColumnGroupsFeature,
  ColumnPinningFeature,
  ColumnResizingFeature,
  ColumnReorderFeature,
  ColumnVisibilityFeature,
  FilteringFeature,
  KeyboardNavigationFeature,
  GridFeature,
  MenusFeature,
  PaginationFeature,
  RangeSelectionFeature,
  SelectionFeature,
  ServerDataFeature,
  ServerGroupingFeature,
  SortingFeature,
  StatusBarFeature,
  EditingFeature,
  SubGridsFeature,
  VirtualScrollingFeature,
} from '../types'

/** The features a grid has, by name. */
export interface FeatureSet {
  sorting?: SortingFeature
  filtering?: FilteringFeature
  serverData?: ServerDataFeature
  pagination?: PaginationFeature
  selection?: SelectionFeature
  subGrids?: SubGridsFeature
  menus?: MenusFeature
  columnReorder?: ColumnReorderFeature
  columnPinning?: ColumnPinningFeature
  virtualScrolling?: VirtualScrollingFeature
  columnVisibility?: ColumnVisibilityFeature
  keyboardNavigation?: KeyboardNavigationFeature
  columnResizing?: ColumnResizingFeature
  columnGroups?: ColumnGroupsFeature
  rowPinning?: RowPinningFeature
  aggregation?: AggregationFeature
  rowGrouping?: RowGroupingFeature
  export?: ExportFeature
  statusBar?: StatusBarFeature
  editing?: EditingFeature
  serverGrouping?: ServerGroupingFeature
  rangeSelection?: RangeSelectionFeature
  attributes?: AttributesFeature
  columnVirtualization?: ColumnVirtualizationFeature
}

/** Merges feature lists (app-wide, then per grid); a later entry with the same name wins. */
export function resolveFeatures(...lists: (readonly GridFeature[] | undefined)[]): FeatureSet {
  const set: Record<string, GridFeature> = {}
  for (const list of lists) for (const f of list ?? []) set[f.feature] = f
  return set as FeatureSet
}
