<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import type { BooleanOptions } from './options'
import { CheckIcon, CrossIcon } from './parts/icons'

const props = defineProps<CellRendererProps<unknown, unknown, BooleanOptions>>()

const state = computed(() =>
  props.value === null || props.value === undefined ? 'null' : props.value ? 'true' : 'false',
)
const text = computed(
  () =>
    ({
      true: props.options.trueLabel ?? 'Yes',
      false: props.options.falseLabel ?? 'No',
      null: props.options.nullLabel ?? '',
    })[state.value],
)
const icon = computed(() =>
  state.value === 'true'
    ? CheckIcon
    : state.value === 'false' && props.options.falseIcon
      ? CrossIcon
      : null,
)
</script>

<template>
  <span
    v-if="options.display === 'icon'"
    :class="['vg-boolean', 'vg-boolean-icon', `vg-boolean-${state}`]"
  >
    <span v-if="icon" class="vg-boolean-glyph" role="img" :aria-label="text" v-bind="tipAttrs(text)"
      ><component :is="icon"
    /></span>
    <span v-else-if="state === 'null'">{{ text }}</span>
    <span v-else class="vg-sr-only">{{ text }}</span>
  </span>
  <span v-else :class="['vg-boolean', `vg-boolean-${state}`]">{{ text }}</span>
</template>
