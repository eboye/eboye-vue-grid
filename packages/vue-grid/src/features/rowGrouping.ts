import VGridGroupCells from '../components/VGridGroupCells.vue'
import { useRowGrouping } from '../composables/useRowGrouping'
import type { RowGroupingFeature } from '../types'

/**
 * Row grouping: `v-model:group-by="['region', 'status']"` groups the rows by those columns into
 * collapsible group rows with their value, row count and the aggregates of columns with an
 * `aggregate`. Columns with `groupable: true` get Group by / Ungroup items in the header menu.
 * Without it, `group-by` is ignored.
 */
export const rowGroupingFeature: RowGroupingFeature = {
  feature: 'rowGrouping',
  useRowGrouping,
  GroupCells: VGridGroupCells,
}
