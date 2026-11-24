<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { getCellValue } from '../core/value'
import { toNumber } from '../renderers/format'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import type { FlashMode, RowKey } from '../types'
import { RenderSlot } from '../internal/RenderSlot'

const props = withDefaults(
  defineProps<{
    row: unknown
    rowKey: RowKey
    rowIndex: number
    depth: number
    column: ResolvedColumn
    /** A cell of a pinned row: no expander. */
    pinned?: boolean
    /** Pinned rows: show the selection checkbox. */
    selectable?: boolean
  }>(),
  { pinned: false, selectable: true },
)

const grid = useInternalGrid()

const value = computed(() => (props.column.kind === 'data' ? getCellValue(props.row, props.column.def) : undefined))

// ── Change highlight ──────────────────────────────────────────────────────────────────────
// The animation is pure CSS; this only notices a changed value and flips `data-vg-flash`
// between 1 and 2 (two identical keyframes), which restarts the animation on every change.
const flashMode = computed<FlashMode>(() =>
  props.column.kind === 'data' ? (props.column.def.flash ?? grid.flash.value) : false,
)
const flash = shallowRef<{ n: 1 | 2; dir?: 'up' | 'down' } | null>(null)
const same = (a: unknown, b: unknown) => {
  if (Object.is(a, b)) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  try {
    return JSON.stringify(a) === JSON.stringify(b) // new object, same content (e.g. a re-fetched row)
  } catch {
    return false
  }
}
watch(value, (next, prev) => {
  if (!flashMode.value || same(next, prev)) return
  let dir: 'up' | 'down' | undefined
  if (flashMode.value === 'direction') {
    const a = toNumber(prev)
    const b = toNumber(next)
    if (a !== null && b !== null && a !== b) dir = b > a ? 'up' : 'down'
  }
  flash.value = { n: flash.value?.n === 1 ? 2 : 1, dir }
})

const cellClass = computed(() => {
  const c = props.column.def.cellClass
  return typeof c === 'function' ? c(props.row) : c
})

const expandable = computed(() => !props.pinned && props.column.isTree && grid.canExpand(props.row))
const expanded = computed(() => grid.isExpanded(props.rowKey))
const slotName = computed(() => `cell-${props.column.key}`)

function onAction(name: string, payload?: unknown) {
  grid.onCellAction(props.row, props.rowKey, props.column, name, payload)
}

function onContextMenu(event: MouseEvent) {
  if (props.column.kind !== 'data') return
  grid.onCellContextMenu(props.row, props.rowKey, props.column, event, event.currentTarget as HTMLElement)
}

function onPointerDown(event: PointerEvent) {
  if (props.column.kind !== 'data' || event.pointerType !== 'touch') return
  grid.onCellPointerDown?.(props.row, props.rowKey, props.column, event, event.currentTarget as HTMLElement)
}

function onClick(event: MouseEvent) {
  if (props.column.kind !== 'data') return
  // Clicks on interactive content (links, buttons, inputs) belong to that content.
  const interactive = (event.target as Element).closest('a, button, input, select, textarea, label, summary, [role="menu"]')
  if (interactive && (event.currentTarget as Element).contains(interactive)) return
  if (props.column.def.clickable) grid.onCellClick(props.row, props.rowKey, props.column, event)
  else grid.onRowClick(props.row, props.rowKey, event)
}
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
        'vg-cell-clickable': column.def.clickable,
        [`vg-pin-${column.pinned}`]: column.pinned,
        'vg-pin-edge': column.pinEdge,
        'vg-col-sized': column.kind === 'data' && grid.resize?.isSized(column.key),
      },
      cellClass,
      grid.ui.value.cell,
    ]"
    :style="grid.pinStyle(column.key)"
    :data-vg-flash="flash?.n"
    :data-vg-flash-dir="flash?.dir"
    @click="onClick"
    @contextmenu="onContextMenu"
    @pointerdown="onPointerDown"
  >
    <template v-if="column.kind === 'select'">
      <component
        :is="grid.Checkbox"
        v-if="selectable"
        :type="grid.selectMode.value === 'single' ? 'radio' : 'checkbox'"
        :checked="grid.rowCheckState(row) === 'all'"
        :indeterminate="grid.rowCheckState(row) === 'some'"
        :disabled="!grid.isRowSelectable(row)"
        label="Select row"
        @toggle="(range: boolean) => grid.toggleRow(row, range)"
      />
    </template>
    <template v-else>
      <span v-if="column.isTree && (grid.treeMode.value || grid.hasDetail.value)" class="vg-tree-gutter">
        <button
          v-if="expandable"
          type="button"
          class="vg-expander"
          :tabindex="grid.rovingTabindex"
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
