<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext } from '../registry/plugin'
import type { CellRendererProps } from '../types'
import { DATE_DEFAULT, formatDate, TIME_DEFAULT, toDate } from './format'
import type { DateTimeOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, DateTimeOptions>>()
const ctx = useGridContext()

const date = computed(() => toDate(props.value))
const datePart = computed(() => (date.value ? formatDate(date.value, ctx.value, DATE_DEFAULT) : ''))
const timePart = computed(() => {
  if (!date.value) return ''
  const opts: Intl.DateTimeFormatOptions = { ...TIME_DEFAULT }
  if (props.options.milliseconds) opts.fractionalSecondDigits = 3
  return formatDate(date.value, ctx.value, opts)
})
const custom = computed(() =>
  date.value && props.options.format ? formatDate(date.value, ctx.value, props.options.format) : '',
)
</script>

<template>
  <time
    v-if="date"
    :class="['vg-datetime', { 'vg-datetime-stacked': options.twoLines !== false && !custom }]"
    :datetime="date.toISOString()"
  >
    <template v-if="custom">{{ custom }}</template>
    <template v-else>
      <span>{{ datePart }}</span>
      <span class="vg-text-muted">{{ timePart }}</span>
    </template>
  </time>
  <span v-else class="vg-datetime vg-text-muted">{{ options.placeholder ?? '' }}</span>
</template>
