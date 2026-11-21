<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { formatCurrency } from './format'
import { resolveOption, type CurrencyOptions } from './options'
import NumberValue from './parts/NumberValue.vue'

const props = defineProps<CellRendererProps<unknown, unknown, CurrencyOptions>>()
const emit = defineEmits<CellRendererEmits>()
const ctx = useGridContext()

const formatted = computed(() => {
  const currency = resolveOption(props.options.currency, props.value, props.row)
  return formatCurrency(props.value, ctx.value, currency, props.options.format)
})
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
