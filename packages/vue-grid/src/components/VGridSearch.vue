<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { GRID_CONTEXT_KEY } from '../internal/context'
import { warnOnce } from '../internal/dev'
import { useMessages } from '../internal/messages'

declare const process: { env: Record<string, string | undefined> } // replaced by the bundler (see internal/dev.ts)

/**
 * Quick search box. Inside a grid's `#toolbar` slot it drives that grid's search automatically;
 * anywhere else, bind it with `v-model` (e.g. to `filters.search`).
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string
    /** Default: `messages.searchPlaceholder`, else `Search…`. */
    placeholder?: string
    /** Default: `messages.searchLabel`, else `Search rows`. */
    label?: string
    debounce?: number
  }>(),
  { modelValue: undefined, debounce: 150 },
)
const m = useMessages()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const grid = inject(GRID_CONTEXT_KEY, undefined)
const bound = computed(() => props.modelValue !== undefined || !grid)
if (
  process.env.NODE_ENV !== 'production' &&
  grid &&
  !grid.filters &&
  props.modelValue === undefined
) {
  warnOnce(
    'search:no-filtering',
    "<VGridSearch> in a grid without the filtering feature does nothing. Add filteringFeature to the grid's features.",
  )
}
const source = computed(() =>
  bound.value ? (props.modelValue ?? '') : (grid?.filters?.state.value.search ?? ''),
)

const text = ref(source.value)
let timer = 0
watch(source, (value) => {
  window.clearTimeout(timer)
  text.value = value
})
onBeforeUnmount(() => window.clearTimeout(timer))
function onInput(value: string) {
  text.value = value
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    if (bound.value) emit('update:modelValue', value)
    else grid?.filters?.setSearch(value)
  }, props.debounce)
}
</script>

<template>
  <input
    class="vg-input vg-search"
    type="search"
    :placeholder="placeholder ?? m.searchPlaceholder ?? 'Search…'"
    :aria-label="label ?? m.searchLabel ?? 'Search rows'"
    :value="text"
    @input="onInput(($event.target as HTMLInputElement).value)"
  />
</template>
