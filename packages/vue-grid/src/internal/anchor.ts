/**
 * Helpers for CSS anchor positioning. Popovers are placed purely in CSS (`position-anchor` +
 * `position-area` + `position-try-fallbacks`); this module only provides unique anchor names and a
 * JS fallback for browsers without anchor positioning.
 */

let supported: boolean | undefined

export function supportsAnchorPositioning(): boolean {
  supported ??= typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('anchor-name: --vg')
  return supported
}

/** A dashed-ident anchor name derived from a Vue `useId()` value. */
export function anchorNameFor(id: string): string {
  return `--vg-anchor-${id.replace(/[^\w-]/g, '_')}`
}

export type AnchorTarget = HTMLElement | { x: number; y: number }

export type Placement = 'bottom-start' | 'bottom-end' | 'point'

/** JS placement used only when CSS anchor positioning is unavailable. Flips to stay in the viewport. */
export function placeWithoutAnchorSupport(floating: HTMLElement, target: AnchorTarget, placement: Placement) {
  const gap = 4
  const rect =
    target instanceof HTMLElement
      ? target.getBoundingClientRect()
      : new DOMRect(target.x, target.y, 0, 0)
  const pop = floating.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = placement === 'bottom-end' ? rect.right - pop.width : placement === 'point' ? rect.left : rect.left
  if (left + pop.width > vw - gap) left = placement === 'point' ? rect.left - pop.width : vw - gap - pop.width
  left = Math.max(gap, left)

  let top = rect.bottom + (placement === 'point' ? 0 : gap)
  if (top + pop.height > vh - gap) top = rect.top - (placement === 'point' ? 0 : gap) - pop.height
  top = Math.max(gap, top)

  floating.style.left = `${left}px`
  floating.style.top = `${top}px`
}
