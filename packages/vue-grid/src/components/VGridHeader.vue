<script setup lang="ts">
import type { SelectionSummary } from '../core/selection'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import { RenderSlot } from '../internal/RenderSlot'
import type { SortState } from '../types'

const props = defineProps<{
  sort: SortState | null | undefined
  allState: SelectionSummary
  hasSelectableRows: boolean
  dragging: string | null
  dropTarget: { key: string; side: 'before' | 'after' } | null
  canReorder: (key: string) => boolean
}>()

const emit = defineEmits<{
  sort: [key: string]
  toggleAll: []
  dragStart: [event: PointerEvent, key: string]
  headerClick: [event: MouseEvent]
}>()

const grid = useInternalGrid()

function ariaSort(col: ResolvedColumn) {
  if (!grid.sortable(col.def)) return undefined
  if (props.sort?.key !== col.key) return 'none'
  return props.sort.dir === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <div role="row" :class="['vg-header', grid.ui.value.header]" @click.capture="emit('headerClick', $event)">
    <div
      v-for="col in grid.columns.value"
      :key="col.key"
      role="columnheader"
      :tabindex="grid.rovingTabindex"
      :data-col-key="col.key"
      :aria-sort="ariaSort(col)"
      :title="col.def.headerTooltip"
      :class="[
        'vg-header-cell',
        `vg-align-${col.align}`,
        {
          'vg-header-select': col.kind === 'select',
          'vg-sorted': grid.sortable(col.def) && sort?.key === col.key,
          'vg-reorderable': col.kind === 'data' && canReorder(col.key),
          'vg-dragging': dragging === col.key,
          'vg-drop-before': dropTarget?.key === col.key && dropTarget.side === 'before',
          'vg-drop-after': dropTarget?.key === col.key && dropTarget.side === 'after',
          [`vg-pin-${col.pinned}`]: col.pinned,
          'vg-pin-edge': col.pinEdge,
          'vg-filtered': col.kind === 'data' && grid.filters?.isActive(col.key),
          'vg-has-filter-row': grid.filters?.filterRow.value,
        },
        col.def.headerClass,
        grid.ui.value.headerCell,
      ]"
      :style="grid.pinStyle(col.key)"
      @pointerdown="col.kind === 'data' && emit('dragStart', $event, col.key)"
      @contextmenu="col.kind === 'data' && grid.onHeaderContextMenu(col, $event, $event.currentTarget as HTMLElement)"
    >
      <template v-if="col.kind === 'select'">
        <component
          :is="grid.Checkbox"
          v-if="grid.selectMode.value === 'multi'"
          :checked="allState === 'all'"
          :indeterminate="allState === 'some'"
          :disabled="!hasSelectableRows"
          label="Select all rows"
          @toggle="emit('toggleAll')"
        />
      </template>
      <template v-else>
        <button
          v-if="grid.sortable(col.def)"
          type="button"
          class="vg-sort"
          :tabindex="grid.rovingTabindex"
          @click="emit('sort', col.key)"
        >
          <span class="vg-header-label">
            <RenderSlot v-if="grid.slots[`header-${col.key}`]" :fn="grid.slots[`header-${col.key}`]" :scope="{ column: col.def }" />
            <template v-else>{{ col.def.header ?? col.key }}</template>
          </span>
          <svg class="vg-sort-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path class="vg-sort-up" d="M4.5 6.5 8 3l3.5 3.5" />
            <path class="vg-sort-down" d="M4.5 9.5 8 13l3.5-3.5" />
          </svg>
        </button>
        <span v-else class="vg-header-label">
          <RenderSlot v-if="grid.slots[`header-${col.key}`]" :fn="grid.slots[`header-${col.key}`]" :scope="{ column: col.def }" />
          <template v-else>{{ col.def.header ?? col.key }}</template>
        </span>
        <template v-if="grid.filters && col.def.filterable">
          <component :is="grid.filters.FilterButton" :column="col" />
          <component
            :is="grid.filters.FilterInput"
            v-if="grid.filters.filterRow.value"
            :column="col.def"
            :type="grid.filters.typeOf(col.def)"
            :model-value="grid.filters.state.value.columns[col.key]"
            @update:model-value="grid.filters.setColumnFilter(col.key, $event)"
            @open="grid.filters.open(col.key)"
          />
        </template>
      </template>
    </div>
  </div>
</template>
