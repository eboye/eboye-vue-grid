import { defineAsyncComponent } from 'vue'
import VGridCheckbox from '../components/VGridCheckbox.vue'
import { useGridSelection } from '../composables/useGridSelection'
import type { SelectionFeature } from '../types'

/**
 * Row selection: the `selectable` prop (multi or single), `v-model:selected`, `selection-mode`
 * (cascade through sub-grids), `is-row-selectable`, Space on a row, shift-click (or Shift+Space)
 * for a range, the select-all checkbox, `prune-selection`, and with server data a "select all
 * N matching rows" banner (`v-model:select-all-matching`; it loads on demand, its own chunk).
 */
export const selectionFeature: SelectionFeature = {
  feature: 'selection',
  useSelection: useGridSelection,
  Checkbox: VGridCheckbox,
  Banner: /*#__PURE__*/ defineAsyncComponent(() => import('../components/VGridSelectionBanner.vue')),
}
