<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import { RenderSlot } from '../internal/RenderSlot'
import type { ColumnHeaderGroup } from '../types'

const props = defineProps<{ levels: number; indexed: boolean }>()
const grid = useInternalGrid()

interface Segment {
  group: ColumnHeaderGroup | undefined
  pathKey: string
  start: number
  span: number
  pinned: ResolvedColumn['pinned']
  first: string
  last: string
}

const rows = computed<Segment[][]>(() => {
  const levels = Array.from({ length: props.levels }, (): Segment[] => [])
  grid.columns.value.forEach((column, index) => {
    const label = column.def.group
    const path =
      column.kind === 'data' ? (column.def.groupPath ?? (label ? [{ key: label, label }] : [])) : []
    const keys: string[] = []
    levels.forEach((segments, level) => {
      const group = path[level]
      if (group) keys.push(group.key)
      const pathKey = JSON.stringify(keys)
      const previous = segments.at(-1)
      if (
        previous &&
        !!previous.group === !!group &&
        previous.pathKey === pathKey &&
        previous.pinned === column.pinned
      ) {
        previous.span++
        previous.last = column.key
      } else {
        segments.push({
          group,
          pathKey,
          start: index + 1,
          span: 1,
          pinned: column.pinned,
          first: column.key,
          last: column.key,
        })
      }
    })
  })
  return levels
})

// Each level is sticky immediately below its predecessors. Measure one cell per level because
// the CSS grid stretches all its cells to the same track height. The outermost level covers the
// full set of columns, so it also gives the pinned widths used by all scrolling labels.
const stack = shallowRef<HTMLElement>()
let observer: ResizeObserver | undefined
const vars = ['--vg-group-row-height', '--vg-group-stick-start', '--vg-group-stick-end'] as const
watch(
  [stack, rows],
  ([el]) => {
    observer?.disconnect()
    const host = el?.closest<HTMLElement>('.vg')
    if (!el || !host) return
    const groupRows = Array.from(el.children) as HTMLElement[]
    const pinned = (side: string) =>
      (Array.from(groupRows[0]?.children ?? []) as HTMLElement[]).filter((cell) =>
        cell.classList.contains(`vg-pin-${side}`),
      )
    const left = pinned('left')
    const right = pinned('right')
    const width = (cells: HTMLElement[]) => cells.reduce((sum, cell) => sum + cell.offsetWidth, 0)
    const publish = () => {
      let top = 0
      for (const row of groupRows) {
        row.style.setProperty('--vg-group-offset', `${top}px`)
        top += (row.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0
      }
      host.style.setProperty(vars[0], `${top}px`)
      host.style.setProperty(vars[1], `${width(left)}px`)
      host.style.setProperty(vars[2], `${width(right)}px`)
    }
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(publish)
      for (const row of groupRows)
        if (row.firstElementChild) observer.observe(row.firstElementChild)
      for (const cell of [...left, ...right]) observer.observe(cell)
    }
    publish()
  },
  { flush: 'post' },
)
onBeforeUnmount(() => {
  observer?.disconnect()
  const host = stack.value?.closest<HTMLElement>('.vg')
  for (const name of vars) host?.style.removeProperty(name)
})
</script>

<template>
  <div ref="stack" role="presentation" class="vg-group-stack">
    <div
      v-for="(segments, level) in rows"
      :key="level"
      role="row"
      class="vg-header-groups"
      :data-group-level="level"
      :aria-rowindex="indexed ? level + 1 : undefined"
    >
      <div
        v-for="seg in segments"
        :key="seg.first"
        :role="seg.group ? 'columnheader' : grid.cellRole"
        :data-group-key="seg.group?.key"
        :data-group-start="seg.group ? seg.first : undefined"
        :aria-colspan="seg.span > 1 ? seg.span : undefined"
        :class="[
          'vg-group-cell',
          { 'vg-group-empty': !seg.group, [`vg-pin-${seg.pinned}`]: seg.pinned },
        ]"
        :style="[
          grid.pinStyle(seg.pinned === 'right' ? seg.last : seg.first),
          { 'grid-column': `${seg.start} / span ${seg.span}` },
        ]"
      >
        <span v-if="seg.group" class="vg-group-label" @keydown.stop>
          <RenderSlot
            v-if="grid.slots['column-group']"
            :fn="grid.slots['column-group']"
            :scope="{ group: seg.group, level }"
          />
          <template v-else>{{ seg.group.label }}</template>
        </span>
      </div>
    </div>
  </div>
</template>
