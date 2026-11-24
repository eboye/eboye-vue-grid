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
/** `range`: Shift was held (a shift-click, or Shift+Space): select from the last toggled row. */
const emit = defineEmits<{ toggle: [range: boolean] }>()

// Reached with the arrow keys under keyboard navigation; in the Tab order without it.
const grid = inject(GRID_CONTEXT_KEY, undefined)
const tabindex = grid ? grid.rovingTabindex : -1
/** Shift was held on the click that toggles the box. */
let shift = false
const onClick = (e: MouseEvent) => (shift = e.shiftKey)
function onChange() {
  emit('toggle', shift)
  shift = false
}
</script>

<template>
  <label class="vg-checkbox" @click.stop>
    <!-- mousedown: Shift would otherwise also select the page's text up to here -->
    <input
      :type="props.type ?? 'checkbox'"
      :checked="props.checked"
      :indeterminate="props.indeterminate"
      :disabled="props.disabled"
      :aria-label="props.label"
      :tabindex="tabindex"
      @mousedown="(e: MouseEvent) => e.shiftKey && e.preventDefault()"
      @click="onClick"
      @change="onChange"
    />
  </label>
</template>
