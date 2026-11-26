import type { ShallowRef } from 'vue'
import { trackAnchor } from './anchor'
import { TIP, TIP_OVERFLOW } from './tooltip'

// Loaded with the first element that has a tooltip (see `useGridTooltip`).
const HOVER_DELAY = 400
const HIDE_DELAY = 120

const isCut = (el: HTMLElement) =>
  el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1

export function createTooltip(tip: ShallowRef<HTMLElement | undefined>, anchor: string) {
  let target: HTMLElement | null = null
  let showTimer = 0
  let hideTimer = 0
  let warmUntil = 0
  let stopTracking = () => {}
  let ownAnchor = ''
  let withOurs = ''

  const tipOf = (node: EventTarget | null) =>
    node instanceof Element ? node.closest<HTMLElement>(`[${TIP}]`) : null
  const onTip = (node: EventTarget | null) => node instanceof Node && !!tip.value?.contains(node)

  function hide() {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    if (!target) return
    // give the element back its own anchor name (a menu or popover trigger is an anchor too)
    if (target.style.getPropertyValue('anchor-name') === withOurs) {
      if (ownAnchor) target.style.setProperty('anchor-name', ownAnchor)
      else target.style.removeProperty('anchor-name')
    }
    target = null
    stopTracking()
    stopTracking = () => {}
    try {
      if (tip.value?.matches(':popover-open')) tip.value.hidePopover()
    } catch {
      // closing while another popover opens or closes: the browser hides hints with it anyway
    }
    warmUntil = Date.now() + 300 // the next tooltip right away, while moving along a row
  }

  function show(el: HTMLElement) {
    const text = el.getAttribute(TIP)
    const popover = tip.value
    if (!text || !popover?.showPopover || !el.isConnected) return
    if (el.hasAttribute(TIP_OVERFLOW) && !isCut(el)) return
    if (target !== el) hide()
    target = el
    popover.textContent = text
    // `anchor-name` takes a list: keep the element's own (a details or menu trigger's) beside ours
    ownAnchor = el.style.getPropertyValue('anchor-name')
    withOurs = ownAnchor ? `${ownAnchor}, ${anchor}` : anchor
    el.style.setProperty('anchor-name', withOurs)
    try {
      if (!popover.matches(':popover-open')) popover.showPopover()
    } catch {
      // the browser refuses while another popover is opening or closing: no tooltip this time
      return hide()
    }
    stopTracking = trackAnchor(popover, el, 'top')
  }

  function schedule(el: HTMLElement, delay: number) {
    clearTimeout(hideTimer)
    if (el === target) return
    clearTimeout(showTimer)
    showTimer = window.setTimeout(() => show(el), Date.now() < warmUntil ? 0 : delay)
  }

  function hideSoon() {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    if (target) hideTimer = window.setTimeout(hide, HIDE_DELAY)
  }

  return {
    hide,
    pointerover(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      if (onTip(event.target)) return clearTimeout(hideTimer)
      const el = tipOf(event.target)
      if (el) schedule(el, HOVER_DELAY)
      else hideSoon()
    },
    pointerleave: hideSoon,
    pointerdown: hide,
    focusin(event: FocusEvent) {
      const focused = event.target as HTMLElement
      const el = tipOf(focused)
      // keyboard focus only: a click focuses too, and the pointer has its own delay
      if (el && focused.matches?.(':focus-visible')) {
        // the next task, not now: focus also arrives while the browser closes a popover (it hands
        // focus back to the trigger), and a popover can't open in the middle of that
        clearTimeout(showTimer)
        showTimer = window.setTimeout(() => {
          if (document.activeElement === focused) show(el)
        })
      } else hide()
    },
    focusout: hide,
    keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') hide()
    },
  }
}

export type TooltipController = ReturnType<typeof createTooltip>
