<script setup lang="ts">
import { computed, inject } from 'vue'
import { FORMAT_CONTEXT_KEY } from '../registry/plugin'
import { formatNumber } from '../renderers/format'
import { useMessages } from '../internal/messages'

/**
 * Server data, every loaded row selected (selection feature): offers to select every row that
 * matches the query, or says that all of them are, with a way back.
 */
const props = defineProps<{ total: number; page: number; all: boolean }>()
const emit = defineEmits<{ selectAll: []; clear: [] }>()

const format = inject(FORMAT_CONTEXT_KEY, undefined)
const n = (v: number) => (format ? formatNumber(v, format.value) : String(v))
const m = useMessages()
const text = computed(() =>
  props.all
    ? (m.value.allSelected?.(props.total) ?? `All ${n(props.total)} rows are selected.`)
    : (m.value.pageSelected?.(props.page) ??
      `All ${n(props.page)} rows on this page are selected.`),
)
</script>

<template>
  <div class="vg-selection-banner" role="status">
    <span>{{ text }}</span>
    <button v-if="!all" type="button" class="vg-link-button" @click="emit('selectAll')">
      {{ m.selectAllMatching?.(total) ?? `Select all ${n(total)} rows` }}
    </button>
    <button v-else type="button" class="vg-link-button" @click="emit('clear')">
      {{ m.clearSelection ?? 'Clear selection' }}
    </button>
  </div>
</template>
