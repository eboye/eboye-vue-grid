import { onBeforeUnmount, ref } from 'vue'
import { touchHold } from '../internal/touchHold'

export interface ColumnDragOptions {
  canDrag: (key: string) => boolean
  canDrop: (from: string, to: string) => boolean
  onDrop: (from: string, to: string) => void
  /** Touch: a header held and released without moving (opens its menu). */
  onHold?: (key: string, el: HTMLElement, x: number, y: number) => void
}

const DRAG_THRESHOLD = 4
const INTERACTIVE = 'button, a, input, select, textarea, [contenteditable], [data-vg-no-drag]'
const TOUCH_INTERACTIVE =
  'a, input, select, textarea, [contenteditable], [data-vg-no-drag], .vg-filter-button, .vg-resize-handle, .vg-checkbox'

/**
 * Pointer-based header reordering (mouse, pen and touch). Native HTML5 drag & drop is avoided:
 * it is async, gives poor feedback and does not work with touch.
 */
export function useColumnDrag(opts: ColumnDragOptions) {
  const dragging = ref<string | null>(null)
  const target = ref<{ key: string; side: 'before' | 'after' } | null>(null)
  let start: { x: number; y: number; key: string; el: HTMLElement; pointerId: number } | null = null
  let suppressClick = false

  function headerAt(x: number, y: number, grid: Element | null): HTMLElement | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-col-key][role="columnheader"]')
    return el && grid && el.closest('.vg') === grid ? el : null
  }

  function onPointerDown(event: PointerEvent, key: string) {
    if (event.button !== 0) return
    const el = event.currentTarget as HTMLElement
    // On touch the sort button is most of the header: holding it picks the column up (the click
    // after the hold is swallowed, so it doesn't sort). Other controls keep their touches.
    if (event.pointerType === 'touch') {
      if (!(event.target as Element).closest(TOUCH_INTERACTIVE)) onTouchDown(event, key, el)
      return
    }
    if ((event.target as Element).closest(INTERACTIVE)) return
    if (!opts.canDrag(key)) return
    start = { x: event.clientX, y: event.clientY, key, el, pointerId: event.pointerId }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', cancel)
  }

  /**
   * Touch: a swipe scrolls the grid as usual. Hold a header to pick it up, then drag it; released
   * without moving, it opens the header menu (`onHold`).
   */
  function onTouchDown(event: PointerEvent, key: string, el: HTMLElement) {
    const draggable = opts.canDrag(key)
    if (!draggable && !opts.onHold) return
    touchHold(event, (x, y) => {
      el.setAttribute('data-vg-held', '')
      if (draggable) start = { x, y, key, el, pointerId: event.pointerId }
      return {
        move(e) {
          if (!start) return
          dragging.value = key
          updateTarget(e)
        },
        end(e, moved) {
          el.removeAttribute('data-vg-held')
          if (e && moved && dragging.value && target.value) opts.onDrop(dragging.value, target.value.key)
          else if (e && !moved) opts.onHold?.(key, el, x, y)
          start = null
          dragging.value = null
          target.value = null
        },
      }
    })
  }

  function onPointerMove(event: PointerEvent) {
    if (!start || event.pointerId !== start.pointerId) return
    if (!dragging.value) {
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_THRESHOLD) return
      dragging.value = start.key
    }
    event.preventDefault()
    updateTarget(event)
  }

  function updateTarget(event: PointerEvent) {
    if (!start) return
    const over = headerAt(event.clientX, event.clientY, start.el.closest('.vg'))
    const overKey = over?.dataset.colKey
    if (!over || !overKey || overKey === start.key || !opts.canDrop(start.key, overKey)) {
      target.value = null
      return
    }
    const rect = over.getBoundingClientRect()
    target.value = { key: overKey, side: event.clientX < rect.left + rect.width / 2 ? 'before' : 'after' }
  }

  function onPointerUp(event: PointerEvent) {
    if (start && event.pointerId !== start.pointerId) return
    if (dragging.value && target.value) {
      opts.onDrop(dragging.value, target.value.key)
    }
    // A completed drag must not also count as a click (which would sort the column).
    suppressClick = !!dragging.value
    cancel()
  }

  function cancel() {
    start = null
    dragging.value = null
    target.value = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', cancel)
  }

  /** Call from the header's capture-phase click handler. */
  function consumeClick(event: MouseEvent) {
    if (suppressClick) {
      suppressClick = false
      event.stopPropagation()
      event.preventDefault()
    }
  }

  onBeforeUnmount(cancel)

  return { dragging, target, onPointerDown, consumeClick }
}
