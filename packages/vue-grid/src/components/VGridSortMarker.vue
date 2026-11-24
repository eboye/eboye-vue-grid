<script setup lang="ts">
import { useMessages } from '../internal/messages'

/** A column's place in a multi-column sort (sorting feature): its number, and for screen readers its direction. */
const props = defineProps<{ position: number; count: number; dir: 'asc' | 'desc' }>()
const m = useMessages()
</script>

<template>
  <span class="vg-sort-index" aria-hidden="true">{{ position }}</span>
  <span class="vg-sr-only">{{
    m.sortPosition?.(props.position, props.dir) ??
    `, sorted ${position} of ${count}, ${dir === 'asc' ? 'ascending' : 'descending'}`
  }}</span>
</template>
