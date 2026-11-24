<script setup lang="ts">
import { computed } from 'vue'
import { supportsRelativeColor } from '../internal/supports'
import type { CellRendererProps } from '../types'
import { readableTextColor } from './format'
import { resolveOption, resolveTone, type ChipOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ChipOptions>>()

/** Accepts `{ label | name | text, color }` objects (as many APIs send them) or plain values. */
const record = computed(() =>
  props.value !== null && typeof props.value === 'object'
    ? (props.value as Record<string, unknown>)
    : null,
)
const label = computed(() => {
  if (props.options.label) return props.options.label(props.value, props.row)
  const r = record.value
  const v = r ? (r.label ?? r.name ?? r.text) : props.value
  return v === null || v === undefined ? '' : String(v)
})
const color = computed(() => {
  const c = resolveOption(props.options.color, props.value, props.row) ?? record.value?.color
  if (typeof c !== 'string' || !c.trim()) return undefined
  // Only real colours reach the style (never url()/image() or other tokens).
  const ok =
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
      ? CSS.supports('color', c)
      : !/[(;:]/.test(c.replace(/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)$/i, ''))
  return ok ? c.trim() : undefined
})
// A tone map is keyed by the label (e.g. { A: 'success' }); a tone function gets (value, row) like elsewhere.
const tone = computed(() => {
  if (color.value) return undefined
  const t = props.options.tone
  return resolveTone(t, typeof t === 'function' ? props.value : label.value, props.row)
})
const style = computed(() => ({
  // The chip CSS paints --vg-chip-bg as background-color (never `background`, so data can't set an
  // image url()) and picks readable text in CSS; JS computes the text colour only as a fallback.
  ...(color.value
    ? {
        '--vg-chip-bg': color.value,
        ...(supportsRelativeColor() ? {} : { color: readableTextColor(color.value) }),
      }
    : {}),
  '--vg-chip-size': props.options.size,
}))
const tooltip = computed(() => {
  const t = props.options.tooltip?.(props.value, props.row)
  if (t) return t
  const d = record.value?.description
  return typeof d === 'string' && d ? d : undefined
})
</script>

<template>
  <span
    v-if="label"
    :class="[
      'vg-chip',
      `vg-chip-${options.shape ?? 'square'}`,
      tone && `vg-tone-${tone}`,
      color ? 'vg-chip-raw' : 'vg-chip-toned',
    ]"
    :style="style"
    :title="tooltip"
    >{{ label }}</span
  >
  <span v-else-if="options.placeholder" class="vg-text vg-text-muted">{{
    options.placeholder
  }}</span>
</template>
