<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId } from 'vue'
import { normalizeColumnState, setColumnHidden } from '../core/columns'
import { anchorNameFor, trackAnchor } from '../internal/anchor'
import type { ColumnDef, ColumnState } from '../types'
import { useMessages } from '../internal/messages'

const props = withDefaults(
  defineProps<{
    columns: readonly ColumnDef[]
    /** The button. Default: `messages.columns`, else `Columns`. */
    label?: string
    /** Show just the icon; the label remains the accessible name and tooltip. */
    iconOnly?: boolean
    /** Default: `messages.filterColumns`, else `Filter columns…`. */
    filterPlaceholder?: string
    /** Default: `messages.resetColumns`, else `Reset columns`. */
    resetLabel?: string
  }>(),
  {},
)
const m = useMessages()
const text = computed(() => ({
  label: props.label ?? m.value.columns ?? 'Columns',
  filter: props.filterPlaceholder ?? m.value.filterColumns ?? 'Filter columns…',
  reset: props.resetLabel ?? m.value.resetColumns ?? 'Reset columns',
}))

const columnState = defineModel<ColumnState | undefined>('columnState', { default: undefined })
defineSlots<{ icon?: () => unknown }>()

const id = useId()
const trigger = shallowRef<HTMLButtonElement>()
const panel = shallowRef<HTMLElement>()
const filterInput = shallowRef<HTMLInputElement>()
const filter = ref('')
const isOpen = ref(false)
const anchor = anchorNameFor(`columns-${id}`)

const state = computed(() => normalizeColumnState(props.columns, columnState.value))
const byKey = computed(() => new Map(props.columns.map((c) => [c.key, c])))

const items = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return state.value.order
    .map((key) => byKey.value.get(key)!)
    .filter((col) => col.hideable !== false)
    .filter((col) => !q || (col.header ?? col.key).toLowerCase().includes(q))
})

const visibleCount = computed(() => state.value.order.length - state.value.hidden.length)

function isVisible(key: string) {
  return !state.value.hidden.includes(key)
}

function toggle(key: string) {
  const visible = isVisible(key)
  // Never allow hiding the last visible column.
  if (visible && visibleCount.value <= 1) return
  columnState.value = setColumnHidden(state.value, key, visible)
}

function reset() {
  columnState.value = normalizeColumnState(props.columns, null)
}

/** Opens the picker anchored to its own trigger. */
function open() {
  const el = panel.value
  if (!el?.showPopover || el.matches(':popover-open')) return
  el.showPopover({ source: trigger.value })
}

defineExpose({ open })

let stopTracking = () => {}
onBeforeUnmount(() => stopTracking())

function onToggle(event: Event) {
  stopTracking()
  isOpen.value = (event as ToggleEvent).newState === 'open'
  if (!isOpen.value) return
  // Placed, followed and hidden by CSS anchor positioning; JS only where unsupported.
  if (panel.value && trigger.value)
    stopTracking = trackAnchor(panel.value, trigger.value, 'bottom-end')
  nextTick(() => filterInput.value?.focus({ preventScroll: true }))
}
</script>

<template>
  <span class="vg-column-menu">
    <button
      ref="trigger"
      type="button"
      class="vg-button"
      aria-haspopup="dialog"
      :aria-controls="id"
      :aria-expanded="isOpen"
      :aria-label="iconOnly ? text.label : undefined"
      :title="iconOnly ? text.label : undefined"
      :popovertarget="id"
      :style="{ 'anchor-name': anchor }"
    >
      <span v-if="$slots.icon" class="vg-button-icon" aria-hidden="true">
        <slot name="icon" />
      </span>
      <svg v-else viewBox="0 0 16 16" aria-hidden="true" class="vg-button-icon">
        <path
          d="M2 3h12M2 8h12M2 13h12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      {{ iconOnly ? '' : text.label }}
    </button>
    <div
      :id="id"
      ref="panel"
      popover="auto"
      role="dialog"
      :aria-label="text.label"
      class="vg-menu vg-column-panel"
      data-placement="bottom-end"
      :style="{ 'position-anchor': anchor }"
      @toggle="onToggle"
    >
      <input
        ref="filterInput"
        v-model="filter"
        type="search"
        class="vg-input"
        :placeholder="text.filter"
        :aria-label="text.filter"
      />
      <ul class="vg-column-list">
        <li v-for="col in items" :key="col.key">
          <label class="vg-column-option">
            <input
              type="checkbox"
              :checked="isVisible(col.key)"
              :disabled="isVisible(col.key) && visibleCount <= 1"
              @change="toggle(col.key)"
            />
            <span>{{ col.header ?? col.key }}</span>
          </label>
        </li>
        <li v-if="!items.length" class="vg-text-muted vg-column-none">
          {{ m.noMatchingColumns ?? 'No matching columns' }}
        </li>
      </ul>
      <button type="button" class="vg-button vg-button-ghost" @click="reset">
        {{ text.reset }}
      </button>
    </div>
  </span>
</template>
