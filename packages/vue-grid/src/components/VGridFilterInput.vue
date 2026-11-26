<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  isFilterActive,
  parseQuickFilter,
  quickFilterText,
  type ColumnFilter,
  type FilterType,
} from '../core/filter'
import type { ColumnDef, ColumnFilterOptions } from '../types'
import { useMessages } from '../internal/messages'

/** The filter-row editor of one column (inside its header cell). */
const props = defineProps<{
  column: ColumnDef
  type: FilterType | 'custom'
  modelValue: ColumnFilter | undefined
}>()
const emit = defineEmits<{ 'update:modelValue': [filter: ColumnFilter | undefined]; open: [] }>()

const title = computed(() => props.column.header ?? props.column.key)
const m = useMessages()
const filterLabel = computed(() => m.value.filterColumn?.(title.value) ?? `Filter ${title.value}`)
const placeholder = computed(
  () =>
    (typeof props.column.filter === 'object'
      ? (props.column.filter as ColumnFilterOptions).placeholder
      : undefined) ??
    {
      text: m.value.filterPlaceholder ?? 'Filter…',
      number: '> 10, 5..20',
      date: '> 2026-01-01',
      boolean: '',
      set: '',
      custom: '',
    }[props.type],
)

// Text shorthand: local while typing (debounced), synced from the model when it changes elsewhere.
const text = ref(quickFilterText(props.modelValue))
const focused = ref(false)
watch(
  () => props.modelValue,
  (f) => {
    if (!focused.value) text.value = quickFilterText(f)
  },
)
let timer = 0
onBeforeUnmount(() => window.clearTimeout(timer))
function onInput(value: string) {
  text.value = value
  window.clearTimeout(timer)
  timer = window.setTimeout(
    () => emit('update:modelValue', parseQuickFilter(props.type as FilterType, value)),
    200,
  )
}
/** A filter set in the popover that the shorthand can't express (e.g. "does not contain"). */
const advanced = computed(
  () => isFilterActive(props.modelValue) && !quickFilterText(props.modelValue),
)

const boolValue = computed(() =>
  props.modelValue?.type === 'boolean' ? String(props.modelValue.value) : 'any',
)
function setBool(v: string) {
  emit(
    'update:modelValue',
    v === 'any' ? undefined : { type: 'boolean', value: v === 'null' ? null : v === 'true' },
  )
}
const summary = computed(() => {
  const f = props.modelValue
  if (!isFilterActive(f)) return m.value.all ?? 'All'
  return f?.type === 'set'
    ? (m.value.valuesSelected?.(f.values.length) ?? `${f.values.length} selected`)
    : (m.value.customFilter ?? 'Custom')
})

// Keep typing / clicking in the filter row from starting a column drag or a sort.
const stop = (e: Event) => e.stopPropagation()
</script>

<template>
  <div class="vg-filter-input" @pointerdown="stop" @click="stop" @keydown="stop">
    <button
      v-if="advanced"
      type="button"
      class="vg-input vg-filter-summary"
      :aria-label="filterLabel"
      @click="emit('open')"
    >
      {{ summary }}
    </button>
    <input
      v-else-if="type === 'text' || type === 'number' || type === 'date'"
      class="vg-input"
      type="search"
      :inputmode="type === 'number' ? 'decimal' : undefined"
      :placeholder="placeholder"
      :aria-label="filterLabel"
      :value="text"
      @focus="focused = true"
      @blur="focused = false"
      @input="onInput(($event.target as HTMLInputElement).value)"
    />
    <select
      v-else-if="type === 'boolean'"
      class="vg-input"
      :aria-label="filterLabel"
      :value="boolValue"
      @change="setBool(($event.target as HTMLSelectElement).value)"
    >
      <option value="any">{{ m.all ?? 'All' }}</option>
      <option value="true">{{ m.yes ?? 'Yes' }}</option>
      <option value="false">{{ m.no ?? 'No' }}</option>
      <option value="null">{{ m.emptyValue ?? 'Empty' }}</option>
    </select>
    <button
      v-else
      type="button"
      class="vg-input vg-filter-summary"
      :aria-label="m.filterSummary?.(title, summary) ?? `Filter ${title}: ${summary}`"
      @click="emit('open')"
    >
      {{ summary }}
    </button>
  </div>
</template>
