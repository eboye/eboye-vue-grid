<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { resolveOption, type ActionButtonOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ActionButtonOptions>>()
const emit = defineEmits<CellRendererEmits>()

const label = computed(() => resolveOption(props.options.label, props.value, props.row) ?? String(props.value ?? ''))
const disabled = computed(() => (props.options.disabled ? props.options.disabled(props.value, props.row) : false))
</script>

<template>
  <button
    v-if="label || options.icon"
    type="button"
    :class="['vg-action-button', options.tone && `vg-tone-${options.tone}`]"
    :disabled="disabled"
    @click="emit('action', options.action ?? 'click', value)"
  >
    <component :is="options.icon" v-if="options.icon" class="vg-action-icon" aria-hidden="true" />
    <span v-if="label">{{ label }}</span>
  </button>
</template>
