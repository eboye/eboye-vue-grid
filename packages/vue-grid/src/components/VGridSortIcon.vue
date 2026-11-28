<script setup lang="ts">
import type { Slot } from 'vue'
import type { ColumnDef, SortDir } from '../types'
import { RenderSlot } from '../internal/RenderSlot'

defineProps<{ artwork: Slot; column: ColumnDef; direction: SortDir | null }>()
</script>

<template>
  <span class="vg-sort-icon-custom" aria-hidden="true">
    <RenderSlot :fn="artwork" :scope="{ column, direction }" />
  </span>
</template>
