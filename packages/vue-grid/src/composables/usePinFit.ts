import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'

export interface PinFitOptions {
  /** The `pinned-max-share` prop: the largest share of the grid's width pinned columns may take. */
  share: () => number | false
  /** Keys of the columns pinned in the column state (the selection column included). */
  pinnedKeys: () => readonly string[]
}

/**
 * Pinned columns only make sense with room left to scroll the rest. While the pinned columns
 * together are wider than `share` of the grid's width (a phone, a narrow side panel), they scroll
 * like the others: `dropped` turns true. The pins themselves stay in the column state; they apply
 * again once the grid is wide enough. Measured with one ResizeObserver on the grid and the pinned
 * header cells (pinning doesn't change their size, so this can't flip back and forth).
 */
export function usePinFit(root: Ref<HTMLElement | undefined>, opts: PinFitOptions) {
  const dropped = shallowRef(false)
  let observer: ResizeObserver | undefined
  let frame = 0

  const headerCell = (key: string) =>
    root.value?.querySelector<HTMLElement>(
      `:scope > .vg-header > [data-col-key="${CSS.escape(key)}"]`,
    )

  function measure() {
    const el = root.value
    const share = opts.share()
    const keys = opts.pinnedKeys()
    if (!el || share === false || !keys.length) {
      dropped.value = false
      return
    }
    const width = el.clientWidth
    if (!width) return // not laid out (hidden, or no layout engine): keep the current state
    let pinned = 0
    for (const key of keys) pinned += headerCell(key)?.getBoundingClientRect().width ?? 0
    dropped.value = pinned > share * width
  }

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }

  watch(
    [root, opts.share, () => JSON.stringify(opts.pinnedKeys())],
    ([el, share]) => {
      observer?.disconnect()
      if (!el || share === false || typeof ResizeObserver === 'undefined') return measure()
      observer ??= new ResizeObserver(schedule)
      observer.observe(el)
      for (const key of opts.pinnedKeys()) {
        const cell = headerCell(key)
        if (cell) observer.observe(cell)
      }
      measure()
    },
    { flush: 'post', immediate: true },
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
  })

  return { dropped }
}
