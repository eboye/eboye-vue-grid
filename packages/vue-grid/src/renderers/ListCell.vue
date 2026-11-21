<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { ListOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ListOptions>>()
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
const expanded = ref(false)
const shown = computed(() => (expanded.value ? all.value : all.value.slice(0, max.value)))
const hidden = computed(() => all.value.length - max.value)
const listId = `vg-list-${useId()}`

function toggle() {
  expanded.value = !expanded.value
  emit('action', 'expand', expanded.value)
}
</script>

<template>
  <span v-if="all.length" class="vg-list">
    <ul :id="listId" class="vg-list-items">
      <li v-for="(item, i) in shown" :key="i" class="vg-text vg-text-ellipsis" :title="item">{{ item }}</li>
    </ul>
    <button
      v-if="hidden > 0"
      type="button"
      class="vg-link-button vg-list-more"
      :aria-expanded="expanded"
      :aria-controls="listId"
      @click="toggle"
    >
      {{ expanded ? 'Show less' : `+${hidden} more` }}
    </button>
  </span>
  <span v-else-if="options.placeholder" class="vg-text vg-text-muted">{{ options.placeholder }}</span>
</template>
