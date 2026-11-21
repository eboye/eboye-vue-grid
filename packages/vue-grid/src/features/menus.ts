import VGridMenu from '../components/VGridMenu.vue'
import { useGridMenus } from '../composables/useGridMenus'
import type { MenusFeature } from '../types'

/**
 * Context menus: the built-in header menu (sort, filter, pin, move, hide, reset, your own items via
 * `header-menu`) and body-cell menus (`context-menu`), opened by right-click, the ContextMenu key
 * or Shift+F10. Without it the browser's own menu shows. The standalone `<VGridMenu>` and the
 * `actions-menu` renderer don't need it.
 */
export const menusFeature: MenusFeature = { feature: 'menus', useMenus: useGridMenus, Menu: VGridMenu }
