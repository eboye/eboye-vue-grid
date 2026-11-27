<!--
  Boilerplate cell renderer.

  Contract (from @nocopypaste/vue-grid):
  - props: CellRendererProps<Row, Value, Options> → value, row, rowKey, rowIndex, depth, column, options
  - emits: `action(name, payload)` — the grid re-emits it as `cell-action` with row + column attached
  - styling: only --vg-* tokens (plus this addon's own --vg-rating-* tokens), inside a cascade layer
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useGridContext,
  type CellRendererEmits,
  type CellRendererProps,
} from '@nocopypaste/vue-grid'
import type { RatingOptions } from './types'

const props = defineProps<CellRendererProps<unknown, number | null | undefined, RatingOptions>>()
const emit = defineEmits<CellRendererEmits>()

// Locale, currency and time zone of the surrounding grid (props → plugin config → browser).
const ctx = useGridContext()

const max = computed(() => Math.max(1, Math.round(props.options.max ?? 5)))
const rating = computed(() => {
  const n = Number(props.value)
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max.value) : 0
})
const label = computed(
  () => `${new Intl.NumberFormat(ctx.value.locale).format(rating.value)} of ${max.value}`,
)
const focused = ref<number>()
const tabStop = computed(() => focused.value ?? (Math.round(rating.value) || 1))

function onRadioKey(event: KeyboardEvent, value: number) {
  let next: number
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = value === max.value ? 1 : value + 1
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      next = value === 1 ? max.value : value - 1
      break
    default:
      return
  }
  event.preventDefault()
  event.stopPropagation()
  const button = event.currentTarget as HTMLButtonElement
  button.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus()
  rate(next)
}

function leaveGroup(event: FocusEvent) {
  if (
    !(event.relatedTarget instanceof Node) ||
    !(event.currentTarget as Element).contains(event.relatedTarget)
  )
    focused.value = undefined
}

function rate(value: number) {
  if (props.options.readonly) return
  emit('action', 'rate', value)
}
</script>

<template>
  <span v-if="options.readonly" class="vg-rating" role="img" :aria-label="label" :title="label">
    <span
      v-for="n in max"
      :key="n"
      class="vg-rating-star"
      :class="{ 'vg-rating-star-on': n <= Math.round(rating) }"
      aria-hidden="true"
      >★</span
    >
  </span>
  <span
    v-else
    class="vg-rating"
    role="radiogroup"
    :aria-label="`Rating, ${label}`"
    @focusout="leaveGroup"
  >
    <button
      v-for="n in max"
      :key="n"
      type="button"
      role="radio"
      class="vg-rating-star"
      :class="{ 'vg-rating-star-on': n <= Math.round(rating) }"
      :aria-checked="n === Math.round(rating)"
      :aria-label="`${n} of ${max}`"
      :tabindex="n === tabStop ? 0 : -1"
      @focus="focused = n"
      @keydown="onRadioKey($event, n)"
      @click="rate(n)"
    >
      ★
    </button>
  </span>
</template>
