<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import VGridMenu from '../components/VGridMenu.vue'
import { anchorNameFor } from '../internal/anchor'
import type { CellRendererEmits, CellRendererProps, MenuAction, MenuItem } from '../types'
import type { ActionsMenuOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ActionsMenuOptions>>()
const emit = defineEmits<CellRendererEmits>()

const uid = useId()
const menuId = `vg-actions-${uid}`
// The trigger is the anchor; the menu is positioned against it purely in CSS and follows it
// while the grid scrolls (no JS placement, no close-on-scroll).
const anchor = anchorNameFor(`actions-${uid}`)
const open = ref(false)

const items = computed<MenuItem[]>(() => {
  const a = props.options.actions
  return (typeof a === 'function' ? a(props.row) : a) ?? []
})

function choose(item: MenuAction) {
  emit('action', item.name, item)
}
</script>

<template>
  <span v-if="items.length" class="vg-actions-menu">
    <button
      type="button"
      class="vg-icon-button"
      :aria-label="options.label ?? 'Actions'"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="menuId"
      :popovertarget="menuId"
      :style="{ 'anchor-name': anchor }"
      @click.stop
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg>
    </button>
    <VGridMenu
      :id="menuId"
      :items="items"
      :label="options.label ?? 'Actions'"
      :anchor-name="anchor"
      placement="bottom-end"
      @select="choose"
      @open="open = true"
      @close="open = false"
    />
  </span>
</template>
