import { defineAsyncComponent } from 'vue'
import type { PaginationFeature } from '../types'

/**
 * Built-in pagination: the `pagination` prop and `v-model:page` / `v-model:page-size`. Pages the
 * client rows, or asks the `dataSource` for pages. The pager loads on demand (own chunk).
 *
 * Not needed for the standalone `<VGridPagination>` component.
 */
export const paginationFeature: PaginationFeature = {
  feature: 'pagination',
  Pagination: /*#__PURE__*/ defineAsyncComponent(() => import('../components/VGridPagination.vue')),
}
