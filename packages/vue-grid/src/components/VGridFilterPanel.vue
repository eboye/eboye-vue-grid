<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, useId, watch } from 'vue'
import { foldText, type ColumnFilter, type FilterType } from '../core/filter'
import { toDistinct, type DistinctValue } from '../composables/useGridFilters'
import type { ColumnDef, FilterOptionsLoader } from '../types'

/** Body of the filter popover for one column. Live: every change emits a new filter (or undefined). */
const props = defineProps<{
  column: ColumnDef
  type: FilterType | 'custom'
  modelValue: ColumnFilter | undefined
  /** Choices for the value-list filter. */
  values: DistinctValue[]
  /** Loads the value-list options instead (search text → options). */
  loadValues?: FilterOptionsLoader
}>()
const emit = defineEmits<{ 'update:modelValue': [filter: ColumnFilter | undefined] }>()

const uid = useId()
// Rendered only while its popover is open (and possibly lazy-loaded): focus the first field on mount.
const root = shallowRef<HTMLElement>()
onMounted(() => {
  const target =
    root.value?.querySelector<HTMLElement>('[autofocus]') ??
    root.value?.querySelector<HTMLElement>('input, select, button:not(:disabled)')
  target?.focus({ preventScroll: true })
})
const title = computed(() => props.column.header ?? props.column.key)

const OPS = {
  text: [
    ['contains', 'Contains'],
    ['notContains', 'Does not contain'],
    ['equals', 'Equals'],
    ['notEquals', 'Does not equal'],
    ['startsWith', 'Starts with'],
    ['endsWith', 'Ends with'],
    ['empty', 'Is empty'],
    ['notEmpty', 'Is not empty'],
  ],
  number: [
    ['eq', '='],
    ['ne', '≠'],
    ['lt', '<'],
    ['lte', '≤'],
    ['gt', '>'],
    ['gte', '≥'],
    ['between', 'Between'],
    ['empty', 'Is empty'],
    ['notEmpty', 'Is not empty'],
  ],
  date: [
    ['on', 'On'],
    ['before', 'Before'],
    ['after', 'After'],
    ['between', 'Between'],
    ['empty', 'Is empty'],
    ['notEmpty', 'Is not empty'],
  ],
} as const

const current = computed(() => (props.modelValue?.type === props.type ? props.modelValue : undefined) as
  | (ColumnFilter & { op?: string; value?: unknown; to?: unknown })
  | undefined)
// The chosen condition is a local draft: picking "≥" before typing a value is not yet an active
// filter (so the model drops it), but the choice must stay.
const draftOp = ref<string>(current.value?.op ?? (props.type === 'text' ? 'contains' : props.type === 'number' ? 'eq' : 'on'))
watch(
  () => current.value?.op,
  (o) => {
    if (o) draftOp.value = o
  },
)
const op = computed(() => draftOp.value)
const needsValue = computed(() => op.value !== 'empty' && op.value !== 'notEmpty')

// Text input is debounced so large grids stay smooth while typing.
let timer = 0
onBeforeUnmount(() => window.clearTimeout(timer))
function update(patch: Record<string, unknown>, debounce = false) {
  if (typeof patch.op === 'string') draftOp.value = patch.op
  const next = { type: props.type, op: op.value, value: current.value?.value, to: current.value?.to, ...patch } as ColumnFilter
  window.clearTimeout(timer)
  if (debounce) timer = window.setTimeout(() => emit('update:modelValue', next), 150)
  else emit('update:modelValue', next)
}
const num = (s: string) => (s.trim() === '' ? null : Number(s))

// ── Value list ──────────────────────────────────────────────────────────────────────────────
const search = ref('')

// Options from a loader (e.g. a backend): fetched on open and per search (debounced, cancellable).
const loaded = shallowRef<DistinctValue[]>([])
const loadingValues = ref(false)
let valuesController: AbortController | undefined
let searchTimer = 0
async function fetchValues(q: string) {
  if (!props.loadValues) return
  valuesController?.abort()
  valuesController = new AbortController()
  const { signal } = valuesController
  loadingValues.value = true
  try {
    const result = await props.loadValues(q, { signal })
    if (!signal.aborted) loaded.value = toDistinct(result)
  } catch {
    if (!signal.aborted) loaded.value = []
  } finally {
    if (!signal.aborted) loadingValues.value = false
  }
}
if (props.loadValues) {
  void fetchValues('')
  watch(search, (q) => {
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => void fetchValues(q), 250)
  })
}
onBeforeUnmount(() => {
  valuesController?.abort()
  window.clearTimeout(searchTimer)
})

const options = computed(() => (props.loadValues ? loaded.value : props.values))
const shownValues = computed(() => {
  if (props.loadValues) return options.value // already searched by the loader
  const q = foldText(search.value)
  return q ? options.value.filter((v) => foldText(v.label).includes(q)) : options.value
})
const selected = computed(() =>
  props.modelValue?.type === 'set' ? new Set(props.modelValue.values) : new Set(options.value.map((v) => v.key)),
)
function emitSelection(keys: Set<string>) {
  // "Everything selected" means no filter — only knowable when the full list is shown.
  const complete = !props.loadValues || !search.value
  const all = complete && options.value.every((v) => keys.has(v.key))
  const values = props.loadValues ? [...keys] : options.value.map((v) => v.key).filter((k) => keys.has(k))
  emit('update:modelValue', all ? undefined : { type: 'set', values })
}
function toggleValue(key: string) {
  const keys = new Set(selected.value)
  if (keys.has(key)) keys.delete(key)
  else keys.add(key)
  emitSelection(keys)
}
const allShownSelected = computed(() => shownValues.value.length > 0 && shownValues.value.every((v) => selected.value.has(v.key)))
const someShownSelected = computed(() => shownValues.value.some((v) => selected.value.has(v.key)))
function toggleAllShown() {
  const keys = new Set(selected.value)
  const select = !allShownSelected.value
  for (const v of shownValues.value) {
    if (select) keys.add(v.key)
    else keys.delete(v.key)
  }
  emitSelection(keys)
}

const boolValue = computed(() => (props.modelValue?.type === 'boolean' ? String(props.modelValue.value) : 'any'))
function setBool(v: string) {
  emit('update:modelValue', v === 'any' ? undefined : { type: 'boolean', value: v === 'null' ? null : v === 'true' })
}

const customComponent = computed(() => props.column.filterComponent && toRaw(props.column.filterComponent))
</script>

<template>
  <div ref="root" class="vg-filter-panel">
    <header class="vg-filter-head">
      <strong :id="`${uid}-title`">{{ title }}</strong>
      <button type="button" class="vg-link-button" :disabled="!modelValue" @click="emit('update:modelValue', undefined)">
        Clear
      </button>
    </header>

    <!-- text / number / date: operator + value(s) -->
    <div v-if="type === 'text' || type === 'number' || type === 'date'" class="vg-filter-fields">
      <select
        class="vg-input"
        :aria-label="`${title}: condition`"
        :value="op"
        @change="update({ op: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="[value, label] in OPS[type]" :key="value" :value="value">{{ label }}</option>
      </select>
      <template v-if="needsValue">
        <input
          v-if="type === 'text'"
          class="vg-input"
          type="search"
          autofocus
          :aria-label="`${title}: value`"
          placeholder="Value"
          :value="current?.value ?? ''"
          @input="update({ value: ($event.target as HTMLInputElement).value }, true)"
        />
        <template v-else>
          <input
            class="vg-input"
            :type="type === 'number' ? 'number' : 'date'"
            autofocus
            :aria-label="op === 'between' ? `${title}: from` : `${title}: value`"
            :value="current?.value ?? ''"
            @input="
              update({ value: type === 'number' ? num(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value })
            "
          />
          <input
            v-if="op === 'between'"
            class="vg-input"
            :type="type === 'number' ? 'number' : 'date'"
            :aria-label="`${title}: to`"
            :value="current?.to ?? ''"
            @input="
              update({ to: type === 'number' ? num(($event.target as HTMLInputElement).value) : ($event.target as HTMLInputElement).value })
            "
          />
        </template>
      </template>
    </div>

    <!-- boolean -->
    <div v-else-if="type === 'boolean'" class="vg-filter-fields" role="radiogroup" :aria-labelledby="`${uid}-title`">
      <label v-for="[value, label] in [['any', 'Any'], ['true', 'Yes'], ['false', 'No'], ['null', 'Empty']]" :key="value" class="vg-filter-option">
        <input type="radio" :name="`${uid}-bool`" :value="value" :checked="boolValue === value" :autofocus="boolValue === value" @change="setBool(value)" />
        {{ label }}
      </label>
    </div>

    <!-- value list -->
    <div v-else-if="type === 'set'" class="vg-filter-fields">
      <input v-model="search" class="vg-input" type="search" autofocus placeholder="Search values" :aria-label="`${title}: search values`" />
      <label class="vg-filter-option vg-filter-all">
        <input
          type="checkbox"
          :checked="allShownSelected"
          :indeterminate="!allShownSelected && someShownSelected"
          @change="toggleAllShown"
        />
        {{ search ? 'All shown' : 'All' }}
      </label>
      <ul class="vg-filter-values">
        <li v-for="v in shownValues" :key="v.key">
          <label class="vg-filter-option">
            <input type="checkbox" :checked="selected.has(v.key)" @change="toggleValue(v.key)" />
            <span class="vg-filter-value-label" :class="{ 'vg-text-muted': !v.key }">{{ v.label }}</span>
            <span v-if="v.count" class="vg-filter-count">{{ v.count }}</span>
          </label>
        </li>
        <li v-if="loadingValues" class="vg-text-muted vg-filter-none" aria-live="polite">Loading…</li>
        <li v-else-if="!shownValues.length" class="vg-text-muted vg-filter-none">No matching values</li>
      </ul>
    </div>

    <!-- custom -->
    <component
      :is="customComponent"
      v-else-if="customComponent"
      :model-value="modelValue"
      :column="column"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>
