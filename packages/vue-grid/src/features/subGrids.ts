import { useSubRows } from '../composables/useSubRows'
import type { SubGridsFeature } from '../types'

/**
 * Sub-grids: nested child rows in a CSS `subgrid`, from `sub-rows` (synchronous) or `load-sub-rows`
 * (lazy, cached, with loading / error / retry). Detail rows (`#detail` slot) don't need it.
 */
export const subGridsFeature: SubGridsFeature = { feature: 'subGrids', useSubRows }
