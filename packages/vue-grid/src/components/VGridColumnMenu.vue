<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useId } from 'vue'
import { normalizeColumnState, setColumnHidden } from '../core/columns'
import type { ColumnDef, ColumnState } from '../types'

const props = withDefaults(
  defineProps<{
    columns: readonly ColumnDef[]
    label?: string
    filterPlaceholder?: string
    resetLabel?: string
  }>(),
  { label: 'Columns', filterPlaceholder: 'Filter columns…', resetLabel: 'Reset columns' },
)

const columnState = defineModel<ColumnState | undefined>('columnState', { default: undefined })

const id = useId()
const trigger = shallowRef<HTMLButtonElement>()
const panel = shallowRef<HTMLElement>()
const filterInput = shallowRef<HTMLInputElement>()
const filter = ref('')
const position = ref({ top: '0px', left: '0px' })

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

function onToggle(event: Event) {
  if ((event as ToggleEvent).newState !== 'open') return
  const btn = trigger.value?.getBoundingClientRect()
  const pop = panel.value?.getBoundingClientRect()
  if (btn && pop) {
    const left = Math.min(Math.max(4, btn.right - pop.width), window.innerWidth - pop.width - 4)
    const below = btn.bottom + 4 + pop.height <= window.innerHeight
    position.value = { top: `${below ? btn.bottom + 4 : Math.max(4, btn.top - 4 - pop.height)}px`, left: `${left}px` }
  }
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
      :popovertarget="id"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" class="vg-button-icon">
        <path d="M2 3h12M2 8h12M2 13h12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      {{ label }}
    </button>
    <div :id="id" ref="panel" popover="auto" role="dialog" :aria-label="label" class="vg-menu vg-column-panel" :style="position" @toggle="onToggle">
      <input ref="filterInput" v-model="filter" type="search" class="vg-input" :placeholder="filterPlaceholder" :aria-label="filterPlaceholder" />
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
        <li v-if="!items.length" class="vg-text-muted vg-column-none">No matching columns</li>
      </ul>
      <button type="button" class="vg-button vg-button-ghost" @click="reset">{{ resetLabel }}</button>
    </div>
  </span>
</template>
