import { defineComponent, h } from 'vue'

/** Small stroke icons used by the built-in renderers (24×24 viewBox, currentColor). */
function strokeIcon(name: string, paths: string[], fill = false) {
  return defineComponent({
    name,
    setup: () => () =>
      h(
        'svg',
        {
          viewBox: '0 0 24 24',
          stroke: 'currentColor',
          'stroke-width': 2,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        // fill on the paths (not the svg) so inherited CSS fill (e.g. .vg-icon-button svg) can't override it
        paths.map((d) => h('path', { d, fill: fill ? 'currentColor' : 'none' })),
      ),
  })
}

export const CheckIcon = strokeIcon('VgCheckIcon', ['M5 12.5l4.5 4.5L19 7.5'])
export const CrossIcon = strokeIcon('VgCrossIcon', ['M6 6l12 12', 'M18 6L6 18'])
export const CopyIcon = strokeIcon('VgCopyIcon', [
  'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z',
  'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
])
export const PencilIcon = strokeIcon('VgPencilIcon', ['M4 20h4L19 9l-4-4L4 16v4z', 'M14 6l4 4'])
const star = 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z'
export const StarIcon = strokeIcon('VgStarIcon', [star])
export const StarFilledIcon = strokeIcon('VgStarFilledIcon', [star], true)
export const InfoIcon = strokeIcon('VgInfoIcon', ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 11v5', 'M12 8h.01'])
