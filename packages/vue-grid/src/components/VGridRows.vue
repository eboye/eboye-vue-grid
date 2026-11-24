<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import type { RowGroup } from '../core/grouping'
import type { LevelLayout } from '../core/virtual'
import { useInternalGrid } from '../internal/context'
import { RenderSlot } from '../internal/RenderSlot'
import VGridCell from './VGridCell.vue'

defineOptions({ name: 'VGridRows' })

const props = withDefaults(
  defineProps<{
    rows: readonly unknown[]
    depth?: number
    /** Index of `rows[0]` in the full row list. */
    indexOffset?: number
    /** Rows are already sorted by the parent (top level). */
    presorted?: boolean
    /**
     * Virtual mode: this level's layout. Only the blocks in view render; spacers stand in for the
     * rest, so the DOM keeps the same grid / subgrid structure as without virtual scrolling.
     */
    layout?: LevelLayout
    /** Virtual mode: px from the first top-level row to this level's first row. */
    offset?: number
    /** Virtual mode: position of this level's first row among all rendered rows (`aria-rowindex`). */
    ariaBase?: number
  }>(),
  { depth: 0, indexOffset: 0, presorted: false, layout: undefined, offset: 0, ariaBase: 0 },
)

const grid = useInternalGrid()
const virtual = grid.virtualRows
/** Virtual mode: which blocks of this level are in view, and the spacers around them. */
const level = virtual?.level(
  () => props.layout,
  () => props.offset,
  () => props.ariaBase,
)
const pads = level?.pads

const items = computed(() => {
  const span = props.layout && level?.span.value
  const rows = span
    ? props.layout!.rows.slice(span.start, span.end)
    : props.presorted
      ? props.rows
      : grid.sortRows(props.rows)
  const first = span ? span.start : 0
  return rows.map((row, i) => {
    const key = grid.getKey(row)
    const expandable = grid.canExpand(row)
    const at = first + i
    return {
      row,
      group: grid.grouping?.isGroup(row) ? (row as RowGroup) : undefined,
      key,
      index: props.indexOffset + at,
      expandable,
      expanded: expandable && grid.isExpanded(key),
      selected: grid.selectMode.value ? grid.rowCheckState(row) === 'all' : undefined,
      virtual: span ? level!.info(at, key) : undefined,
    }
  })
})

// Lazy sub-rows: request children for every expanded row that needs them. Covers user clicks,
// a controlled `v-model:expanded`, and `expandAll()` alike. (Virtual mode: rows in view only, once a
// scroll has settled, so flying past expanded rows doesn't request their children.)
watchEffect(() => {
  if (!grid.treeMode.value || (props.layout && virtual?.scrolling.value)) return
  for (const item of items.value) {
    if (item.expanded) grid.ensureSubRows(item.row)
  }
})
</script>

<template>
  <div
    v-if="pads && pads.top > 0"
    class="vg-spacer"
    aria-hidden="true"
    :style="{ height: `${pads.top}px` }"
  />
  <template v-for="item in items" :key="item.key">
    <div
      role="row"
      :class="[
        'vg-row',
        {
          'vg-row-selected': item.selected,
          'vg-row-highlighted': !item.group && grid.isHighlighted(item.key),
          'vg-row-clickable': !item.group && grid.rowClickable.value,
          'vg-row-expanded': item.expanded,
          'vg-rowgroup': item.group,
        },
        item.group ? undefined : grid.rowClass(item.row, item.index),
        grid.ui.value.row,
      ]"
      :data-row-key="String(item.key)"
      :data-depth="depth"
      :data-group-level="item.group?.level"
      :style="depth ? { '--vg-depth': depth } : undefined"
      :aria-level="grid.keyboardNav && grid.treeMode.value ? depth + 1 : undefined"
      :aria-expanded="item.expandable ? item.expanded : undefined"
      :aria-selected="grid.keyboardNav ? item.selected : undefined"
      :aria-rowindex="
        item.virtual
          ? item.virtual.ariaIndex + 1 + grid.headerRows.value + grid.pinnedTopCount.value
          : undefined
      "
    >
      <component
        :is="grid.grouping?.GroupCells"
        v-if="item.group"
        :group="item.group"
        :depth="depth"
      />
      <template v-else>
        <VGridCell
          v-for="column in grid.columns.value"
          :key="column.key"
          :row="item.row"
          :row-key="item.key"
          :row-index="item.index"
          :depth="depth"
          :column="column"
        />
      </template>
    </div>

    <template v-if="item.expanded">
      <div
        v-if="grid.hasDetail.value && !item.group"
        role="row"
        class="vg-detail-row"
        :data-detail-for="String(item.key)"
      >
        <div
          :ref="layout ? virtual?.measureDetail(item.key) : undefined"
          :role="grid.cellRole"
          :tabindex="grid.rovingTabindex"
          :class="['vg-detail', grid.ui.value.detail]"
        >
          <RenderSlot :fn="grid.slots.detail" :scope="{ row: item.row, rowKey: item.key, depth }" />
        </div>
      </div>

      <div
        v-if="
          grid.treeMode.value && (grid.subRowState(item.row) || grid.children(item.row)?.length)
        "
        :ref="layout ? virtual?.measureSubgrid : undefined"
        role="rowgroup"
        :class="['vg-subgrid', grid.ui.value.subgrid]"
        :data-depth="depth + 1"
        :data-subgrid-for="String(item.key)"
        :style="{ '--vg-depth': depth + 1 }"
      >
        <div
          v-if="grid.subRowState(item.row)?.status === 'loading'"
          role="row"
          class="vg-status-row"
        >
          <div
            :ref="layout ? virtual?.measureStatus(item.key) : undefined"
            :role="grid.cellRole"
            :tabindex="grid.rovingTabindex"
            class="vg-status vg-status-loading"
            aria-live="polite"
          >
            <span class="vg-spinner" aria-hidden="true" />
            <RenderSlot
              v-if="grid.slots['sub-rows-loading']"
              :fn="grid.slots['sub-rows-loading']"
              :scope="{ row: item.row }"
            />
            <template v-else>Loading…</template>
          </div>
        </div>
        <div
          v-else-if="grid.subRowState(item.row)?.status === 'error'"
          role="row"
          class="vg-status-row"
        >
          <div
            :ref="layout ? virtual?.measureStatus(item.key) : undefined"
            :role="grid.cellRole"
            :tabindex="grid.rovingTabindex"
            class="vg-status vg-status-error"
          >
            <span>Could not load rows.</span>
            <button type="button" class="vg-button" @click="grid.retrySubRows(item.row)">
              Retry
            </button>
          </div>
        </div>
        <VGridRows
          v-else-if="item.virtual?.childLayout"
          :rows="item.virtual.childLayout.rows"
          :depth="depth + 1"
          presorted
          :layout="item.virtual.childLayout"
          :offset="item.virtual.childOffset"
          :aria-base="item.virtual.childAriaBase"
        />
        <VGridRows
          v-else-if="!layout && grid.children(item.row)?.length"
          :rows="grid.children(item.row)!"
          :depth="depth + 1"
          :presorted="!!item.group"
        />
      </div>
    </template>
  </template>
  <div
    v-if="pads && pads.bottom > 0"
    class="vg-spacer"
    aria-hidden="true"
    :style="{ height: `${pads.bottom}px` }"
  />
</template>
