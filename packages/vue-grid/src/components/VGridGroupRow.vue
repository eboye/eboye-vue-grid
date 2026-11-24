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

// The column headers stick below this row: publish its height on the scroll container.
const row = shallowRef<HTMLElement>()
let observer: ResizeObserver | undefined
watch(
  row,
  (el) => {
    observer?.disconnect()
    const first = el?.firstElementChild as HTMLElement | null
    const grid = el?.closest<HTMLElement>('.vg')
    if (!first || !grid || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(() =>
      grid.style.setProperty('--vg-group-row-height', `${first.offsetHeight}px`),
    )
    observer.observe(first)
    grid.style.setProperty('--vg-group-row-height', `${first.offsetHeight}px`)
  },
  { flush: 'post' },
)
onBeforeUnmount(() => {
  observer?.disconnect()
  row.value?.closest<HTMLElement>('.vg')?.style.removeProperty('--vg-group-row-height')
})
</script>

<template>
  <div ref="row" role="row" class="vg-header-groups">
    <div
      v-for="seg in segments"
      :key="`${seg.first}:${seg.label ?? ''}`"
      role="columnheader"
      :aria-colspan="seg.span > 1 ? seg.span : undefined"
      :class="[
        'vg-group-cell',
        { 'vg-group-empty': !seg.label, [`vg-pin-${seg.pinned}`]: seg.pinned },
      ]"
      :style="[
        { 'grid-column': `${seg.start} / span ${seg.span}` },
        grid.pinStyle(seg.pinned === 'right' ? seg.last : seg.first),
      ]"
    >
      <span v-if="seg.label" class="vg-group-label">{{ seg.label }}</span>
    </div>
  </div>
</template>
