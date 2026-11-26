<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'

/**
 * The header row of column groups (column groups feature). Adjacent visible columns with the same
 * `group` share one cell spanning them; a pin boundary splits a group, so pinned groups stay pinned.
 * Its height is published as `--vg-group-row-height` so the column headers stick right below it.
 */
const grid = useInternalGrid()

interface Segment {
  label: string | undefined
  start: number
  span: number
  pinned: ResolvedColumn['pinned']
  first: string
  last: string
}

const segments = computed<Segment[]>(() => {
  const out: Segment[] = []
  grid.columns.value.forEach((col, i) => {
    const label = col.kind === 'data' ? col.def.group : undefined
    const prev = out[out.length - 1]
    if (prev && prev.label === label && prev.pinned === col.pinned) {
      prev.span++
      prev.last = col.key
    } else {
      out.push({ label, start: i + 1, span: 1, pinned: col.pinned, first: col.key, last: col.key })
    }
  })
  return out
})

// The column headers stick below this row: publish its height on the scroll container. And the
// pinned groups' widths, which a scrolling group's sticky label stays clear of.
const row = shallowRef<HTMLElement>()
let observer: ResizeObserver | undefined
const VARS = ['--vg-group-row-height', '--vg-group-stick-start', '--vg-group-stick-end']
watch(
  [row, () => segments.value.map((s) => `${s.first}:${s.span}:${s.pinned ?? ''}`).join('|')],
  ([el]) => {
    observer?.disconnect()
    const cells = Array.from((el?.children ?? []) as HTMLCollectionOf<HTMLElement>)
    const grid = el?.closest<HTMLElement>('.vg')
    if (!cells.length || !grid || typeof ResizeObserver === 'undefined') return
    const pinned = (side: string) => cells.filter((c) => c.classList.contains(`vg-pin-${side}`))
    const publish = () => {
      const width = (side: string) => pinned(side).reduce((sum, c) => sum + c.offsetWidth, 0)
      grid.style.setProperty(VARS[0]!, `${cells[0]!.offsetHeight}px`)
      grid.style.setProperty(VARS[1]!, `${width('left')}px`)
      grid.style.setProperty(VARS[2]!, `${width('right')}px`)
    }
    observer = new ResizeObserver(publish)
    for (const c of [cells[0]!, ...pinned('left'), ...pinned('right')]) observer.observe(c)
    publish()
  },
  { flush: 'post' },
)
onBeforeUnmount(() => {
  observer?.disconnect()
  const grid = row.value?.closest<HTMLElement>('.vg')
  for (const v of VARS) grid?.style.removeProperty(v)
})
</script>

<template>
  <div ref="row" role="row" class="vg-header-groups">
    <div
      v-for="seg in segments"
      :key="`${seg.first}:${seg.label ?? ''}`"
      :role="seg.label ? 'columnheader' : grid.cellRole"
      :aria-colspan="seg.span > 1 ? seg.span : undefined"
      :class="[
        'vg-group-cell',
        { 'vg-group-empty': !seg.label, [`vg-pin-${seg.pinned}`]: seg.pinned },
      ]"
      :style="[
        grid.pinStyle(seg.pinned === 'right' ? seg.last : seg.first),
        { 'grid-column': `${seg.start} / span ${seg.span}` },
      ]"
    >
      <span v-if="seg.label" class="vg-group-label">{{ seg.label }}</span>
    </div>
  </div>
</template>
