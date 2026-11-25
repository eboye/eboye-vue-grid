import { useRowReorder } from '../composables/useRowReorder'
import type { RowReorderFeature } from '../types'

/**
 * Row reordering (`row-reorder`): a handle column to drag rows by (mouse, pen, touch), and
 * Alt+↑ / Alt+↓ on a row's cells. Rows move among their siblings (a nested row stays under its
 * parent). Controlled, like editing: the grid emits `row-move` and your handler moves the row
 * (`moveRow(rows, event)`). The handles are off while rows are sorted or grouped.
 */
export const rowReorderFeature: RowReorderFeature = {
  feature: 'rowReorder',
  useRowReorder,
}
