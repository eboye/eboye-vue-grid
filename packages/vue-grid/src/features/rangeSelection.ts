import { defineAsyncComponent } from 'vue'
import { useCellRange } from '../composables/useCellRange'
import type { RangeSelectionFeature } from '../types'

/**
 * Cell-range selection, as in a spreadsheet (`range-selection`, `v-model:range`): drag across cells
 * or Shift+click to select a block, Shift+arrows to extend it (with `keyboardNavigationFeature`),
 * Ctrl/⌘+A for every cell, Esc to clear. Ctrl/⌘+C copies it as tab-separated text, as the cells
 * show it, and the status bar (`statusBarFeature`) shows its count, sum and average. Separate from
 * row selection (`selectable`): both can be on. Ctrl/⌘+F opens a find bar (own chunk, loaded on
 * first use); with the editing feature it replaces too (Ctrl/⌘+H).
 */
const loadFindBar = () => import('../components/VGridFindBar.vue')

export const rangeSelectionFeature: RangeSelectionFeature = {
  feature: 'rangeSelection',
  useCellRange,
  FindBar: /*#__PURE__*/ defineAsyncComponent(loadFindBar),
  preloadFind: loadFindBar,
}
