<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { resolveOption, type ToggleTextOptions } from './options'

const props = defineProps<CellRendererProps<any, unknown, ToggleTextOptions>>()
const emit = defineEmits<CellRendererEmits>()

const text = computed(() =>
  props.value === null || props.value === undefined || props.value === ''
    ? (props.options.placeholder ?? '')
    : String(props.value),
)
const clickable = computed(() => !!resolveOption(props.options.clickable, props.value, props.row))
const highlighted = computed(() => !!resolveOption(props.options.highlighted, props.value, props.row))
</script>

<template>
  <button
    v-if="clickable"
    type="button"
    :class="['vg-toggle-text', 'vg-link-button', { 'vg-toggle-text-on': highlighted }]"
    :aria-pressed="highlighted"
    @click="emit('action', 'toggle', value)"
  >
    {{ text }}
  </button>
  <span v-else :class="['vg-toggle-text', { 'vg-toggle-text-on': highlighted }]">{{ text }}</span>
</template>
