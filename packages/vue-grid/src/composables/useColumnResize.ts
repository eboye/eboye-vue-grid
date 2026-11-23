import { nextTick, onBeforeUnmount, shallowRef, type Ref } from 'vue'
import { setColumnWidth } from '../core/columns'
import type { ColumnDef, ColumnState } from '../types'

export interface ColumnResizeOptions {
  root: Ref<HTMLElement | undefined>
  /** The column definition (for `minWidth` / `maxWidth`). */
  defOf: (key: string) => ColumnDef | undefined
  /** The current column state, and how to store a new one (widths go into `widths`). */
  state: () => ColumnState
  setState: (state: ColumnState) => void
}

/** Smallest width a column can be resized to when it has no `minWidth`. */
const DEFAULT_MIN = 40

/**
 * Column resizing: drag a header's edge (pointer events: mouse, pen, touch), step it from the
 * keyboard, or auto-fit it to its content. While dragging, the width is a live override applied to
 * the grid template; it is committed to column state on release.
 */
export function useColumnResize(opts: ColumnResizeOptions) {
  /** The width being dragged (or measured), applied before it is committed. */
  const live = shallowRef<{ key: string; width: string } | null>(null)
  /** Key of the column being dragged. */
  const resizing = shallowRef<string | null>(null)
  let frame = 0
  let stop = () => {}
  onBeforeUnmount(() => {
    stop()
    cancelAnimationFrame(frame)
  })
  /** Stores a width (`null` = back to the column's own `width`). */
  const commit = (key: string, width: string | null) => opts.setState(setColumnWidth(opts.state(), key, width))

  const headerCell = (key: string) =>
    opts.root.value?.querySelector<HTMLElement>(`:scope > .vg-header > [data-col-key="${CSS.escape(key)}"]`)

  /** A CSS length in px, measured in the grid (so `rem`, `ch`, `%`… resolve like the cells do). */
  function toPx(length: string | undefined): number | undefined {
    const root = opts.root.value
    if (!length || !root) return undefined
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;visibility:hidden;inline-size:${length};block-size:0`
    root.append(probe)
    const px = probe.getBoundingClientRect().width
    probe.remove()
    return px > 0 ? px : undefined
  }

  /** The column's limits in px. Measuring forces a layout, so a drag resolves them once, up front. */
  function limits(key: string) {
    const def = opts.defOf(key)
    const min = toPx(def?.minWidth) ?? DEFAULT_MIN
    const max = toPx(def?.maxWidth) ?? Number.POSITIVE_INFINITY
    return { min, max: Math.max(min, max) }
  }
  const clampTo = ({ min, max }: { min: number; max: number }, px: number) =>
    Math.round(Math.min(Math.max(Number.isFinite(px) ? px : min, min), max))
  const clamp = (key: string, px: number) => clampTo(limits(key), px)

  const currentWidth = (key: string) => headerCell(key)?.getBoundingClientRect().width ?? 0

  function onPointerDown(event: PointerEvent, key: string) {
    if (event.button !== 0) return
    const handle = event.currentTarget as HTMLElement
    event.preventDefault()
    event.stopPropagation() // not a column drag, not a sort click
    const start = currentWidth(key)
    const startX = event.clientX
    const rtl = opts.root.value ? getComputedStyle(opts.root.value).direction === 'rtl' : false
    const bounds = limits(key)
    let width = start
    let moved = false
    resizing.value = key
    handle.setPointerCapture?.(event.pointerId)

    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - startX) * (rtl ? -1 : 1)
      if (!moved && Math.abs(dx) < 2) return
      moved = true
      width = clampTo(bounds, start + dx)
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => (live.value = { key, width: `${width}px` }))
    }
    const onEnd = () => {
      stop()
      cancelAnimationFrame(frame)
      if (moved) commit(key, `${width}px`)
      live.value = null
      resizing.value = null
    }
    stop = () => {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onEnd)
      handle.removeEventListener('pointercancel', onEnd)
      handle.removeEventListener('lostpointercapture', onEnd)
      stop = () => {}
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onEnd)
    handle.addEventListener('pointercancel', onEnd)
    handle.addEventListener('lostpointercapture', onEnd)
  }

  /** Resizes by `delta` px (keyboard). */
  function step(key: string, delta: number) {
    commit(key, `${clamp(key, currentWidth(key) + delta)}px`)
  }

  /** Fits the column to its widest rendered cell: the browser sizes a `max-content` track, we read it. */
  async function autosize(key: string) {
    live.value = { key, width: 'max-content' }
    await nextTick()
    const width = clamp(key, currentWidth(key))
    live.value = null
    commit(key, `${width}px`)
  }

  return { live, resizing, onPointerDown, step, autosize, reset: (key: string) => commit(key, null) }
}
