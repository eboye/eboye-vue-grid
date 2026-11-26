<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import { useId } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { RadioOptions } from './options'
import { useToggleControl } from './parts/useToggleControl'

const props = defineProps<CellRendererProps<unknown, unknown, RadioOptions>>()
const emit = defineEmits<CellRendererEmits>()
const { checked, disabled, reason, label } = useToggleControl(props)
// Controlled per cell: the app decides which row is selected, so cells don't share a native group
// (which would also fight the grid's arrow-key navigation) unless a `name` is given.
const name = props.options.name ?? `vg-radio-${useId()}`

function onClick(event: MouseEvent) {
  if (props.options.name === undefined) return
  event.preventDefault()
  if (checked.value) return
  const rowKey = props.rowKey
  // Let native activation restore the old group before the app applies its decision.
  window.setTimeout(() => emit('action', 'select', rowKey), 0)
}

function onChange(event: Event) {
  ;(event.target as HTMLInputElement).checked = checked.value
  if (!checked.value) emit('action', 'select', props.rowKey)
}
</script>

<template>
  <span class="vg-control" v-bind="tipAttrs(reason)">
    <input
      type="radio"
      class="vg-control-radio"
      :name="name"
      :checked="checked"
      :disabled="disabled"
      :aria-label="label"
      :aria-description="reason || undefined"
      @change="onChange"
      @click.stop="onClick"
    />
  </span>
</template>
