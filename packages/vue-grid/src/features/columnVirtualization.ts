import { useVirtualColumns } from '../composables/useVirtualColumns'
import type { ColumnVirtualizationFeature } from '../types'

/**
 * Column virtualization (`virtual-columns`): for grids with many columns, only the columns in view
 * (plus `overscan`) render their cells, alongside the pinned ones and the checkbox. Every column
 * keeps its place in the CSS grid, so widths, pinning, resizing and sub-grids work as before.
 * Columns sized by their content (`auto`, `min-content`) get a definite width while it's on
 * (`{ width: '10rem' }`). Combines with `virtual` (rows) for large sheets both ways.
 */
export const columnVirtualizationFeature: ColumnVirtualizationFeature = {
  feature: 'columnVirtualization',
  useVirtualColumns,
}
