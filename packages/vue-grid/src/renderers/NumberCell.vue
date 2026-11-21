<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererProps } from '../types'
import { formatNumber, formatSigned } from './format'
import type { NumberOptions } from './options'

const props = defineProps<CellRendererProps<any, unknown, NumberOptions & { signed?: boolean }>>()
const ctx = useGridContext()

const text = computed(() => {
  const fmt = props.options.signed ? formatSigned : formatNumber
  return fmt(props.value, ctx.value, props.options.format) || (props.options.placeholder ?? '')
})
</script>

<template>
  <span class="vg-number">{{ text }}</span>
</template>
