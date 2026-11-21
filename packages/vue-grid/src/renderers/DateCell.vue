<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererProps } from '../types'
import { DATE_DEFAULT, formatDate, toDate } from './format'
import type { DateOptions } from './options'

const props = defineProps<CellRendererProps<any, unknown, DateOptions>>()
const ctx = useGridContext()

const date = computed(() => toDate(props.value))
const text = computed(() =>
  date.value ? formatDate(date.value, ctx.value, props.options.format ?? DATE_DEFAULT) : (props.options.placeholder ?? ''),
)
</script>

<template>
  <time v-if="date" class="vg-date" :datetime="date.toISOString()">{{ text }}</time>
  <span v-else class="vg-date vg-text-muted">{{ text }}</span>
</template>
