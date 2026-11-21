<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { resolveOption, type EditOptions } from './options'
import { PencilIcon } from './parts/icons'

const props = defineProps<CellRendererProps<unknown, unknown, EditOptions>>()
const emit = defineEmits<CellRendererEmits>()

const text = computed(() => {
  if (props.options.format) return props.options.format(props.value, props.row)
  return props.value === null || props.value === undefined ? '' : String(props.value)
})
const disabled = computed(() => !!resolveOption(props.options.disabled, props.value, props.row))
const label = computed(() => `${props.options.label ?? 'Edit'} ${props.column.header ?? props.column.key}`.trim())
</script>

<template>
  <span class="vg-edit">
    <span
      :class="['vg-text', 'vg-text-ellipsis', { 'vg-text-bold': options.bold, 'vg-text-muted': !text }]"
      :title="text || undefined"
      >{{ text || options.placeholder || '' }}</span
    >
    <button
      v-if="!disabled"
      type="button"
      class="vg-icon-button vg-edit-button"
      :aria-label="label"
      :title="label"
      @click="emit('action', 'edit', value)"
    >
      <PencilIcon />
    </button>
  </span>
</template>
