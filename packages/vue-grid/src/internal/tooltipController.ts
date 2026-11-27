import type { ShallowRef } from 'vue'
import { addAnchorName, trackAnchor } from './anchor'
import { TIP, TIP_OVERFLOW, tooltipTarget } from './tooltip'

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
  let releaseAnchor: (() => void) | undefined

  const onTip = (node: EventTarget | null) => node instanceof Node && !!tip.value?.contains(node)

  function hide() {
    clearTimeout(showTimer)
    clearTimeout(hideTimer)
    if (!target) return
    releaseAnchor?.()
    releaseAnchor = undefined
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
    if (target !== el) {
      hide()
      target = el
      releaseAnchor = addAnchorName(el, anchor)
    }
    popover.textContent = text
    try {
      if (!popover.matches(':popover-open')) popover.showPopover()
    } catch {
      // the browser refuses while another popover is opening or closing: no tooltip this time
      return hide()
    }
    stopTracking()
    stopTracking = trackAnchor(popover, el, 'top')
  }

  function schedule(el: HTMLElement, delay: number) {
    clearTimeout(hideTimer)
    clearTimeout(showTimer)
    if (el === target) return
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
      const el = tooltipTarget(event.target)
      if (el) schedule(el, HOVER_DELAY)
      else hideSoon()
    },
    pointerleave: hideSoon,
    pointerdown: hide,
    focusin(event: FocusEvent) {
      const focused = event.target as HTMLElement
      const el = tooltipTarget(focused, true)
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
