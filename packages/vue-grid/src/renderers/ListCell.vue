<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { ListOptions } from './options'
import { useMessages } from '../internal/messages'

const props = defineProps<CellRendererProps<unknown, unknown, ListOptions>>()
const m = useMessages()
const emit = defineEmits<CellRendererEmits>()

const all = computed(() => {
  const raw = props.options.items ? props.options.items(props.value, props.row) : props.value
  const list = Array.isArray(raw) ? raw : []
  return list.map((item) => {
    if (props.options.itemLabel) return props.options.itemLabel(item, props.row)
    return item !== null && typeof item === 'object' ? JSON.stringify(item) : String(item ?? '')
  })
})
const max = computed(() => Math.max(1, props.options.max ?? 1))
const first = computed(() => all.value.slice(0, max.value))
const rest = computed(() => all.value.slice(max.value))

// Open / closed state, keyboard and a11y come from the native <details>; this only reports it.
function onToggle(event: Event) {
  emit('action', 'expand', (event.target as HTMLDetailsElement).open)
}
</script>

<template>
  <span v-if="all.length" class="vg-list">
    <ul class="vg-list-items">
      <li v-for="(item, i) in first" :key="i" class="vg-text vg-text-ellipsis" :title="item">
        {{ item }}
      </li>
    </ul>
    <details v-if="rest.length" class="vg-list-more" @toggle="onToggle">
      <summary class="vg-link-button">
        <span class="vg-list-more-closed">{{
          m.moreItems?.(rest.length) ?? `+${rest.length} more`
        }}</span><span class="vg-list-more-open">{{ m.showLess ?? 'Show less' }}</span>
      </summary>
      <ul class="vg-list-items">
        <li v-for="(item, i) in rest" :key="i" class="vg-text vg-text-ellipsis" :title="item">
          {{ item }}
        </li>
      </ul>
    </details>
  </span>
  <span v-else-if="options.placeholder" class="vg-text vg-text-muted">{{
    options.placeholder
  }}</span>
</template>
