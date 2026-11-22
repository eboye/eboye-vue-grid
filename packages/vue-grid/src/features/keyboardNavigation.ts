import { useGridKeyboard } from '../composables/useGridKeyboard'
import type { KeyboardNavigationFeature } from '../types'

/**
 * Keyboard navigation (the ARIA grid pattern): the grid is one tab stop, arrow keys / Home / End /
 * PageUp / PageDown move between cells, Enter activates a cell's control, Space selects a row,
 * →/← expand and collapse, Alt+←/→ move a column, ContextMenu / Shift+F10 open the cell menu.
 *
 * Without it the grid is an ARIA `table`: its own controls (sort buttons, expanders, checkboxes,
 * filter buttons) sit in the normal Tab order instead.
 */
export const keyboardNavigationFeature: KeyboardNavigationFeature = { feature: 'keyboardNavigation', useGridKeyboard }
