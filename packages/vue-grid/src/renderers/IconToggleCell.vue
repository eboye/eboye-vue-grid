<script setup lang="ts">
import { computed, toRaw } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { resolveOption, type IconToggleOptions } from './options'
import { StarFilledIcon, StarIcon } from './parts/icons'

const props = defineProps<CellRendererProps<unknown, unknown, IconToggleOptions>>()
const emit = defineEmits<CellRendererEmits>()

const active = computed(() => (props.options.active ? !!props.options.active(props.value, props.row) : !!props.value))
const icon = computed(() => {
  const { icon: off, activeIcon: on } = props.options
  const chosen = active.value ? (on ?? (off ? off : StarFilledIcon)) : (off ?? StarIcon)
  return toRaw(chosen)
})
const label = computed(() => resolveOption(props.options.label, props.value, props.row) ?? 'Toggle')
const disabled = computed(() => !!resolveOption(props.options.disabled, props.value, props.row))
</script>

<template>
  <button
    type="button"
    :class="['vg-icon-button', 'vg-icon-toggle', active && `vg-tone-${options.activeTone ?? 'warning'}`]"
    :aria-pressed="active"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @click="emit('action', 'toggle', !active)"
  >
    <component :is="icon" />
  </button>
</template>
