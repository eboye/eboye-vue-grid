import type { GridFeature } from '../types'
import { aggregationFeature } from './aggregation'
import { columnGroupsFeature } from './columnGroups'
import { columnPinningFeature } from './columnPinning'
import { columnResizingFeature } from './columnResizing'
import { columnReorderFeature } from './columnReorder'
import { columnVisibilityFeature } from './columnVisibility'
import { exportFeature } from './export'
import { filteringFeature } from './filtering'
import { keyboardNavigationFeature } from './keyboardNavigation'
import { menusFeature } from './menus'
import { paginationFeature } from './pagination'
import { rowGroupingFeature } from './rowGrouping'
import { rowPinningFeature } from './rowPinning'
import { selectionFeature } from './selection'
import { serverDataFeature } from './serverData'
import { sortingFeature } from './sorting'
import { statusBarFeature } from './statusBar'
import { subGridsFeature } from './subGrids'
import { virtualScrollingFeature } from './virtualScrolling'

export {
  aggregationFeature,
  columnGroupsFeature,
  columnPinningFeature,
  columnReorderFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  exportFeature,
  filteringFeature,
  keyboardNavigationFeature,
  menusFeature,
  paginationFeature,
  rowGroupingFeature,
  rowPinningFeature,
  selectionFeature,
  serverDataFeature,
  sortingFeature,
  statusBarFeature,
  subGridsFeature,
  virtualScrollingFeature,
}

/** Every built-in feature, for apps that want them all: `createVueGrid({ features: allFeatures })`. */
export const allFeatures: readonly GridFeature[] = [
  sortingFeature,
  filteringFeature,
  serverDataFeature,
  paginationFeature,
  selectionFeature,
  subGridsFeature,
  menusFeature,
  columnReorderFeature,
  columnPinningFeature,
  virtualScrollingFeature,
  columnVisibilityFeature,
  keyboardNavigationFeature,
  columnResizingFeature,
  columnGroupsFeature,
  rowPinningFeature,
  aggregationFeature,
  rowGroupingFeature,
  exportFeature,
  statusBarFeature,
]
