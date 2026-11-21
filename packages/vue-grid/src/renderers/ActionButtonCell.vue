<script setup lang="ts">
import { computed, toRaw } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { resolveOption, type ActionButtonOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ActionButtonOptions>>()
const emit = defineEmits<CellRendererEmits>()

const label = computed(() => resolveOption(props.options.label, props.value, props.row) ?? String(props.value ?? ''))
const disabled = computed(() => (props.options.disabled ? props.options.disabled(props.value, props.row) : false))
const visible = computed(() => (props.options.visible ? props.options.visible(props.value, props.row) : true))
// toRaw: options may come from reactive state; render the component itself, not a proxy.
const icon = computed(() => props.options.icon && toRaw(props.options.icon))
const iconOnly = computed(() => !!props.options.iconOnly && !!icon.value)
</script>

<template>
  <button
    v-if="visible && (label || icon)"
    type="button"
    :class="[
      'vg-action-button',
      `vg-variant-${options.variant ?? 'outline'}`,
      options.tone && `vg-tone-${options.tone}`,
      { 'vg-action-icon-only': iconOnly },
    ]"
    :disabled="disabled"
    :aria-label="iconOnly ? label : undefined"
    :title="iconOnly ? label : undefined"
    @click="emit('action', options.action ?? 'click', value)"
  >
    <component :is="icon" v-if="icon" class="vg-action-icon" aria-hidden="true" />
    <span v-if="label && !iconOnly">{{ label }}</span>
  </button>
</template>
