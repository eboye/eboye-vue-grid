import VGridSortIcon from '../components/VGridSortIcon.vue'
import VGridSortMarker from '../components/VGridSortMarker.vue'
import { useSorting } from '../composables/useSorting'
import { sortRows } from '../core/sort'
import type { SortingFeature } from '../types'

/**
 * Sorting: the sort button on `sortable` column headers, the sort items of the header menu and,
 * with `sort-mode="client"`, sorting the rows in the browser.
 */
export const sortingFeature: SortingFeature = {
  feature: 'sorting',
  sortRows,
  useSorting,
  SortMarker: VGridSortMarker,
  SortIcon: VGridSortIcon,
}
