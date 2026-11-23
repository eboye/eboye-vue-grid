<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { CopyOptions } from './options'
import CopyButton from './parts/CopyButton.vue'

const props = defineProps<CellRendererProps<unknown, unknown, CopyOptions>>()
const emit = defineEmits<CellRendererEmits>()

const isEmpty = computed(() => props.value === null || props.value === undefined || props.value === '')
const text = computed(() => {
  if (isEmpty.value) return ''
  if (typeof props.value !== 'object') return String(props.value)
  try {
    return JSON.stringify(props.value) ?? String(props.value)
  } catch {
    return String(props.value) // cyclic or BigInt inside
  }
})
const copyValue = computed(() => props.options.copyValue?.(props.value, props.row) ?? text.value)
const tooltip = computed(() => (props.options.title ? `${props.options.title}: ${copyValue.value}` : copyValue.value))
</script>

<template>
  <span v-if="!isEmpty" :class="['vg-copy', { 'vg-copy-icon-only': options.iconOnly }]">
    <span v-if="!options.iconOnly" class="vg-text vg-text-ellipsis" :title="tooltip">{{ text }}</span>
    <CopyButton
      :text="copyValue"
      :label="options.label ?? (options.title ? `Copy ${options.title}` : 'Copy')"
      :title="tooltip"
      @copied="emit('action', 'copy', $event)"
      @failed="emit('action', 'copy-error', $event)"
    />
  </span>
  <span v-else-if="options.placeholder" class="vg-text vg-text-muted">{{ options.placeholder }}</span>
</template>
