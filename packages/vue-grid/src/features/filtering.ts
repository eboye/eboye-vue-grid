import { defineAsyncComponent } from 'vue'
import VGridFilterPopover from '../components/VGridFilterPopover.vue'
import VGridNoMatch from '../components/VGridNoMatch.vue'
import { useGridFilters } from '../composables/useGridFilters'
import type { FilteringFeature } from '../types'

/**
 * Filtering: header funnels with typed filter popovers on `filterable` columns, the filter row,
 * `<VGridSearch>`, the filter items of the header menu, `v-model:filters` and filter persistence.
 * The popover body and the filter-row editors load on demand (own chunks).
 */
export const filteringFeature: FilteringFeature = {
  feature: 'filtering',
  useFilters: useGridFilters,
  FilterButton: VGridFilterPopover,
  NoMatch: VGridNoMatch,
  FilterInput: /*#__PURE__*/ defineAsyncComponent(
    () => import('../components/VGridFilterInput.vue'),
  ),
}
