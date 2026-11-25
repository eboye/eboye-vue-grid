import { defineAsyncComponent } from 'vue'
import { useEditing } from '../composables/useEditing'
import type { EditingFeature } from '../types'

/**
 * Inline cell editing: `editable` columns open an editor in the cell on double-click, Enter / F2
 * or typing (text, number, date, date-time, select, checkbox, or your own component). Enter saves,
 * Tab saves and edits the next editable cell, Esc cancels. The grid emits `cell-edit` and your
 * handler changes the data; `save-cell` may return a Promise, whose rejection keeps the editor open
 * with the error. The editor loads on demand (own chunk).
 */
const loadEditor = () => import('../components/VGridCellEditor.vue')

export const editingFeature: EditingFeature = {
  feature: 'editing',
  useEditing,
  Editor: /*#__PURE__*/ defineAsyncComponent(loadEditor),
  preload: loadEditor,
}
