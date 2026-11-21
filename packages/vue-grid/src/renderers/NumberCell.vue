<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { formatNumber, formatSigned } from './format'
import { resolveOption, type NumberOptions } from './options'
import NumberValue from './parts/NumberValue.vue'

const props = defineProps<CellRendererProps<unknown, unknown, NumberOptions & { signed?: boolean }>>()
const emit = defineEmits<CellRendererEmits>()
const ctx = useGridContext()

const formatted = computed(() => (props.options.signed ? formatSigned : formatNumber)(props.value, ctx.value, props.options.format))
const clickable = computed(() => !!resolveOption(props.options.clickable, props.value, props.row))
</script>

<template>
  <NumberValue
    :text="formatted || (options.placeholder ?? '')"
    :muted="!formatted"
    :clickable="clickable"
    @click="emit('action', 'click', value)"
  />
</template>
