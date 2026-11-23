<script setup lang="ts">
import { computed } from 'vue'
import { pageItems } from '../core/pagination'

const props = withDefaults(
  defineProps<{
    total: number
    /** Page-size choices; renders a selector when given. */
    pageSizes?: number[]
    siblings?: number
    ariaLabel?: string
    /** Use `{from}`, `{to}` and `{total}` placeholders; empty string hides the summary. */
    summary?: string
  }>(),
  { siblings: 1, ariaLabel: 'Pagination', summary: '{from}–{to} of {total}' },
)

const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 25 })

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, pageSize.value))))
const current = computed(() => Math.min(Math.max(1, page.value), pageCount.value))
const items = computed(() => pageItems(current.value, pageCount.value, props.siblings))
const summaryText = computed(() => {
  if (!props.summary || props.total <= 0) return ''
  const from = (current.value - 1) * pageSize.value + 1
  const to = Math.min(props.total, current.value * pageSize.value)
  return props.summary
    .replace('{from}', String(from))
    .replace('{to}', String(to))
    .replace('{total}', String(props.total))
})

function go(target: number) {
  const next = Math.min(Math.max(1, target), pageCount.value)
  if (next !== page.value) page.value = next
}

function onSizeChange(event: Event) {
  pageSize.value = Number((event.target as HTMLSelectElement).value)
  page.value = 1
}
</script>

<template>
  <nav class="vg-pagination" :aria-label="ariaLabel">
    <span v-if="summaryText" class="vg-pagination-summary">{{ summaryText }}</span>
    <label v-if="pageSizes?.length" class="vg-pagination-size">
      <span class="vg-sr-only">Rows per page</span>
      <select class="vg-select" :value="pageSize" @change="onSizeChange">
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }} / page</option>
      </select>
    </label>
    <div class="vg-pagination-pages">
      <button type="button" class="vg-page vg-page-nav vg-page-first" :disabled="current <= 1" aria-label="First page" @click="go(1)">«</button>
      <button type="button" class="vg-page vg-page-nav" :disabled="current <= 1" aria-label="Previous page" @click="go(current - 1)">‹</button>
      <template v-for="(item, i) in items" :key="item === 'ellipsis' ? `e${i}` : item">
        <span v-if="item === 'ellipsis'" class="vg-page-ellipsis" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="vg-page"
          :aria-current="item === current ? 'page' : undefined"
          :aria-label="`Page ${item}`"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </template>
      <button type="button" class="vg-page vg-page-nav" :disabled="current >= pageCount" aria-label="Next page" @click="go(current + 1)">›</button>
      <button type="button" class="vg-page vg-page-nav vg-page-last" :disabled="current >= pageCount" aria-label="Last page" @click="go(pageCount)">»</button>
    </div>
  </nav>
</template>
