<script setup lang="ts">
import { computed, createTextVNode, h, inject, type VNode } from 'vue'
import type { StatusBarState } from '../composables/useStatusBar'
import { FORMAT_CONTEXT_KEY } from '../registry/plugin'
import { formatNumber } from '../renderers/format'
import { useMessages } from '../internal/messages'
import { rowCountText } from '../internal/rowCountText'
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
const m = useMessages()

const rowsText = computed(() => {
  const count = props.bar.visibleRowCount.value
  return count === undefined
    ? rowCountText(m.value, n, scope.value.rowCount, scope.value.totalRowCount)
    : (m.value.visibleRowCount?.(n(count), count) ?? `${plural(count, 'row', 'rows')} shown`)
})
const fullyExpandedText = computed(() => {
  const count = props.bar.fullyExpandedCount.value
  if (count === undefined) return undefined
  const formatted = n(count)
  return m.value.fullyExpandedCount?.(formatted, count) ?? `${formatted} fully expanded`
})
const Counts = () => {
  const { bar } = props
  const attrs = bar.attrs.value
  const grouped = bar.groupCounts.value
  const items: VNode[] = []
  if (bar.show.value.rows) {
    items.push(
      h(
        'span',
        {
          ...attrs?.rowCount,
          key: 'row-count',
          class: 'vg-status-item',
          role: !grouped && bar.visibleRowCount.value !== undefined ? 'status' : undefined,
        },
        rowsText.value,
      ),
    )
  }
  if (fullyExpandedText.value !== undefined) {
    if (grouped && items.length) items.push(createTextVNode(' '))
    items.push(
      h(
        'span',
        { ...attrs?.fullyExpandedCount, key: 'expanded-count', class: 'vg-status-item' },
        fullyExpandedText.value,
      ),
    )
  }
  return grouped && items.length
    ? h(
        'span',
        { ...attrs?.counts, class: 'vg-status-counts', role: 'status', 'aria-atomic': 'true' },
        items,
      )
    : items
}
const selectedText = computed(() => {
  const { selectedCount, allSelected } = scope.value
  return (
    m.value.selectedCount?.(n(selectedCount), allSelected, selectedCount) ??
    `${allSelected ? 'All ' : ''}${n(selectedCount)} selected`
  )
})
const label = (name: StatusBarAggregate) =>
  ({
    sum: m.value.sum ?? 'Sum',
    avg: m.value.average ?? 'Average',
    min: m.value.min ?? 'Min',
    max: m.value.max ?? 'Max',
  })[name]
</script>

<template>
  <div
    class="vg-status-bar"
    role="group"
    :aria-label="m.statusBar ?? 'Grid status'"
    v-bind="bar.attrs.value?.root"
  >
    <Custom v-if="render" />
    <template v-else>
      <Counts />
      <span v-if="scope.selectedCount && bar.show.value.selected" class="vg-status-item">
        {{ selectedText }}
      </span>
      <span v-if="scope.filterCount && bar.show.value.filters" class="vg-status-item">
        {{ m.filterCount?.(scope.filterCount) ?? plural(scope.filterCount, 'filter', 'filters') }}
        <button
          v-if="bar.canClear && bar.show.value.clear"
          type="button"
          class="vg-link-button"
          @click="scope.clearFilters()"
        >
          {{ m.clear ?? 'Clear' }}
        </button>
      </span>
      <span v-if="scope.summary.length" class="vg-status-summary">
        <span v-for="col in scope.summary" :key="col.key" class="vg-status-item">
          <span class="vg-status-label">{{ col.label }}:</span>
          <span v-for="item in col.items" :key="item.name" class="vg-status-value"
            >{{ label(item.name) }} <strong>{{ item.text }}</strong></span
          >
        </span>
      </span>
      <span v-if="scope.range" class="vg-status-summary vg-status-range">
        <span class="vg-status-item">
          <span class="vg-status-label"
            >{{ m.cellCount?.(scope.range.cells) ?? plural(scope.range.cells, 'cell', 'cells')
            }}{{ scope.range.items.length ? ':' : '' }}</span
          >
          <span v-for="item in scope.range.items" :key="item.name" class="vg-status-value"
            >{{ label(item.name) }} <strong>{{ item.text }}</strong></span
          >
        </span>
      </span>
      <button
        v-if="bar.backToTop.value"
        v-bind="bar.attrs.value?.backToTop"
        type="button"
        class="vg-link-button"
        @click="bar.scrollToTop()"
      >
        {{ m.backToTop ?? 'Back to top' }}
      </button>
    </template>
  </div>
</template>
