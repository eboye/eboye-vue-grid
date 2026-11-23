import { useVirtualRows } from '../composables/useVirtualRows'
import type { VirtualScrollingFeature } from '../types'

/**
 * Virtual scrolling: `:virtual="{ rowHeight, overscan?, detailHeight? }"` renders only the rows in
 * view (plus `overscan`), so tens of thousands of rows stay fast — sub-grids and detail rows
 * included, inside the same CSS grid / subgrid layout. Without it, `virtual` is ignored and every
 * row renders.
 */
export const virtualScrollingFeature: VirtualScrollingFeature = { feature: 'virtualScrolling', useVirtualRows }
