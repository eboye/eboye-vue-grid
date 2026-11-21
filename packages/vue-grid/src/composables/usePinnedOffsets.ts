import { onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import { trackSize } from '../core/columns'

interface PinnedColumn {
  key: string
  pinned: 'left' | 'right' | undefined
  def: { width?: string; minWidth?: string }
}

/** A grid track whose size is a definite length, so it can be summed in `calc()`. */
const FIXED_TRACK =
  /^(?:0|-?\d*\.?\d+(?:px|r?em|r?lh|ch|ex|cap|ic|vw|vh|vi|vb|vmin|vmax|cm|mm|q|in|pt|pc)|var\(--[\w-]+\))$/i

export function isFixedTrack(col: PinnedColumn['def']): boolean {
  return FIXED_TRACK.test(trackSize(col).trim())
}

/** Sticky offsets per column key from the declared widths, or null if any of them depends on content. */
export function cssPinOffsets(columns: readonly PinnedColumn[]): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const side of ['left', 'right'] as const) {
    const group = columns.filter((c) => c.pinned === side)
    if (side === 'right') group.reverse()
    const before: string[] = []
    for (const col of group) {
      out[col.key] = before.length ? `calc(${before.join(' + ')})` : '0px'
      // The outermost column's own width never offsets anything, so only inner ones must be fixed.
      if (col !== group[group.length - 1]) {
        if (!isFixedTrack(col.def)) return null
        before.push(trackSize(col.def).trim())
      }
    }
  }
  return out
}

/**
 * Sticky offsets (CSS values) per pinned column key.
 *
 * CSS first: when the pinned columns have definite widths (`8rem`, `120px`, `var(--x)`), offsets are
 * plain `calc()` sums of those widths — nothing is measured and the browser keeps them right on zoom,
 * font or density changes. Only when an inner pinned column is content-sized (`auto`, `fr`,
 * `min-content`, `minmax()`) are header cells measured, with one ResizeObserver.
 */
export function usePinnedOffsets(
  root: Ref<HTMLElement | undefined>,
  columns: () => PinnedColumn[],
) {
  const offsets = shallowRef<Record<string, string>>({})
  let observer: ResizeObserver | undefined
  let frame = 0

  const headerCell = (key: string) =>
    root.value?.querySelector<HTMLElement>(
      `:scope > .vg-header > [data-col-key="${CSS.escape(key)}"]`,
    )

  function set(next: Record<string, string>) {
    const prev = offsets.value
    const changed =
      Object.keys(next).length !== Object.keys(prev).length ||
      Object.entries(next).some(([k, v]) => prev[k] !== v)
    if (changed) offsets.value = next
  }

  function measure() {
    const cols = columns()
    const next: Record<string, string> = {}
    for (const side of ['left', 'right'] as const) {
      const group = cols.filter((c) => c.pinned === side)
      if (side === 'right') group.reverse()
      let sum = 0
      for (const col of group) {
        next[col.key] = `${sum}px`
        sum += headerCell(col.key)?.getBoundingClientRect().width ?? 0
      }
    }
    set(next)
  }

  function schedule() {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measure)
  }

  function update() {
    observer?.disconnect()
    const cols = columns()
    const fromCss = cssPinOffsets(cols)
    if (fromCss) return set(fromCss)
    // JS fallback: content-sized pinned columns.
    if (typeof ResizeObserver === 'undefined') return set({})
    observer ??= new ResizeObserver(schedule)
    for (const col of cols.filter((c) => c.pinned)) {
      const el = headerCell(col.key)
      if (el) observer.observe(el)
    }
    measure()
  }

  watch(
    () => [
      root.value,
      columns()
        .map((c) => `${c.key}:${c.pinned ?? ''}:${c.pinned ? trackSize(c.def) : ''}`)
        .join('|'),
    ],
    update,
    { flush: 'post', immediate: true },
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
  })

  return offsets
}
