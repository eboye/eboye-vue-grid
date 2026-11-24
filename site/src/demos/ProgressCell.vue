<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '@nocopypaste/vue-grid'

/** A one-off renderer: a progress bar. Pass it to a column as `renderer: ProgressCell`. */
const props = defineProps<CellRendererProps<unknown, number | null, { goal?: number }>>()

const percent = computed(() =>
  Math.min(100, Math.round(((props.value ?? 0) / (props.options.goal ?? 100)) * 100)),
)
</script>

<template>
  <span class="progress" role="meter" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"
    ><span class="progress-bar" :style="{ inlineSize: `${percent}%` }" />
    <span class="progress-text">{{ percent }}%</span></span
  >
</template>

<style scoped>
.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  inline-size: 100%;
}
.progress-bar {
  block-size: 0.5rem;
  border-radius: 999px;
  background: var(--vg-color-accent);
  min-inline-size: 2px;
}
.progress-text {
  font-variant-numeric: tabular-nums;
  color: var(--vg-color-text-muted);
  font-size: 0.85em;
}
</style>
