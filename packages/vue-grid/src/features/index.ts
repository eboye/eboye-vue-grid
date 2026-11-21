import type { GridFeature } from '../types'
import { columnPinningFeature } from './columnPinning'
import { columnReorderFeature } from './columnReorder'
import { filteringFeature } from './filtering'
import { menusFeature } from './menus'
import { paginationFeature } from './pagination'
import { selectionFeature } from './selection'
import { serverDataFeature } from './serverData'
import { sortingFeature } from './sorting'
import { subGridsFeature } from './subGrids'
import { virtualScrollingFeature } from './virtualScrolling'

export {
  columnPinningFeature,
  columnReorderFeature,
  filteringFeature,
  menusFeature,
  paginationFeature,
  selectionFeature,
  serverDataFeature,
  sortingFeature,
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
]
