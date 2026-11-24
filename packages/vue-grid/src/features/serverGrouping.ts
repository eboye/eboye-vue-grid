import { useServerGroups } from '../composables/useServerGroups'
import type { ServerGroupingFeature } from '../types'

/**
 * Row grouping with server data: with `group-by` and a `data-source`, the query carries `groupBy` and
 * `groupPath`, the server answers with groups (value, count, aggregates), and each group's contents
 * load when it expands. A group's checkbox selects it by query (`v-model:selected-groups`), without
 * loading its rows. Needs the row grouping and server data features too. Without it, a grouped
 * server grid groups only the rows it has loaded.
 */
export const serverGroupingFeature: ServerGroupingFeature = {
  feature: 'serverGrouping',
  useServerGroups,
}
