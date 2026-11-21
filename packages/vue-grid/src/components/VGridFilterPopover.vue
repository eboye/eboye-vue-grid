<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, shallowRef, useId } from 'vue'
import { anchorNameFor, trackAnchor } from '../internal/anchor'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'

// The panel is loaded on demand (own chunk) when a filter popover first opens.
const VGridFilterPanel = defineAsyncComponent(() => import('./VGridFilterPanel.vue'))

/**
 * A column's funnel button and its filter popover. Declarative: the button is the popover's
 * `popovertarget` invoker and its CSS anchor; JS only renders the panel while open (and runs the
 * anchor fallback where CSS anchor positioning is missing).
 */
const props = defineProps<{ column: ResolvedColumn }>()

// Rendered by the filtering feature only, so the grid always has filters here.
const filters = useInternalGrid().filters!
const anchor = anchorNameFor(`filter-${useId()}`)
const id = computed(() => filters.idFor(props.column.key))
const button = shallowRef<HTMLButtonElement>()
const panel = shallowRef<HTMLElement>()
const open = shallowRef(false)
const label = computed(() => props.column.def.header ?? props.column.key)
const active = computed(() => filters.isActive(props.column.key))
const type = computed(() => filters.typeOf(props.column.def))
/** A value-list loader from the column (`filter: { options: (search, { signal }) => … }`). */
const loader = computed(() => {
  const options = typeof props.column.def.filter === 'object' ? props.column.def.filter.options : undefined
  return typeof options === 'function' ? options : undefined
})

let stopTracking = () => {}
onBeforeUnmount(() => stopTracking())
function onToggle(event: Event) {
  open.value = (event as ToggleEvent).newState === 'open'
  stopTracking()
  if (open.value && panel.value && button.value) stopTracking = trackAnchor(panel.value, button.value, 'bottom-end')
  // The panel renders only while open (and loads lazily), so it focuses its own first field on mount.
}
// Events inside the popover must not reach the header cell (drag, sort, header menu).
const stop = (e: Event) => e.stopPropagation()
</script>

<template>
  <button
    ref="button"
    type="button"
    :class="['vg-icon-button', 'vg-filter-button', { 'vg-filter-on': active }]"
    tabindex="-1"
    :aria-label="active ? `Filter ${label} (active)` : `Filter ${label}`"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-controls="id"
    :popovertarget="id"
    :style="{ 'anchor-name': anchor }"
    @pointerdown="stop"
    @click="stop"
  >
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 3.5h11l-4.25 5v4l-2.5 1.25V8.5z" />
    </svg>
  </button>
  <div
    :id="id"
    ref="panel"
    popover="auto"
    role="dialog"
    :aria-label="`Filter ${label}`"
    class="vg-menu vg-filter-popover"
    data-placement="bottom-end"
    :style="{ 'position-anchor': anchor }"
    @toggle="onToggle"
    @pointerdown="stop"
    @click="stop"
    @contextmenu="stop"
    @keydown="stop"
  >
    <VGridFilterPanel
      v-if="open"
      :column="column.def"
      :type="type"
      :model-value="filters.state.value.columns[column.key]"
      :values="type === 'set' ? filters.distinct(column.key) : []"
      :load-values="loader"
      @update:model-value="filters.setColumnFilter(column.key, $event)"
    />
  </div>
</template>
