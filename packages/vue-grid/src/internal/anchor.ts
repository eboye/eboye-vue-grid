/**
 * Helpers for CSS anchor positioning. Popovers are placed purely in CSS (`position-anchor` +
 * `position-area` + `position-try-fallbacks`); this module only provides unique anchor names and a
 * JS fallback for browsers without anchor positioning.
 */

let supported: boolean | undefined

export function supportsAnchorPositioning(): boolean {
  supported ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('anchor-name: --vg')
  return supported
}

/** A dashed-ident anchor name derived from a Vue `useId()` value. */
export function anchorNameFor(id: string): string {
  return `--vg-anchor-${id.replace(/[^\w-]/g, '_')}`
}

export type AnchorTarget = HTMLElement | { x: number; y: number }

export type Placement = 'bottom-start' | 'bottom-end' | 'point'

/** JS placement used only when CSS anchor positioning is unavailable. Flips to stay in the viewport. */
export function placeWithoutAnchorSupport(
  floating: HTMLElement,
  target: AnchorTarget,
  placement: Placement,
) {
  const gap = 4
  const rect =
    target instanceof HTMLElement
      ? target.getBoundingClientRect()
      : new DOMRect(target.x, target.y, 0, 0)
  const pop = floating.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left =
    placement === 'bottom-end'
      ? rect.right - pop.width
      : placement === 'point'
        ? rect.left
        : rect.left
  if (left + pop.width > vw - gap)
    left = placement === 'point' ? rect.left - pop.width : vw - gap - pop.width
  left = Math.max(gap, left)

  let top = rect.bottom + (placement === 'point' ? 0 : gap)
  if (top + pop.height > vh - gap) top = rect.top - (placement === 'point' ? 0 : gap) - pop.height
  top = Math.max(gap, top)

  floating.style.left = `${left}px`
  floating.style.top = `${top}px`
}

/**
 * JS fallbacks for an open anchored popover, each only where CSS can't do the job:
 * - no CSS anchor positioning → place it now and again on scroll / resize, so it follows its anchor;
 * - hide it (`data-vg-anchor-hidden`) while the anchor element is clipped by a scroll container
 *   (IntersectionObserver applies ancestor clipping). Always, next to CSS
 *   `position-visibility: anchor-visible`: Firefox 159 only parses an older value, and WebKit
 *   (Safari 27) reports support but doesn't hide a popover whose anchor is clipped by the grid's
 *   own scroll container — feature detection can't tell.
 * Returns a cleanup function; call it when the popover closes.
 */
export function trackAnchor(
  floating: HTMLElement,
  target: AnchorTarget,
  placement: Placement,
): () => void {
  const cleanups: (() => void)[] = []

  if (!supportsAnchorPositioning()) {
    let frame = 0
    const place = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => placeWithoutAnchorSupport(floating, target, placement))
    }
    placeWithoutAnchorSupport(floating, target, placement)
    window.addEventListener('scroll', place, { capture: true, passive: true })
    window.addEventListener('resize', place, { passive: true })
    cleanups.push(() => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', place, { capture: true })
      window.removeEventListener('resize', place)
    })
  }

  if (target instanceof HTMLElement && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(([entry]) => {
      floating.toggleAttribute('data-vg-anchor-hidden', !!entry && !entry.isIntersecting)
    })
    io.observe(target)
    cleanups.push(() => {
      io.disconnect()
      floating.removeAttribute('data-vg-anchor-hidden')
    })
  }

  return () => cleanups.splice(0).forEach((fn) => fn())
}
