<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { useInternalGrid, type PinnedRowItem } from '../internal/context'
import VGridCell from './VGridCell.vue'
import VGridTotalCell from './VGridTotalCell.vue'

/**
 * A sticky section of pinned rows above or below the body (row pinning, and the totals row of the
 * aggregation feature). One `subgrid` container: its rows share the grid's columns, and it sticks
 * as one piece, so any number of rows stays in view without measuring each.
 */
const props = defineProps<{
  position: 'top' | 'bottom'
  items: readonly PinnedRowItem[]
  /** Virtual mode: `aria-rowindex` of the first row (the grid then names every row's position). */
  ariaStart?: number
}>()

const grid = useInternalGrid()
/** `row-attrs` (attributes feature; nothing without it). */
const vExtraAttrs = grid.attrs?.directive

// The top section sticks right under the header (whose height the header publishes), and both
// keep focused rows clear of themselves (`scroll-padding`): publish the section's height on the
// scroll container.
const section = shallowRef<HTMLElement>()
let observer: ResizeObserver | undefined
let host: HTMLElement | null = null
const heightVar = () => `--vg-pinned-${props.position}-height`
watch(
  section,
  (el) => {
    observer?.disconnect()
    host = el?.closest<HTMLElement>('.vg') ?? null
    if (!el || !host || typeof ResizeObserver === 'undefined') return
    const grid = host
    const publish = () => grid.style.setProperty(heightVar(), `${el.offsetHeight}px`)
    observer = new ResizeObserver(publish)
    observer.observe(el)
    publish()
  },
  { flush: 'post' },
)
onBeforeUnmount(() => {
  observer?.disconnect()
  host?.style.removeProperty(heightVar())
})
</script>

<template>
  <div ref="section" role="rowgroup" :class="['vg-pinned-rows', `vg-pinned-${position}`]">
    <div
      v-for="(item, i) in items"
      :key="item.id"
      v-extra-attrs="grid.attrs?.pinnedRow(item, i, position)"
      role="row"
      :class="[
        'vg-row',
        'vg-row-pinned',
        item.kind === 'total'
          ? 'vg-row-total'
          : [
              {
                'vg-row-selected':
                  grid.selectMode.value &&
                  item.selectable &&
                  grid.rowCheckState(item.row) === 'all',
                'vg-row-highlighted': grid.isHighlighted(item.key),
                'vg-row-clickable': grid.rowClickable.value,
              },
              grid.rowClass(item.row, i),
              grid.ui.value.row,
            ],
      ]"
      :data-pinned-key="item.kind === 'total' ? undefined : String(item.key)"
      :aria-rowindex="ariaStart !== undefined ? ariaStart + i : undefined"
      :aria-label="item.kind === 'total' ? grid.totals?.label.value : undefined"
    >
      <template v-if="item.kind === 'total'">
        <VGridTotalCell
          v-for="column in grid.shownColumns.value"
          :key="column.key"
          :column="column"
          :row="item.row"
        />
      </template>
      <template v-else>
        <VGridCell
          v-for="column in grid.shownColumns.value"
          :key="column.key"
          :row="item.row"
          :row-key="item.key"
          :row-index="i"
          :depth="0"
          :column="column"
          pinned
          :pinned-side="position"
          :selectable="item.selectable"
        />
      </template>
    </div>
  </div>
</template>
