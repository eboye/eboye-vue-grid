import VGridPinnedRows from '../components/VGridPinnedRows.vue'
import { usePinnedRows } from '../composables/usePinnedRows'
import type { RowPinningFeature } from '../types'

/**
 * Pinned rows: `v-model:pinned-rows` (`{ top, bottom }` row keys), `pinned-top-rows` /
 * `pinned-bottom-rows` (extra rows that aren't in the data) and the `pinRow()` method. Pinned rows
 * stay in view (sticky) under the header or at the bottom while the body scrolls, and aren't
 * filtered, sorted or paged. Without it, those options are ignored.
 */
export const rowPinningFeature: RowPinningFeature = { feature: 'rowPinning', usePinnedRows, PinnedRows: VGridPinnedRows }
