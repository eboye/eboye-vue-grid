<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { lookup, resolveOption, resolveTone, type StatusOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, StatusOptions>>()
const emit = defineEmits<CellRendererEmits>()

const tone = computed(() => resolveTone(props.options.tone, props.value, props.row) ?? 'neutral')
const label = computed(() => {
  const l = props.options.label
  if (typeof l === 'function') return l(props.value, props.row)
  const raw = props.value === null || props.value === undefined ? '' : String(props.value)
  return (l && lookup(l, raw)) ?? raw
})
const clickable = computed(() => !!resolveOption(props.options.clickable, props.value, props.row))
const classes = computed(() => [
  'vg-status-badge',
  `vg-tone-${tone.value}`,
  `vg-status-${props.options.variant ?? 'soft'}`,
])
</script>

<template>
  <template v-if="label">
    <button
      v-if="clickable"
      type="button"
      :class="[classes, 'vg-status-button']"
      @click="emit('action', 'click', value)"
    >
      <span v-if="options.dot !== false" class="vg-status-dot" aria-hidden="true" />
      {{ label }}
    </button>
    <span v-else :class="classes">
      <span v-if="options.dot !== false" class="vg-status-dot" aria-hidden="true" />
      {{ label }}
    </span>
  </template>
  <span v-else-if="options.placeholder" class="vg-text vg-text-muted">{{
    options.placeholder
  }}</span>
</template>
