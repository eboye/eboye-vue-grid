<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererProps } from '../types'
import { formatCurrency } from './format'
import { resolveOption, type CurrencyOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, CurrencyOptions>>()
const ctx = useGridContext()

const text = computed(() => {
  const currency = resolveOption(props.options.currency, props.value, props.row)
  return formatCurrency(props.value, ctx.value, currency, props.options.format) || (props.options.placeholder ?? '')
})
</script>

<template>
  <span class="vg-number">{{ text }}</span>
</template>
