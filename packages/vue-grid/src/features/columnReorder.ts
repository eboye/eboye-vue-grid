import { moveColumn, moveColumnRelative } from '../core/columns'
import { useColumnDrag } from '../composables/useColumnDrag'
import type { ColumnReorderFeature } from '../types'

/**
 * Column reordering: drag a header (mouse, pen, touch), Alt+←/→ on a focused header, and the header
 * menu's Move left / Move right. Columns opt out with `reorderable: false`. The order is part of
 * `v-model:column-state` and persisted with `storage`; `<VGridColumnMenu>` works without it.
 */
export const columnReorderFeature: ColumnReorderFeature = {
  feature: 'columnReorder',
  useColumnDrag,
  moveColumn,
  moveColumnRelative,
}
