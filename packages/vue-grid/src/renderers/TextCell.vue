<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import { resolveOption, type TextOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, TextOptions>>()

const text = computed(() => {
  const v = props.value
  if (v === null || v === undefined || v === '') return props.options.placeholder ?? ''
  return typeof v === 'object' ? JSON.stringify(v) : String(v)
})

const tooltip = computed(() => {
  const t = props.options.tooltip
  if (typeof t === 'function') return t(props.value, props.row)
  return t || props.options.ellipsis ? text.value : undefined
})

const tone = computed(() => resolveOption(props.options.tone, props.value, props.row))
</script>

<template>
  <span
    :class="[
      'vg-text',
      {
        'vg-text-ellipsis': options.ellipsis,
        'vg-text-clamp': options.lines,
        'vg-text-muted': text === options.placeholder && !!options.placeholder,
        [`vg-tone-${tone}`]: tone,
      },
    ]"
    :style="{ maxWidth: options.maxWidth, '--vg-text-lines': options.lines }"
    :title="tooltip"
    >{{ text }}</span
  >
</template>
