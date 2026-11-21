import VGridCheckbox from '../components/VGridCheckbox.vue'
import { useGridSelection } from '../composables/useGridSelection'
import type { SelectionFeature } from '../types'

/**
 * Row selection: the `selectable` prop (multi or single), `v-model:selected`, `selection-mode`
 * (cascade through sub-grids), `is-row-selectable`, Space on a row and the select-all checkbox.
 */
export const selectionFeature: SelectionFeature = {
  feature: 'selection',
  useSelection: useGridSelection,
  Checkbox: VGridCheckbox,
}
