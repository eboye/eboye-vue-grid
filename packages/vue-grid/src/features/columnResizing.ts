import VGridResizeHandle from '../components/VGridResizeHandle.vue'
import { useColumnResize } from '../composables/useColumnResize'
import type { ColumnResizingFeature } from '../types'

/**
 * Column resizing: drag a header's edge (mouse, pen, touch), use ←/→ on the focused edge
 * (Alt+Shift+←/→ on a header with keyboard navigation), or double-click the edge to fit the content.
 * `minWidth` / `maxWidth` bound it; columns opt out with `resizable: false`. Widths are kept in
 * `columnState.widths` and persisted with `storage`. The header menu gains Fit width / Reset width.
 */
export const columnResizingFeature: ColumnResizingFeature = {
  feature: 'columnResizing',
  useColumnResize,
  Handle: VGridResizeHandle,
}
