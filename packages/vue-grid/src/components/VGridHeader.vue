<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import type { SelectionSummary } from '../core/selection'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import { partOn, useMessages, useParts } from '../internal/messages'
import { RenderSlot } from '../internal/RenderSlot'
import type { SortState } from '../types'

const props = defineProps<{
  /** The sort keys, the first one first. */
  sorts: readonly SortState[]
  allState: SelectionSummary
  hasSelectableRows: boolean
  dragging: string | null
  dropTarget: { key: string; side: 'before' | 'after' } | null
  canReorder: (key: string) => boolean
}>()

const emit = defineEmits<{
  /** `add`: Shift was held (multi-column sort adds the column). */
  sort: [key: string, add: boolean]
  toggleAll: []
  dragStart: [event: PointerEvent, key: string]
  headerClick: [event: MouseEvent]
}>()

const grid = useInternalGrid()
const m = useMessages()

// The header sticks to the top: publish its height on the scroll container, so a row scrolled
// into view (arrow keys, scrollToRow) lands below it, not under it (`scroll-padding` in base.css).
const row = shallowRef<HTMLElement>()
let observer: ResizeObserver | undefined
watch(
  row,
  (el) => {
    observer?.disconnect()
    const cell = el?.firstElementChild as HTMLElement | null | undefined
    const host = el?.closest<HTMLElement>('.vg')
    if (!cell || !host || typeof ResizeObserver === 'undefined') return
    const publish = () => host.style.setProperty('--vg-header-height', `${cell.offsetHeight}px`)
    observer = new ResizeObserver(publish)
    observer.observe(cell)
    publish()
  },
  { flush: 'post' },
)
onBeforeUnmount(() => observer?.disconnect())
const parts = useParts()
const part = (name: Parameters<typeof partOn>[1]) => partOn(parts.value, name)

/** A column's place in the sort (0-based) and direction, if it is sorted. */
function sortOf(col: ResolvedColumn) {
  const i = props.sorts.findIndex((s) => s.key === col.key)
  return i < 0 ? undefined : { index: i, dir: props.sorts[i]!.dir }
}
/** `aria-sort` goes on one column only (the first key), as the ARIA grid pattern has it. */
function ariaSort(col: ResolvedColumn) {
  if (!grid.sortable(col.def)) return undefined
  const s = sortOf(col)
  if (!s || s.index > 0) return 'none'
  return s.dir === 'asc' ? 'ascending' : 'descending'
}
</script>

<template>
  <div
    ref="row"
    role="row"
    :class="['vg-header', grid.ui.value.header]"
    @click.capture="emit('headerClick', $event)"
  >
    <div
      v-for="col in grid.shownColumns.value"
      :key="col.key"
      role="columnheader"
      :tabindex="grid.rovingTabindex"
      :data-col-key="col.key"
      :aria-sort="ariaSort(col)"
      :data-sort-dir="grid.sortable(col.def) ? sortOf(col)?.dir : undefined"
      v-bind="tipAttrs(col.def.headerTooltip, { describe: true })"
      :class="[
        'vg-header-cell',
        `vg-align-${col.align}`,
        {
          'vg-header-select': col.kind === 'select',
          'vg-sorted': grid.sortable(col.def) && !!sortOf(col),
          'vg-reorderable': col.kind === 'data' && canReorder(col.key),
          'vg-dragging': dragging === col.key,
          'vg-drop-before': dropTarget?.key === col.key && dropTarget.side === 'before',
          'vg-drop-after': dropTarget?.key === col.key && dropTarget.side === 'after',
          [`vg-pin-${col.pinned}`]: col.pinned,
          'vg-pin-edge': col.pinEdge,
          'vg-filtered': col.kind === 'data' && grid.filters?.isActive(col.key),
          'vg-has-filter-row': grid.filters?.filterRow.value,
          'vg-col-sized': col.kind === 'data' && grid.resize?.isSized(col.key),
        },
        col.def.headerClass,
        grid.ui.value.headerCell,
      ]"
      :style="grid.pinStyle(col.key)"
      :aria-colindex="grid.cols?.at(col.key)"
      @pointerdown="col.kind === 'data' && part('headerDrag') && emit('dragStart', $event, col.key)"
      @contextmenu="
        col.kind === 'data' &&
        grid.onHeaderContextMenu(col, $event, $event.currentTarget as HTMLElement)
      "
    >
      <template v-if="col.kind === 'select'">
        <component
          :is="grid.Checkbox"
          v-if="grid.selectMode.value === 'multi' && part('selectAll')"
          :checked="allState === 'all'"
          :indeterminate="allState === 'some'"
          :disabled="!hasSelectableRows"
          :label="m.selectAllRows ?? 'Select all rows'"
          @toggle="emit('toggleAll')"
        />
        <!-- a column header needs a name; without the select-all box, say what the column is -->
        <span v-else class="vg-sr-only">{{ m.selectRow ?? 'Select row' }}</span>
      </template>
      <template v-else-if="col.kind === 'data'">
        <button
          v-if="grid.sortable(col.def)"
          type="button"
          class="vg-sort"
          :tabindex="grid.rovingTabindex"
          @click="emit('sort', col.key, $event.shiftKey)"
          @keydown.enter.shift.prevent="emit('sort', col.key, true)"
        >
          <span class="vg-header-label">
            <RenderSlot
              v-if="grid.slots[`header-${col.key}`]"
              :fn="grid.slots[`header-${col.key}`]"
              :scope="{ column: col.def }"
            />
            <template v-else>{{ col.def.header ?? col.key }}</template>
          </span>
          <svg class="vg-sort-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path class="vg-sort-up" d="M4.5 6.5 8 3l3.5 3.5" />
            <path class="vg-sort-down" d="M4.5 9.5 8 13l3.5-3.5" />
          </svg>
          <component
            :is="grid.SortMarker"
            v-if="grid.SortMarker && sorts.length > 1 && sortOf(col)"
            :position="sortOf(col)!.index + 1"
            :count="sorts.length"
            :dir="sortOf(col)!.dir"
          />
        </button>
        <span v-else class="vg-header-label">
          <RenderSlot
            v-if="grid.slots[`header-${col.key}`]"
            :fn="grid.slots[`header-${col.key}`]"
            :scope="{ column: col.def }"
          />
          <template v-else>{{ col.def.header ?? col.key }}</template>
        </span>
        <template v-if="grid.filters && col.def.filterable">
          <component :is="grid.filters.FilterButton" v-if="part('filterButtons')" :column="col" />
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
        <component
          :is="grid.resize.Handle"
          v-if="grid.resize?.can(col.def) && part('resizeGrips')"
          :column-key="col.key"
          :label="col.def.header ?? col.key"
        />
      </template>
      <span v-else-if="col.kind === 'drag'" class="vg-sr-only">{{ m.moveRow ?? 'Move row' }}</span>
    </div>
  </div>
</template>
