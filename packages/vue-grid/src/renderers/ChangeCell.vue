<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererProps } from '../types'
import { formatCurrency, formatNumber, toNumber } from './format'
import type { ChangeOptions } from './options'

const props = defineProps<CellRendererProps<any, unknown, ChangeOptions>>()
const ctx = useGridContext()

const direction = computed(() => {
  if (props.options.direction) return props.options.direction(props.value, props.row) ?? 'equal'
  const n = toNumber(props.value)
  return n === null || n === 0 ? 'equal' : n > 0 ? 'up' : 'down'
})

const text = computed(() => {
  const { currency, format, placeholder } = props.options
  if (toNumber(props.value) === null) {
    return props.value === null || props.value === undefined ? (placeholder ?? '') : String(props.value)
  }
  if (currency) return formatCurrency(props.value, ctx.value, typeof currency === 'string' ? currency : undefined, format)
  return formatNumber(props.value, ctx.value, format)
})

const srLabel = computed(() => ({ up: 'Increased', down: 'Decreased', equal: '' })[direction.value])
</script>

<template>
  <span :class="['vg-change', `vg-change-${direction}`]" :title="text">
    <svg v-if="direction !== 'equal'" class="vg-change-icon" viewBox="0 0 10 10" aria-hidden="true">
      <path v-if="direction === 'up'" d="M5 1.5 9 7.5H1z" />
      <path v-else d="M5 8.5 1 2.5h8z" />
    </svg>
    <span v-if="srLabel" class="vg-sr-only">{{ srLabel }}</span>
    <span class="vg-change-value">{{ text }}</span>
  </span>
</template>
