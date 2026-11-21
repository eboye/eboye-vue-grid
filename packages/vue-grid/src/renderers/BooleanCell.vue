<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import type { BooleanOptions } from './options'

const props = defineProps<CellRendererProps<any, unknown, BooleanOptions>>()

const state = computed(() => (props.value === null || props.value === undefined ? 'null' : props.value ? 'true' : 'false'))
const text = computed(
  () =>
    ({
      true: props.options.trueLabel ?? 'Yes',
      false: props.options.falseLabel ?? 'No',
      null: props.options.nullLabel ?? '',
    })[state.value],
)
</script>

<template>
  <span :class="['vg-boolean', `vg-boolean-${state}`]">{{ text }}</span>
</template>
