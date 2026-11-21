import { usePinnedOffsets } from '../composables/usePinnedOffsets'
import { useScrollEdges } from '../composables/useScrollEdges'
import type { ColumnPinningFeature } from '../types'

/**
 * Pinned columns: `pinned: 'left' | 'right'` columns stay put (sticky) while the grid scrolls
 * sideways, with edge shadows; runtime pins from the header menu (Pin left / Pin right / Unpin) are
 * kept in `v-model:column-state` and persisted with `storage`. Without it, pins are ignored.
 */
export const columnPinningFeature: ColumnPinningFeature = {
  feature: 'columnPinning',
  usePinnedOffsets,
  useScrollEdges,
}
