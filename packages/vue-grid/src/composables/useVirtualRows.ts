import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { computeVirtualWindow, type VirtualWindow } from '../core/virtual'
import type { VirtualOptions } from '../types'

export interface VirtualRowsOptions {
  root: Ref<HTMLElement | undefined>
  options: () => VirtualOptions | false | undefined
  rowCount: () => number
}

/** Fixed-height row virtualisation: tracks scroll position and viewport height, returns the window. */
export function useVirtualRows(opts: VirtualRowsOptions) {
  const scrollTop = ref(0)
  const viewportHeight = ref(0)
  let scrollFrame = 0
  let resizeObserver: ResizeObserver | undefined

  function onScroll() {
    if (!opts.options()) return
    cancelAnimationFrame(scrollFrame)
    scrollFrame = requestAnimationFrame(() => (scrollTop.value = opts.root.value?.scrollTop ?? 0))
  }

  watch(
    [opts.root, () => !!opts.options()],
    ([el, on]) => {
      resizeObserver?.disconnect()
      if (!el || !on || typeof ResizeObserver === 'undefined') return
      resizeObserver = new ResizeObserver(() => (viewportHeight.value = el.clientHeight))
      resizeObserver.observe(el)
      viewportHeight.value = el.clientHeight
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    cancelAnimationFrame(scrollFrame)
  })

  // Most scroll frames stay inside the same rows: keep the previous object then, so the rows
  // (and everything computed from the window) don't re-render for nothing.
  const window = computed<VirtualWindow | null>((prev) => {
    const v = opts.options()
    if (!v) return null
    const next = computeVirtualWindow({
      scrollTop: scrollTop.value,
      // Before the first measurement, render one screen's worth rather than nothing.
      viewportHeight: viewportHeight.value || 800,
      rowHeight: v.rowHeight,
      rowCount: opts.rowCount(),
      overscan: v.overscan ?? 6,
    })
    return prev &&
      prev.start === next.start &&
      prev.end === next.end &&
      prev.padTop === next.padTop &&
      prev.padBottom === next.padBottom
      ? prev
      : next
  })

  /** Scrolls so the row at `index` is at the top. */
  function scrollToIndex(index: number) {
    const v = opts.options()
    if (v && opts.root.value) opts.root.value.scrollTop = index * v.rowHeight
  }

  return { window, onScroll, scrollToIndex }
}
