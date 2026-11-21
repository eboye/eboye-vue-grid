<script setup lang="ts">
import { computed } from 'vue'
import { getCellValue } from '../core/value'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import type { RowKey } from '../types'
import { RenderSlot } from '../internal/RenderSlot'
import VGridCheckbox from './VGridCheckbox.vue'

const props = defineProps<{
  row: unknown
  rowKey: RowKey
  rowIndex: number
  depth: number
  column: ResolvedColumn
}>()

const grid = useInternalGrid()

const value = computed(() => (props.column.kind === 'data' ? getCellValue(props.row, props.column.def) : undefined))

const cellClass = computed(() => {
  const c = props.column.def.cellClass
  return typeof c === 'function' ? c(props.row) : c
})

const expandable = computed(() => props.column.isTree && grid.canExpand(props.row))
const expanded = computed(() => grid.isExpanded(props.rowKey))
const slotName = computed(() => `cell-${props.column.key}`)

function onAction(name: string, payload?: unknown) {
  grid.onCellAction(props.row, props.rowKey, props.column, name, payload)
}

function onClick(event: MouseEvent) {
  if (props.column.kind !== 'data') return
  // Clicks on interactive content (links, buttons, inputs) belong to that content.
  const interactive = (event.target as Element).closest('a, button, input, select, textarea, label, [role="menu"]')
  if (interactive && (event.currentTarget as Element).contains(interactive)) return
  if (props.column.def.clickable) grid.onCellClick(props.row, props.rowKey, props.column, event)
  else grid.onRowClick(props.row, props.rowKey, event)
}
</script>

<template>
  <div
    role="gridcell"
    tabindex="-1"
    :data-col-key="column.key"
    :class="[
      'vg-cell',
      `vg-align-${column.align}`,
      {
        'vg-cell-select': column.kind === 'select',
        'vg-cell-tree': column.isTree,
        'vg-cell-clickable': column.def.clickable,
        [`vg-pin-${column.pinned}`]: column.pinned,
        'vg-pin-edge': column.pinEdge,
      },
      cellClass,
      grid.ui.value.cell,
    ]"
    :style="grid.pinStyle(column.key)"
    @click="onClick"
  >
    <template v-if="column.kind === 'select'">
      <VGridCheckbox
        :type="grid.selectMode.value === 'single' ? 'radio' : 'checkbox'"
        :checked="grid.rowCheckState(row) === 'all'"
        :indeterminate="grid.rowCheckState(row) === 'some'"
        :disabled="!grid.isRowSelectable(row)"
        label="Select row"
        @toggle="grid.toggleRow(row)"
      />
    </template>
    <template v-else>
      <span v-if="column.isTree && (grid.treeMode.value || grid.hasDetail.value)" class="vg-tree-gutter">
        <button
          v-if="expandable"
          type="button"
          class="vg-expander"
          tabindex="-1"
          :aria-expanded="expanded"
          :aria-label="expanded ? 'Collapse row' : 'Expand row'"
          @click.stop="grid.toggleExpanded(row)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" class="vg-expander-icon">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </span>
      <div class="vg-cell-content">
        <RenderSlot
          v-if="grid.slots[slotName]"
          :fn="grid.slots[slotName]"
          :scope="{ row, value, rowKey, rowIndex, depth, column: column.def }"
        />
        <component
          :is="column.component"
          v-else-if="column.component"
          :value="value"
          :row="row"
          :row-key="rowKey"
          :row-index="rowIndex"
          :depth="depth"
          :column="column.def"
          :options="column.options"
          @action="onAction"
        />
        <template v-else>{{ value ?? '' }}</template>
      </div>
    </template>
  </div>
</template>
