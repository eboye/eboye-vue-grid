import type {
  ColumnPinningFeature,
  ColumnReorderFeature,
  ColumnVisibilityFeature,
  FilteringFeature,
  GridFeature,
  MenusFeature,
  PaginationFeature,
  SelectionFeature,
  ServerDataFeature,
  SortingFeature,
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
}

/** Merges feature lists (app-wide, then per grid); a later entry with the same name wins. */
export function resolveFeatures(...lists: (readonly GridFeature[] | undefined)[]): FeatureSet {
  const set: Record<string, GridFeature> = {}
  for (const list of lists) for (const f of list ?? []) set[f.feature] = f
  return set as FeatureSet
}
