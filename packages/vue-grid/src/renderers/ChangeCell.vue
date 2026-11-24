<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererProps } from '../types'
import { formatCurrency, formatNumber, toNumber } from './format'
import type { ChangeOptions } from './options'
import { useMessages } from '../internal/messages'

const props = defineProps<CellRendererProps<unknown, unknown, ChangeOptions>>()
const m = useMessages()
const ctx = useGridContext()

const direction = computed(() => {
  if (props.options.direction) return props.options.direction(props.value, props.row) ?? 'equal'
  // Booleans (also as strings, as some APIs send them) are a trend flag.
  if (props.value === true || props.value === 'true') return 'up'
  if (props.value === false || props.value === 'false') return 'down'
  const n = toNumber(props.value)
  return n === null || n === 0 ? 'equal' : n > 0 ? 'up' : 'down'
})

const text = computed(() => {
  const { currency, format, placeholder } = props.options
  if (typeof props.value === 'boolean' || props.value === 'true' || props.value === 'false')
    return ''
  if (toNumber(props.value) === null) {
    return props.value === null || props.value === undefined
      ? (placeholder ?? '')
      : String(props.value)
  }
  if (currency)
    return formatCurrency(
      props.value,
      ctx.value,
      typeof currency === 'string' ? currency : undefined,
      format,
    )
  return formatNumber(props.value, ctx.value, format)
})

const srLabel = computed(
  () =>
    ({
      up: m.value.increased ?? 'Increased',
      down: m.value.decreased ?? 'Decreased',
      equal: '',
    })[direction.value],
)
const iconOnly = computed(() => props.options.iconOnly || !text.value)
</script>

<template>
  <span
    :class="['vg-change', `vg-change-${direction}`]"
    :title="iconOnly ? srLabel || undefined : text"
    :role="iconOnly && srLabel ? 'img' : undefined"
    :aria-label="iconOnly && srLabel ? [srLabel, text].filter(Boolean).join(' ') : undefined"
  >
    <svg v-if="direction !== 'equal'" class="vg-change-icon" viewBox="0 0 10 10" aria-hidden="true">
      <path v-if="direction === 'up'" d="M5 1.5 9 7.5H1z" />
      <path v-else d="M5 8.5 1 2.5h8z" />
    </svg>
    <template v-if="!iconOnly">
      <span v-if="srLabel" class="vg-sr-only">{{ srLabel }}</span>
      <span class="vg-change-value">{{ text }}</span>
    </template>
  </span>
</template>
