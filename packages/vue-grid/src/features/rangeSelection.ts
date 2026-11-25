import { useCellRange } from '../composables/useCellRange'
import type { RangeSelectionFeature } from '../types'

/**
 * Cell-range selection, as in a spreadsheet (`range-selection`, `v-model:range`): drag across cells
 * or Shift+click to select a block, Shift+arrows to extend it (with `keyboardNavigationFeature`),
 * Ctrl/⌘+A for every cell, Esc to clear. Ctrl/⌘+C copies it as tab-separated text, as the cells
 * show it, and the status bar (`statusBarFeature`) shows its count, sum and average. Separate from
 * row selection (`selectable`): both can be on.
 */
export const rangeSelectionFeature: RangeSelectionFeature = {
  feature: 'rangeSelection',
  useCellRange,
}
