import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'

interface PinnedColumn {
  key: string
  pinned: 'left' | 'right' | undefined
}

/**
 * Measures header cells of pinned columns with a single ResizeObserver and returns cumulative
 * sticky offsets (px) per column key. Nothing is measured during render.
 */
export function usePinnedOffsets(root: Ref<HTMLElement | undefined>, columns: () => PinnedColumn[]) {
  const offsets = shallowRef<Record<string, number>>({})
  let observer: ResizeObserver | undefined
  let frame = 0

  const headerCell = (key: string) =>
    root.value?.querySelector<HTMLElement>(`:scope > .vg-header > [data-col-key="${CSS.escape(key)}"]`)

  function measure() {
    const cols = columns()
    const next: Record<string, number> = {}
    let left = 0
    for (const col of cols) {
      if (col.pinned !== 'left') continue
      next[col.key] = left
      left += headerCell(col.key)?.getBoundingClientRect().width ?? 0
    }
    let right = 0
    for (const col of [...cols].reverse()) {
      if (col.pinned !== 'right') continue
      next[col.key] = right
      right += headerCell(col.key)?.getBoundingClientRect().width ?? 0
    }
    const prev = offsets.value
    const changed =
      Object.keys(next).length !== Object.keys(prev).length ||
      Object.entries(next).some(([k, v]) => prev[k] !== v)
    if (changed) offsets.value = next
  }

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }

  function observe() {
    observer?.disconnect()
    const pinned = columns().filter((c) => c.pinned)
    if (!pinned.length || typeof ResizeObserver === 'undefined') {
      if (Object.keys(offsets.value).length) offsets.value = {}
      return
    }
    observer ??= new ResizeObserver(schedule)
    for (const col of pinned) {
      const el = headerCell(col.key)
      if (el) observer.observe(el)
    }
    measure()
  }

  watch(
    () => [root.value, columns().map((c) => `${c.key}:${c.pinned ?? ''}`).join('|')],
    observe,
    { flush: 'post', immediate: true },
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
  })

  return offsets
}
