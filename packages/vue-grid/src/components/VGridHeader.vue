<script setup lang="ts">
import type { SelectionSummary } from '../core/selection'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import { RenderSlot } from '../internal/RenderSlot'
import type { SortState } from '../types'
import VGridCheckbox from './VGridCheckbox.vue'

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
  if (!col.def.sortable) return undefined
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
      tabindex="-1"
      :data-col-key="col.key"
      :aria-sort="ariaSort(col)"
      :title="col.def.headerTooltip"
      :class="[
        'vg-header-cell',
        `vg-align-${col.align}`,
        {
          'vg-header-select': col.kind === 'select',
          'vg-sorted': col.def.sortable && sort?.key === col.key,
          'vg-reorderable': col.kind === 'data' && canReorder(col.key),
          'vg-dragging': dragging === col.key,
          'vg-drop-before': dropTarget?.key === col.key && dropTarget.side === 'before',
          'vg-drop-after': dropTarget?.key === col.key && dropTarget.side === 'after',
          [`vg-pin-${col.pinned}`]: col.pinned,
          'vg-pin-edge': col.pinEdge,
        },
        col.def.headerClass,
        grid.ui.value.headerCell,
      ]"
      :style="grid.pinStyle(col.key)"
      @pointerdown="col.kind === 'data' && emit('dragStart', $event, col.key)"
    >
      <template v-if="col.kind === 'select'">
        <VGridCheckbox
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
          v-if="col.def.sortable"
          type="button"
          class="vg-sort"
          tabindex="-1"
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
      </template>
    </div>
  </div>
</template>
