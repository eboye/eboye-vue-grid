<script setup lang="ts">
import type { Slot } from 'vue'
import { partOn, useMessages, useParts } from '../internal/messages'
import { RenderSlot } from '../internal/RenderSlot'

/**
 * No rows pass the filters (filtering feature): says so, with Clear filters. The grid's
 * `#no-match` slot (`render`) replaces it.
 */
defineProps<{
  clearFilters: () => void
  filterCount: number
  /** The grid's `no-match-text`. */
  text?: string
  render?: Slot
}>()
const m = useMessages()
const parts = useParts()
</script>

<template>
  <RenderSlot v-if="render" :fn="render" :scope="{ clearFilters, filterCount }" />
  <span v-else class="vg-no-match">
    {{ text ?? m.noMatch ?? 'No rows match the current filters.' }}
    <button
      v-if="partOn(parts, 'clearFiltersButton')"
      type="button"
      class="vg-link-button"
      @click="clearFilters()"
    >
      {{ m.clearFilters ?? 'Clear filters' }}
    </button>
  </span>
</template>
