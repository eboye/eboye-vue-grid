import { onBeforeUnmount, watch, type Ref } from 'vue'
import { supportsScrollState } from '../internal/supports'

/**
 * JS fallback for `@container scroll-state(scrollable: left | right)`: marks the scroll container
 * with `data-vg-scrollable="left right"` (the physical directions it can still scroll to), so pin
 * shadows appear only while content sits under the pinned columns. Does nothing where CSS can query
 * this itself.
 */
export function useScrollEdges(root: Ref<HTMLElement | undefined>, layoutKey: () => unknown) {
  let observer: ResizeObserver | undefined
  let el: HTMLElement | undefined

  function update() {
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    // RTL scrollLeft runs from 0 (rightmost) to -max; normalise to "distance from the left edge".
    const fromLeft = getComputedStyle(el).direction === 'rtl' ? max + el.scrollLeft : el.scrollLeft
    const value = [fromLeft > 0.5 && 'left', fromLeft < max - 0.5 && 'right']
      .filter(Boolean)
      .join(' ')
    if (el.dataset.vgScrollable !== value) el.dataset.vgScrollable = value
  }

  // Scroll events can fire several times per frame; reading the layout once per frame is enough.
  let frame = 0
  let lastLeft: number | undefined
  function onScroll() {
    if (!el || el.scrollLeft === lastLeft) return // vertical scrolling doesn't move the edges
    lastLeft = el.scrollLeft
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(update)
  }

  function stop() {
    observer?.disconnect()
    cancelAnimationFrame(frame)
    lastLeft = undefined
    el?.removeEventListener('scroll', onScroll)
    if (el) delete el.dataset.vgScrollable
    el = undefined
  }

  watch(
    root,
    (next) => {
      stop()
      if (!next || supportsScrollState()) return
      el = next
      el.addEventListener('scroll', onScroll, { passive: true })
      if (typeof ResizeObserver !== 'undefined') {
        observer ??= new ResizeObserver(update)
        observer.observe(el)
      }
      update()
    },
    { immediate: true, flush: 'post' },
  )
  // Column widths / order changes alter the scroll width without resizing the container.
  watch(layoutKey, update, { flush: 'post' })

  onBeforeUnmount(stop)
}
