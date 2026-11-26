<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import { computed, toRaw } from 'vue'
import type { CellRendererProps } from '../types'
import { resolveOption, type IconOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, IconOptions>>()

// toRaw: options may live in reactive state; render the component itself, not a reactive proxy.
const icon = computed(() => {
  const found = props.options.iconFor
    ? props.options.iconFor(props.value, props.row)
    : props.options.icon
  return found && toRaw(found)
})
const visible = computed(() =>
  props.options.show ? props.options.show(props.value, props.row) : true,
)
const label = computed(() => resolveOption(props.options.label, props.value, props.row))
const tone = computed(() => resolveOption(props.options.tone, props.value, props.row))
</script>

<template>
  <span
    :class="['vg-icon', { [`vg-tone-${tone}`]: tone, 'vg-invisible': !visible }]"
    :role="label ? 'img' : undefined"
    :aria-label="visible ? label : undefined"
    :aria-hidden="!label || !visible ? 'true' : undefined"
    v-bind="tipAttrs(visible ? label : undefined)"
  >
    <component :is="icon" v-if="icon" />
  </span>
</template>
