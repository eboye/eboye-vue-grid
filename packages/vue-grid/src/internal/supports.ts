/**
 * CSS feature checks deciding when a JS fallback is needed. Everything the grid can do in CSS it does
 * in CSS; these only gate the fallbacks. All return `true` during SSR (no `CSS` global), so the
 * server never renders fallback state.
 */
const cache = new Map<string, boolean>()

function check(id: string, test: () => boolean): boolean {
  let v = cache.get(id)
  if (v === undefined) {
    v = typeof CSS === 'undefined' || typeof CSS.supports !== 'function' ? true : test()
    cache.set(id, v)
  }
  return v
}

/** `:has()` — used to find the pinned-column edge in CSS. */
export const supportsHas = () => check('has', () => CSS.supports('selector(:has(+ *))'))

/** Scroll-state container queries — show pin shadows only while content is scrolled under them. */
export const supportsScrollState = () =>
  check('scroll-state', () => CSS.supports('container-type: scroll-state'))

/**
 * Hiding an anchored popover once its anchor is clipped. Checked via the current value name: engines
 * that only parse the old `anchors-visible` (Firefox 159) parse it without hiding anything.
 */
export const supportsAnchorVisibility = () =>
  check('anchor-visible', () => CSS.supports('position-visibility: anchor-visible'))

/** Relative colour syntax — picks readable chip text in CSS. */
export const supportsRelativeColor = () =>
  check('relative-color', () => CSS.supports('color: oklch(from red l c h)'))
