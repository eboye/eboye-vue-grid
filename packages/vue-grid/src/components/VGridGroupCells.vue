<script setup lang="ts">
import { computed, inject } from 'vue'
import type { RowGroup } from '../core/grouping'
import { FORMAT_CONTEXT_KEY } from '../registry/plugin'
import { formatNumber } from '../renderers/format'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import { RenderSlot } from '../internal/RenderSlot'

/**
 * The cells of a group row (row grouping feature). The first data column holds the expander, the
 * group's value (`#group-<key>` slot, else the grouped column's renderer) and its row count; it
 * spans the columns after it up to the next one with an aggregate (or a pin boundary). Columns with
 * an `aggregate` show the group's value, like the totals row.
 */
const props = defineProps<{ group: RowGroup; depth: number }>()

const grid = useInternalGrid()
const format = inject(FORMAT_CONTEXT_KEY, undefined)

interface Part {
  column: ResolvedColumn
  span: number
  kind: 'select' | 'label' | 'aggregate' | 'empty'
}

const hasAggregate = (c: ResolvedColumn) => c.kind === 'data' && c.def.aggregate !== undefined && c.key in props.group.aggregates

const parts = computed<Part[]>(() => {
  const cols = grid.columns.value
  const out: Part[] = []
  for (let i = 0; i < cols.length; i++) {
    const column = cols[i]!
    if (column.kind === 'select') {
      out.push({ column, span: 1, kind: 'select' })
      continue
    }
    if (column.isTree) {
      // The label runs over the empty cells after it, within the same pin side.
      let span = 1
      while (i + span < cols.length && !hasAggregate(cols[i + span]!) && cols[i + span]!.pinned === column.pinned) span++
      out.push({ column, span, kind: 'label' })
      i += span - 1
      continue
    }
    out.push({ column, span: 1, kind: hasAggregate(column) ? 'aggregate' : 'empty' })
  }
  return out
})

const count = computed(() => (format ? formatNumber(props.group.rows.length, format.value) : String(props.group.rows.length)))
const blank = computed(() => {
  const v = props.group.value
  return v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))
})
/** The grouped column, resolved (renderer and options), when it is visible. */
const groupColumn = computed(() => grid.columns.value.find((c) => c.key === props.group.column.key))
const groupSlot = computed(() => grid.slots[`group-${props.group.column.key}`])
const expanded = computed(() => grid.isExpanded(props.group.key))
const firstRow = computed(() => props.group.rows[0])

const cellClass = (column: ResolvedColumn) =>
  typeof column.def.cellClass === 'function' ? undefined : column.def.cellClass

function onLabelClick(event: MouseEvent) {
  const interactive = (event.target as Element).closest('a, button, input, select, textarea, label, summary')
  if (interactive && (event.currentTarget as Element).contains(interactive)) return
  grid.toggleExpanded(props.group)
}
</script>

<template>
  <div
    v-for="part in parts"
    :key="part.column.key"
    :role="grid.cellRole"
    :tabindex="grid.rovingTabindex"
    :data-col-key="part.column.key"
    :aria-colspan="part.span > 1 ? part.span : undefined"
    :class="[
      'vg-cell',
      `vg-align-${part.kind === 'label' ? 'start' : part.column.align}`,
      {
        'vg-cell-select': part.kind === 'select',
        'vg-cell-tree': part.column.isTree,
        'vg-rowgroup-cell': part.kind === 'label',
        [`vg-pin-${part.column.pinned}`]: part.column.pinned,
        'vg-pin-edge': part.column.pinEdge,
        'vg-col-sized': part.column.kind === 'data' && grid.resize?.isSized(part.column.key),
      },
      part.kind === 'aggregate' ? cellClass(part.column) : undefined,
      grid.ui.value.cell,
    ]"
    :style="[part.span > 1 ? { 'grid-column': `span ${part.span}` } : undefined, grid.pinStyle(part.column.key)]"
    @click="part.kind === 'label' ? onLabelClick($event) : undefined"
  >
    <template v-if="part.kind === 'select'">
      <component
        :is="grid.Checkbox"
        v-if="grid.selectMode.value === 'multi'"
        type="checkbox"
        :checked="grid.rowCheckState(group) === 'all'"
        :indeterminate="grid.rowCheckState(group) === 'some'"
        :disabled="!grid.isRowSelectable(group)"
        label="Select group"
        @toggle="(range: boolean) => grid.toggleRow(group, range)"
      />
    </template>
    <template v-else-if="part.kind === 'label'">
      <span class="vg-tree-gutter">
        <button
          type="button"
          class="vg-expander"
          :tabindex="grid.rovingTabindex"
          :aria-expanded="expanded"
          :aria-label="expanded ? 'Collapse group' : 'Expand group'"
          @click.stop="grid.toggleExpanded(group)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" class="vg-expander-icon">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </span>
      <div class="vg-cell-content vg-rowgroup-label">
        <span class="vg-rowgroup-name">{{ group.column.header ?? group.column.key }}</span>
        <RenderSlot
          v-if="groupSlot"
          :fn="groupSlot"
          :scope="{ value: group.value, count: group.rows.length, rows: group.rows, column: group.column, group }"
        />
        <span v-else-if="blank" class="vg-rowgroup-value vg-rowgroup-blank">(blank)</span>
        <span v-else-if="group.column.groupValue || !groupColumn?.component" class="vg-rowgroup-value">{{ String(group.value) }}</span>
        <span v-else class="vg-rowgroup-value">
          <component
            :is="groupColumn.component"
            :value="group.value"
            :row="firstRow"
            :row-key="group.key"
            :row-index="-1"
            :depth="depth"
            :column="groupColumn.def"
            :options="groupColumn.options"
          />
        </span>
        <span class="vg-rowgroup-count" :aria-label="`${count} rows`">{{ count }}</span>
      </div>
    </template>
    <div v-else-if="part.kind === 'aggregate'" class="vg-cell-content">
      <RenderSlot
        v-if="grid.slots[`total-${part.column.key}`]"
        :fn="grid.slots[`total-${part.column.key}`]"
        :scope="{ value: group.aggregates[part.column.key], column: part.column.def, group }"
      />
      <template v-else-if="part.column.def.aggregate === 'count'">{{
        format ? formatNumber(group.aggregates[part.column.key], format) : group.aggregates[part.column.key]
      }}</template>
      <component
        :is="part.column.component"
        v-else-if="part.column.component"
        :value="group.aggregates[part.column.key]"
        :row="group.aggregates"
        :row-key="group.key"
        :row-index="-1"
        :depth="depth"
        :column="part.column.def"
        :options="part.column.options"
      />
      <template v-else>{{ group.aggregates[part.column.key] ?? '' }}</template>
    </div>
  </div>
</template>
