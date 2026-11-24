<script setup lang="ts">
import { computed, inject } from 'vue'
import type { StatusBarState } from '../composables/useStatusBar'
import { FORMAT_CONTEXT_KEY } from '../registry/plugin'
import { formatNumber } from '../renderers/format'
import type { StatusBarAggregate, StatusBarScope } from '../types'

/**
 * The status bar under the grid (status bar feature): how many rows pass the filters, how many are
 * selected, how many filters are on (with Clear), and a summary of chosen columns over the
 * selected rows. The grid's `#status-bar` slot (`render`) replaces the content.
 */
const props = defineProps<{
  bar: StatusBarState
  render?: (scope: StatusBarScope) => unknown
}>()

const scope = computed(() => props.bar.scope.value)
/** The app's `#status-bar` slot, rendered with the scope. */
const Custom = () => props.render?.(scope.value)

const format = inject(FORMAT_CONTEXT_KEY, undefined)
const n = (v: number) => (format ? formatNumber(v, format.value) : String(v))
const plural = (count: number, one: string, many: string) =>
  `${n(count)} ${count === 1 ? one : many}`

const rowsText = computed(() => {
  const { rowCount, totalRowCount } = scope.value
  return totalRowCount !== undefined && totalRowCount !== rowCount
    ? `${n(rowCount)} of ${plural(totalRowCount, 'row', 'rows')}`
    : plural(rowCount, 'row', 'rows')
})
const LABELS: Record<StatusBarAggregate, string> = {
  sum: 'Sum',
  avg: 'Average',
  min: 'Min',
  max: 'Max',
}
</script>

<template>
  <div class="vg-status-bar" role="group" aria-label="Grid status">
    <Custom v-if="render" />
    <template v-else>
      <span class="vg-status-item">{{ rowsText }}</span>
      <span v-if="scope.selectedCount" class="vg-status-item">
        {{ scope.allSelected ? 'All ' : '' }}{{ n(scope.selectedCount) }} selected
      </span>
      <span v-if="scope.filterCount" class="vg-status-item">
        {{ plural(scope.filterCount, 'filter', 'filters') }}
        <button
          v-if="bar.canClear"
          type="button"
          class="vg-link-button"
          @click="scope.clearFilters()"
        >
          Clear
        </button>
      </span>
      <span v-if="scope.summary.length" class="vg-status-summary">
        <span v-for="col in scope.summary" :key="col.key" class="vg-status-item">
          <span class="vg-status-label">{{ col.label }}:</span>
          <span v-for="item in col.items" :key="item.name" class="vg-status-value"
            >{{ LABELS[item.name] }} <strong>{{ item.text }}</strong></span
          >
        </span>
      </span>
    </template>
  </div>
</template>
