import VGridPinnedRows from '../components/VGridPinnedRows.vue'
import { useTotals } from '../composables/useTotals'
import type { AggregationFeature } from '../types'

/**
 * Aggregates and the totals row: columns with an `aggregate` (`sum`, `avg`, `min`, `max`, `count` or
 * a function) and `totals` (`true` / `'bottom'` or `'top'`) show a sticky totals row over the rows
 * that pass the filters, on every page. `aggregates` supplies the values instead (e.g. from a
 * server). Without it, `aggregate` and `totals` are ignored.
 */
export const aggregationFeature: AggregationFeature = {
  feature: 'aggregation',
  useTotals,
  PinnedRows: VGridPinnedRows,
}
