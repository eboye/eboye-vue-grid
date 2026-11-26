import { onBeforeUnmount, shallowRef } from 'vue'

import type { TooltipController } from './tooltipController'

/**
 * The grid's tooltips: one `popover="hint"` element per grid (a `manual` popover where `hint` isn't
 * supported yet), in the top layer and placed with CSS anchor positioning, so the grid's scrolling
 * never clips it. Anything inside the grid opts in with `tipAttrs(text)`; delegated listeners on the
 * grid show it on hover (after a short delay) and on keyboard focus, and hide it on leave, blur,
 * scroll, a press, or Esc. It stays while the pointer moves onto it (WCAG 1.4.13).
 *
 * Only these listeners are in every grid: the rest (`tooltipController`) loads with the first
 * element that has a tooltip, well within the hover delay.
 */
export const TIP = 'data-vg-tip'
export const TIP_OVERFLOW = 'data-vg-tip-overflow'

/**
 * Attributes that give an element a grid tooltip (text, or an array of lines). `overflow`: only while the element's own text is
 * cut off (ellipsis / line clamp). `describe`: also its accessible description, where the text says
 * something the element doesn't (a reason, a badge's meaning). Exported as `tooltipAttrs` for your
 * own renderers and slot content inside the grid: `<span v-bind="tooltipAttrs(text)">`. Outside a
 * `<VGrid>` nothing shows it.
 */
export function tipAttrs(
  value: string | readonly string[] | null | undefined,
  options?: { overflow?: boolean; describe?: boolean },
): Record<string, string | undefined> {
  // several lines: one per line in the tooltip (it keeps line breaks)
  const text = typeof value === 'string' ? value : value?.filter(Boolean).join('\n')
  if (!text) return {}
  return {
    [TIP]: text,
    [TIP_OVERFLOW]: options?.overflow ? '' : undefined,
    'aria-description': options?.describe ? text : undefined,
  }
}

type Name = Exclude<keyof TooltipController, 'hide'>

export function useGridTooltip(id: string) {
  const tip = shallowRef<HTMLElement>()
  // not anchorNameFor(): importing ./anchor would bring it into every grid
  const anchor = `--vg-tip-${id.replace(/[^\w-]/g, '_')}`
  let controller: TooltipController | undefined
  let loading: Promise<unknown> | undefined

  function forward(name: Name, event: Event) {
    if (controller) return controller[name](event as never)
    const el = event.target
    if (!(el instanceof Element) || !el.closest(`[${TIP}]`)) return
    loading ??= import('./tooltipController').then(
      (m) => (controller = m.createTooltip(tip, anchor)),
    )
    // replay only what still holds once it has loaded (the pointer still over it / focus still there)
    void loading.then(() => {
      if (name === 'pointerover' ? el.matches(':hover') : document.activeElement === el)
        controller![name](event as never)
    })
  }
  const hide = () => controller?.hide()
  onBeforeUnmount(hide)

  return {
    tip,
    anchor,
    hide,
    /** Listeners for the grid's root element. */
    on: {
      pointerover: (e: PointerEvent) => forward('pointerover', e),
      focusin: (e: FocusEvent) => forward('focusin', e),
      pointerleave: () => controller?.pointerleave(),
      pointerdown: hide,
      focusout: hide,
      keydown: (e: KeyboardEvent) => controller?.keydown(e),
    },
  }
}
