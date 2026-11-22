<script setup lang="ts">
import { inject } from 'vue'
import { GRID_CONTEXT_KEY } from '../internal/context'

const props = defineProps<{
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  label: string
  type?: 'checkbox' | 'radio'
}>()
const emit = defineEmits<{ toggle: [] }>()

// Reached with the arrow keys under keyboard navigation; in the Tab order without it.
const grid = inject(GRID_CONTEXT_KEY, undefined)
const tabindex = grid ? grid.rovingTabindex : -1
</script>

<template>
  <label class="vg-checkbox" @click.stop>
    <input
      :type="props.type ?? 'checkbox'"
      :checked="props.checked"
      :indeterminate="props.indeterminate"
      :disabled="props.disabled"
      :aria-label="props.label"
      :tabindex="tabindex"
      @change="emit('toggle')"
    />
  </label>
</template>
