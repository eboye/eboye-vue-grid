<script setup lang="ts">
import { computed, toRaw } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { ButtonGroupOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ButtonGroupOptions>>()
const emit = defineEmits<CellRendererEmits>()

const buttons = computed(() => {
  const b = props.options.buttons
  const list = (typeof b === 'function' ? b(props.row) : b) ?? []
  return list.filter((x) => !x.hidden).map((x) => ({ ...x, icon: x.icon && toRaw(x.icon) }))
})
</script>

<template>
  <span v-if="buttons.length" class="vg-button-group" role="group">
    <button
      v-for="b in buttons"
      :key="b.name"
      type="button"
      :class="[
        'vg-action-button',
        `vg-variant-${b.variant ?? 'outline'}`,
        b.tone && `vg-tone-${b.tone}`,
      ]"
      :disabled="b.disabled"
      @click="emit('action', b.name, value)"
    >
      <component :is="b.icon" v-if="b.icon" class="vg-action-icon" aria-hidden="true" />
      <span>{{ b.label }}</span>
    </button>
  </span>
</template>
