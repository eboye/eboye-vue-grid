<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import { useInternalGrid } from '../internal/context'

/**
 * A row's drag handle (row reorder feature), in the handle column. Off while the rows are sorted or
 * grouped (a moved row would jump back). Alt+↑ / Alt+↓ on any of the row's cells move it too.
 */
const grid = useInternalGrid()
const reorder = grid.reorder!
</script>

<template>
  <button
    type="button"
    class="vg-row-handle"
    :tabindex="grid.rovingTabindex"
    :disabled="!reorder.enabled()"
    :aria-label="grid.messages.value.moveRow ?? 'Move row'"
    v-bind="
      tipAttrs(grid.messages.value.moveRowHint ?? 'Drag, or Alt+↑ / Alt+↓', { describe: true })
    "
    @pointerdown="reorder.start($event)"
  >
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="6" cy="4" r="1.25" />
      <circle cx="10" cy="4" r="1.25" />
      <circle cx="6" cy="8" r="1.25" />
      <circle cx="10" cy="8" r="1.25" />
      <circle cx="6" cy="12" r="1.25" />
      <circle cx="10" cy="12" r="1.25" />
    </svg>
  </button>
</template>
