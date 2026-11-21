<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useInternalGrid } from '../internal/context'
import { RenderSlot } from '../internal/RenderSlot'
import VGridCell from './VGridCell.vue'

defineOptions({ name: 'VGridRows' })

const props = withDefaults(
  defineProps<{
    rows: readonly any[]
    depth?: number
    /** Index of `rows[0]` in the full row list (virtual mode). */
    indexOffset?: number
    /** Adds `aria-rowindex` (virtual mode, where most rows are not in the DOM). */
    ariaIndexed?: boolean
    /** Rows are already sorted by the parent (top level, where virtual slicing happens). */
    presorted?: boolean
  }>(),
  { depth: 0, indexOffset: 0, ariaIndexed: false, presorted: false },
)

const grid = useInternalGrid()

const items = computed(() =>
  (props.presorted ? props.rows : grid.sortRows(props.rows)).map((row, i) => {
    const key = grid.getKey(row)
    const expandable = grid.canExpand(row)
    return {
      row,
      key,
      index: props.indexOffset + i,
      expandable,
      expanded: expandable && grid.isExpanded(key),
      selected: grid.selectMode.value ? grid.rowCheckState(row) === 'all' : undefined,
    }
  }),
)

// Lazy sub-rows: request children for every expanded row that needs them. Covers user clicks,
// a controlled `v-model:expanded`, and `expandAll()` alike.
watchEffect(() => {
  if (!grid.treeMode.value) return
  for (const item of items.value) {
    if (item.expanded) grid.ensureSubRows(item.row)
  }
})
</script>

<template>
  <template v-for="item in items" :key="item.key">
    <div
      role="row"
      :class="[
        'vg-row',
        {
          'vg-row-selected': item.selected,
          'vg-row-highlighted': grid.isHighlighted(item.key),
          'vg-row-clickable': grid.rowClickable.value,
          'vg-row-expanded': item.expanded,
        },
        grid.rowClass(item.row, item.index),
        grid.ui.value.row,
      ]"
      :data-row-key="String(item.key)"
      :data-depth="depth"
      :style="depth ? { '--vg-depth': depth } : undefined"
      :aria-level="grid.treeMode.value ? depth + 1 : undefined"
      :aria-expanded="item.expandable ? item.expanded : undefined"
      :aria-selected="item.selected"
      :aria-rowindex="ariaIndexed ? item.index + 2 : undefined"
    >
      <VGridCell
        v-for="column in grid.columns.value"
        :key="column.key"
        :row="item.row"
        :row-key="item.key"
        :row-index="item.index"
        :depth="depth"
        :column="column"
      />
    </div>

    <template v-if="item.expanded">
      <div v-if="grid.hasDetail.value" role="row" class="vg-detail-row" :data-detail-for="String(item.key)">
        <div role="gridcell" tabindex="-1" :class="['vg-detail', grid.ui.value.detail]">
          <RenderSlot :fn="grid.slots.detail" :scope="{ row: item.row, rowKey: item.key, depth }" />
        </div>
      </div>

      <div
        v-if="grid.treeMode.value && (grid.subRowState(item.row) || grid.children(item.row)?.length)"
        role="rowgroup"
        :class="['vg-subgrid', grid.ui.value.subgrid]"
        :data-depth="depth + 1"
        :data-subgrid-for="String(item.key)"
        :style="{ '--vg-depth': depth + 1 }"
      >
        <div v-if="grid.subRowState(item.row)?.status === 'loading'" role="row" class="vg-status-row">
          <div role="gridcell" tabindex="-1" class="vg-status vg-status-loading" aria-live="polite">
            <span class="vg-spinner" aria-hidden="true" />
            <RenderSlot v-if="grid.slots['sub-rows-loading']" :fn="grid.slots['sub-rows-loading']" :scope="{ row: item.row }" />
            <template v-else>Loading…</template>
          </div>
        </div>
        <div v-else-if="grid.subRowState(item.row)?.status === 'error'" role="row" class="vg-status-row">
          <div role="gridcell" tabindex="-1" class="vg-status vg-status-error">
            <span>Could not load rows.</span>
            <button type="button" class="vg-button" @click="grid.retrySubRows(item.row)">Retry</button>
          </div>
        </div>
        <VGridRows v-else-if="grid.children(item.row)?.length" :rows="grid.children(item.row)!" :depth="depth + 1" />
      </div>
    </template>
  </template>
</template>
