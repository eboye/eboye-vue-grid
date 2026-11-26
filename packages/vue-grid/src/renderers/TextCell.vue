<script lang="ts">
import { markRaw, type Component } from 'vue'

// A `hoverCard` cell's trigger and card: loaded once, with the first cell that has one.
let loadedCardText: Component | undefined
let loadingCardText: Promise<Component> | undefined
function loadCardText() {
  return (loadingCardText ??= import('./parts/HoverCardText.vue').then(
    (m) => (loadedCardText = markRaw(m.default)),
  ))
}
</script>

<script setup lang="ts">
import { computed, defineAsyncComponent, shallowRef, toRaw, watch } from 'vue'
import { tipAttrs } from '../internal/tooltip'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { resolveOption, type HoverCardLine, type HoverCardSpec, type TextOptions } from './options'
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

// The grid's tooltip: `'always'` (`true`) the full text; `'overflow'` (the default with `ellipsis`
// / `lines`) the full text only while it is cut off; a function its own text (also read out).
const tip = computed(() => {
  const t = props.options.tooltip
  if (typeof t === 'function') return tipAttrs(t(props.value, props.row), { describe: true })
  if (t === true || t === 'always') return tipAttrs(fullText.value)
  if (t === 'overflow' || (t === undefined && (props.options.ellipsis || props.options.lines)))
    return tipAttrs(fullText.value, { overflow: true })
  return {}
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
  resolveOption(props.options.copyable, props.value, props.row) && !isEmpty.value
    ? (props.options.copyValue?.(props.value, props.row) ?? fullText.value)
    : '',
)
// ── Hover card (`hoverCard`): the text becomes its trigger ──────────────────────────────────
const card = computed<HoverCardSpec | null>(() => {
  const spec = isEmpty.value ? null : props.options.hoverCard?.(props.value, props.row)
  if (!spec) return null
  const full = isLineList(spec) ? { lines: spec } : spec
  return full.lines.length ? full : null
})
const isLineList = (spec: object): spec is readonly (string | HoverCardLine)[] =>
  Array.isArray(spec)
// The trigger (and the card) load with the first cell that has one: until then, plain text.
const CardText = shallowRef<Component | undefined>()
CardText.value = loadedCardText
watch(
  () => !!card.value,
  (has) => {
    if (has && !CardText.value) void loadCardText().then((c) => (CardText.value = c))
  },
  { immediate: true },
)

// Plain text keeps a single span; adornments (icon, badge, secondary text, copy, card) wrap it.
const adorned = computed(
  () => !!(badge.value || icon.value || secondary.value || copyText.value || card.value),
)
</script>

<template>
  <span v-if="adorned" class="vg-text-adorned">
    <span
      v-if="icon"
      :class="['vg-text-icon', icon.tone && `vg-tone-${icon.tone}`]"
      :role="icon.label ? 'img' : undefined"
      :aria-label="icon.label"
      :aria-hidden="icon.label ? undefined : 'true'"
      v-bind="tipAttrs(icon.label)"
      ><component :is="icon.icon"
    /></span>
    <ValueBadge v-if="badge && options.badgePosition !== 'end'" :badge="badge" />
    <component
      :is="CardText"
      v-if="card && CardText"
      :spec="card"
      :text="text"
      :secondary="secondary"
      :label="fullText"
      :text-class="textClass"
      :text-style="textStyle"
      @copied="emit('action', 'copy', $event)"
      @failed="emit('action', 'copy-error', $event)"
    />
    <span v-else :class="textClass" :style="textStyle" v-bind="tip"
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
  <span v-else :class="textClass" :style="textStyle" v-bind="tip">{{ text }}</span>
</template>
