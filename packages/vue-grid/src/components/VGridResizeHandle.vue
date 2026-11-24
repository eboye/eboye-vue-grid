<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { useInternalGrid } from '../internal/context'

/** The grip on a header's end edge (column resizing feature): drag, double-click, or ←/→ when focused. */
const props = defineProps<{ columnKey: string; label: string }>()
const grid = useInternalGrid()
// Rendered by the resizing feature only, so the grid always has it here.
const resize = grid.resize!

/** ←/→ (Shift: bigger steps); Enter fits the content. */
function onKeyDown(event: KeyboardEvent) {
  const rtl = getComputedStyle(event.currentTarget as Element).direction === 'rtl'
  const step = event.shiftKey ? 64 : 16
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    resize.step(props.columnKey, ((event.key === 'ArrowRight') !== rtl ? 1 : -1) * step)
  } else if (event.key === 'Enter') {
    resize.autosize(props.columnKey)
  } else return
  event.preventDefault()
  event.stopPropagation()
}

// A focusable separator is a range: screen readers announce the column's width as its value.
const handle = shallowRef<HTMLElement>()
const width = shallowRef(0)
let observer: ResizeObserver | undefined
watch(
  handle,
  (el) => {
    observer?.disconnect()
    const cell = el?.parentElement
    if (!cell) return
    width.value = Math.round(cell.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(
      () => (width.value = Math.round(cell.getBoundingClientRect().width)),
    )
    observer.observe(cell)
  },
  { flush: 'post' },
)
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <span
    ref="handle"
    class="vg-resize-handle"
    role="separator"
    aria-orientation="vertical"
    :aria-label="`Resize ${label}`"
    :aria-valuenow="width"
    aria-valuemin="0"
    :aria-valuemax="Math.max(width, 10000)"
    :aria-valuetext="`${width} pixels wide`"
    :tabindex="grid.keyboardNav ? -1 : 0"
    @pointerdown="resize.start($event, columnKey)"
    @click.stop
    @dblclick.stop="resize.autosize(columnKey)"
    @keydown="onKeyDown"
  />
</template>
