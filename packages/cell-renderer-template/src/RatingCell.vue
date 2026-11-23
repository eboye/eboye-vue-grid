<!--
  Boilerplate cell renderer.

  Contract (from @nocopypaste/vue-grid):
  - props: CellRendererProps<Row, Value, Options> → value, row, rowKey, rowIndex, depth, column, options
  - emits: `action(name, payload)` — the grid re-emits it as `cell-action` with row + column attached
  - styling: only --vg-* tokens (plus this addon's own --vg-rating-* tokens), inside a cascade layer
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGridContext, type CellRendererEmits, type CellRendererProps } from '@nocopypaste/vue-grid'
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
  <span v-else class="vg-rating" role="radiogroup" :aria-label="`Rating, ${label}`">
    <button
      v-for="n in max"
      :key="n"
      type="button"
      role="radio"
      class="vg-rating-star"
      :class="{ 'vg-rating-star-on': n <= Math.round(rating) }"
      :aria-checked="n === Math.round(rating)"
      :aria-label="`${n} of ${max}`"
      @click="rate(n)"
    >
      ★
    </button>
  </span>
</template>
