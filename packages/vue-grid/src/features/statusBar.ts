import { defineAsyncComponent } from 'vue'
import { useStatusBar } from '../composables/useStatusBar'
import type { StatusBarFeature } from '../types'

/**
 * A status bar under the grid (`status-bar`): how many rows pass the filters ("84 of 200 rows"),
 * how many are selected, how many filters are on (with Clear), and with `{ summary: ['total'] }`
 * the sum and average of those columns over the selected rows, as the cells show them. The
 * `#status-bar` slot replaces its content. Its component loads on demand (own chunk).
 */
export const statusBarFeature: StatusBarFeature = {
  feature: 'statusBar',
  useStatusBar,
  StatusBar: /*#__PURE__*/ defineAsyncComponent(() => import('../components/VGridStatusBar.vue')),
}
