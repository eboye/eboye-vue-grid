<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { SwitchOptions } from './options'
import { useToggleControl } from './parts/useToggleControl'

const props = defineProps<CellRendererProps<unknown, unknown, SwitchOptions>>()
const emit = defineEmits<CellRendererEmits>()
const { checked, disabled, reason, label } = useToggleControl(props)
</script>

<template>
  <span class="vg-control" v-bind="tipAttrs(reason)">
    <button
      type="button"
      role="switch"
      class="vg-switch"
      :aria-checked="checked"
      :aria-label="label"
      :aria-description="reason || undefined"
      :disabled="disabled"
      @click.stop="emit('action', 'change', !checked)"
    >
      <span class="vg-switch-thumb" aria-hidden="true" />
    </button>
  </span>
</template>
