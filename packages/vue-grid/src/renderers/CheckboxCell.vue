<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { CheckboxOptions } from './options'
import { useToggleControl } from './parts/useToggleControl'

const props = defineProps<CellRendererProps<unknown, unknown, CheckboxOptions>>()
const emit = defineEmits<CellRendererEmits>()
const { checked, disabled, reason, label } = useToggleControl(props)

function onChange(event: Event) {
  // Controlled: show the data's state until the app applies the change.
  ;(event.target as HTMLInputElement).checked = checked.value
  emit('action', 'change', !checked.value)
}
</script>

<template>
  <span class="vg-control" v-bind="tipAttrs(reason)">
    <input
      type="checkbox"
      class="vg-control-checkbox"
      :checked="checked"
      :disabled="disabled"
      :aria-label="label"
      :aria-description="reason || undefined"
      @change="onChange"
      @click.stop
    />
  </span>
</template>
