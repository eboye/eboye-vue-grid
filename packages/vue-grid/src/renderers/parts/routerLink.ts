import { getCurrentInstance, toRaw, type Component } from 'vue'

/**
 * The app's globally registered `RouterLink` (vue-router registers it on `app.use(router)`), or
 * undefined. Looked up directly so the grid has no vue-router dependency and no "failed to resolve
 * component" warning when the app doesn't use a router.
 */
export function useRouterLink(): Component | undefined {
  const component = getCurrentInstance()?.appContext.components.RouterLink
  return component ? toRaw(component) : undefined
}
