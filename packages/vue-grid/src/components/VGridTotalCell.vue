<script setup lang="ts">
import { computed, inject } from 'vue'
import { FORMAT_CONTEXT_KEY } from '../registry/plugin'
import { formatNumber } from '../renderers/format'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import { RenderSlot } from '../internal/RenderSlot'

/**
 * A cell of the totals row (aggregation feature): the column's aggregate with its renderer
 * (`count` as a plain number), the `total-<key>` slot, or the row's label in the first column.
 * No clicks, menus or change highlight: it isn't a row of the data.
 */
const props = defineProps<{ column: ResolvedColumn; row: Record<string, unknown> }>()

const grid = useInternalGrid()
const format = inject(FORMAT_CONTEXT_KEY, undefined)

const value = computed(() =>
  props.column.kind === 'data' ? grid.totals?.values.value[props.column.key] : undefined,
)
const show = computed<'slot' | 'count' | 'renderer' | 'label' | null>(() => {
  if (props.column.kind !== 'data') return null
  if (grid.slots[`total-${props.column.key}`]) return 'slot'
  const agg = props.column.def.aggregate
  if (agg !== undefined && value.value !== undefined) return agg === 'count' ? 'count' : 'renderer'
  return props.column.isTree ? 'label' : null
})
// A class function of the row doesn't apply: the totals aren't a row of the data.
const cellClass = computed(() =>
  typeof props.column.def.cellClass === 'function' ? undefined : props.column.def.cellClass,
)
</script>

<template>
  <div
    :role="grid.cellRole"
    :tabindex="grid.rovingTabindex"
    :data-col-key="column.key"
    :class="[
      'vg-cell',
      `vg-align-${column.align}`,
      {
        'vg-cell-select': column.kind === 'select',
        'vg-cell-tree': column.isTree,
        [`vg-pin-${column.pinned}`]: column.pinned,
        'vg-pin-edge': column.pinEdge,
        'vg-col-sized': column.kind === 'data' && grid.resize?.isSized(column.key),
      },
      cellClass,
      grid.ui.value.cell,
    ]"
    :style="grid.pinStyle(column.key)"
    :aria-colindex="grid.cols?.at(column.key)"
  >
    <template v-if="column.kind === 'data'">
      <span
        v-if="column.isTree && (grid.treeMode.value || grid.hasDetail.value)"
        class="vg-tree-gutter"
      />
      <div class="vg-cell-content">
        <RenderSlot
          v-if="show === 'slot'"
          :fn="grid.slots[`total-${column.key}`]"
          :scope="{ value, column: column.def }"
        />
        <template v-else-if="show === 'count'">{{
          format ? formatNumber(value, format) : value
        }}</template>
        <component
          :is="column.component"
          v-else-if="show === 'renderer' && column.component"
          :value="value"
          :row="row"
          row-key="__vg_total"
          :row-index="-1"
          :depth="0"
          :column="column.def"
          :options="column.options"
        />
        <template v-else-if="show === 'renderer'">{{ value ?? '' }}</template>
        <span v-else-if="show === 'label'" class="vg-total-label">{{
          grid.totals?.label.value
        }}</span>
      </div>
    </template>
  </div>
</template>
