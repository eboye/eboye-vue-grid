<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import type { StatusOptions, Tone } from './options'

const props = defineProps<CellRendererProps<any, unknown, StatusOptions>>()

const tone = computed<Tone>(() => {
  const t = props.options.tone
  if (typeof t === 'function') return t(props.value, props.row) ?? 'neutral'
  if (t && typeof t === 'object') return t[String(props.value)] ?? 'neutral'
  return t ?? 'neutral'
})
const label = computed(() => (props.options.label ? props.options.label(props.value, props.row) : String(props.value ?? '')))
</script>

<template>
  <span v-if="label" :class="['vg-status-badge', `vg-tone-${tone}`]">
    <span v-if="options.dot !== false" class="vg-status-dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>
