import { useVirtualRows } from '../composables/useVirtualRows'
import type { VirtualScrollingFeature } from '../types'

/**
 * Virtual scrolling: `:virtual="{ rowHeight, overscan? }"` renders only the rows in view (plus
 * `overscan`), so tens of thousands of fixed-height rows stay fast. Without it, `virtual` is
 * ignored and every row renders.
 */
export const virtualScrollingFeature: VirtualScrollingFeature = { feature: 'virtualScrolling', useVirtualRows }
