<script setup lang="ts">
import { computed, defineAsyncComponent, toRaw } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { resolveOption, type TextOptions } from './options'
import ValueBadge from './parts/ValueBadge.vue'

// Loaded with the first `copyable` cell: every grid has text cells, few have a copy button, and it
// is most of their code (the clipboard, its icons).
const CopyButton = defineAsyncComponent(() => import('./parts/CopyButton.vue'))

const props = defineProps<CellRendererProps<unknown, unknown, TextOptions>>()
const emit = defineEmits<CellRendererEmits>()

const isEmpty = computed(
  () => props.value === null || props.value === undefined || props.value === '',
)
const text = computed(() => {
  const v = props.value
  if (isEmpty.value) return props.options.placeholder ?? ''
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
})

const secondary = computed(() =>
  isEmpty.value ? null : props.options.secondary?.(props.value, props.row),
)
const fullText = computed(() => (secondary.value ? `${text.value} ${secondary.value}` : text.value))

const tooltip = computed(() => {
  const t = props.options.tooltip
  if (typeof t === 'function') return t(props.value, props.row)
  return t || props.options.ellipsis ? fullText.value : undefined
})

const tone = computed(() => resolveOption(props.options.tone, props.value, props.row))
const textClass = computed(() => [
  'vg-text',
  {
    'vg-text-ellipsis': props.options.ellipsis,
    'vg-text-clamp': props.options.lines,
    'vg-text-pre': props.options.preserveNewlines,
    'vg-text-muted': isEmpty.value && !!props.options.placeholder,
    'vg-text-bold': resolveOption(props.options.bold, props.value, props.row),
    'vg-text-fill': tone.value && props.options.toneMode === 'fill',
    [`vg-tone-${tone.value}`]: tone.value,
  },
])
const textStyle = computed(() => ({
  maxWidth: props.options.maxWidth,
  '--vg-text-lines': props.options.lines,
}))

const badge = computed(() => props.options.badge?.(props.value, props.row) || null)
const icon = computed(() => {
  const spec = props.options.icon?.(props.value, props.row)
  return spec ? { ...spec, icon: toRaw(spec.icon) } : null
})
const copyText = computed(() =>
  props.options.copyable && !isEmpty.value
    ? (props.options.copyValue?.(props.value, props.row) ?? fullText.value)
    : '',
)
// Plain text keeps a single span; adornments (icon, badge, secondary text, copy) wrap it.
const adorned = computed(() => !!(badge.value || icon.value || secondary.value || copyText.value))
</script>

<template>
  <span v-if="adorned" class="vg-text-adorned">
    <span
      v-if="icon"
      :class="['vg-text-icon', icon.tone && `vg-tone-${icon.tone}`]"
      :role="icon.label ? 'img' : undefined"
      :aria-label="icon.label"
      :aria-hidden="icon.label ? undefined : 'true'"
      :title="icon.label"
      ><component :is="icon.icon"
    /></span>
    <ValueBadge v-if="badge && options.badgePosition !== 'end'" :badge="badge" />
    <span :class="textClass" :style="textStyle" :title="tooltip"
      >{{ text }}<span v-if="secondary" class="vg-text-secondary">{{ ' ' + secondary }}</span></span
    >
    <ValueBadge v-if="badge && options.badgePosition === 'end'" :badge="badge" />
    <CopyButton
      v-if="copyText"
      :text="copyText"
      @copied="emit('action', 'copy', $event)"
      @failed="emit('action', 'copy-error', $event)"
    />
  </span>
  <span v-else :class="textClass" :style="textStyle" :title="tooltip">{{ text }}</span>
</template>
