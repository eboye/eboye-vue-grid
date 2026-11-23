/** How long a finger stays put before a touch counts as a hold. */
export const HOLD_MS = 450
/** How far (px) a finger may drift and still be holding; further first = a scroll. */
const SLOP = 10
/** How long after a held finger lifts to wait for the click the release may send. */
const RELEASE_MS = 350

export interface HoldHandlers {
  /** The finger moved after the hold (the page doesn't scroll meanwhile). */
  move?(event: PointerEvent): void
  /** The finger lifted (`event`) or the gesture was cancelled (`null`). `moved`: it moved after the hold. */
  end?(event: PointerEvent | null, moved: boolean): void
}

/** Synthetic `contextmenu` events made for a touch hold (menus place them at the finger). */
const holdEvents = new WeakSet<Event>()
export const isHoldEvent = (event: Event) => holdEvents.has(event)
/** A `contextmenu`-like event at a viewport point, for opening a menu after a touch hold. */
export function holdEvent(x: number, y: number): MouseEvent {
  const event = new MouseEvent('contextmenu', { clientX: x, clientY: y, button: 2, cancelable: true })
  holdEvents.add(event)
  return event
}

/**
 * Touch-and-hold on touch screens, where there is no right click (and iOS fires no `contextmenu`
 * at all). Call from a `pointerdown`: a touch that stays put for `HOLD_MS` calls `onHold`; moving
 * first is a scroll and cancels it. Once held, the page doesn't scroll (so the finger can drag), the
 * browser's own long-press menu is suppressed, and the click that follows the release is swallowed.
 * Does nothing for mouse and pen.
 */
export function touchHold(event: PointerEvent, onHold: (x: number, y: number) => HoldHandlers | void): void {
  if (event.pointerType !== 'touch') return
  const id = event.pointerId
  const x0 = event.clientX
  const y0 = event.clientY
  let handlers: HoldHandlers | void = undefined
  let held = false
  let moved = false

  const timer = window.setTimeout(() => {
    held = true
    handlers = onHold(x0, y0)
  }, HOLD_MS)

  const blockScroll = (e: TouchEvent) => {
    if (held && e.cancelable) e.preventDefault()
  }
  // The browser's own long-press menu (Android): the hold opens ours instead, whichever comes first.
  const blockMenu = (e: Event) => {
    if (holdEvents.has(e)) return
    e.preventDefault()
    e.stopPropagation()
  }
  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== id) return
    if (!held) {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > SLOP) finish()
      return
    }
    if (!moved && Math.hypot(e.clientX - x0, e.clientY - y0) <= SLOP) return
    moved = true
    handlers?.move?.(e)
  }
  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== id) return
    if (held) {
      // The release may still send a `click` (Chromium does): swallow it, and act only after it —
      // a menu opened before it would be light-dismissed by it. No click within RELEASE_MS: act then.
      let done = false
      const act = () => {
        if (done) return
        done = true
        window.removeEventListener('click', onClick, { capture: true })
        handlers?.end?.(e, moved)
      }
      const onClick = (c: Event) => {
        c.preventDefault()
        c.stopPropagation()
        act()
      }
      window.addEventListener('click', onClick, { capture: true })
      window.setTimeout(act, RELEASE_MS)
    }
    finish()
  }
  const onCancel = (e: PointerEvent) => {
    if (e.pointerId !== id) return
    if (held) handlers?.end?.(null, moved)
    finish()
  }
  function finish() {
    window.clearTimeout(timer)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('touchmove', blockScroll)
    // A late native `contextmenu` can still arrive right after the release.
    window.setTimeout(() => window.removeEventListener('contextmenu', blockMenu, { capture: true }), 600)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('touchmove', blockScroll, { passive: false })
  window.addEventListener('contextmenu', blockMenu, { capture: true })
}
