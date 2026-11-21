<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import { resolveOption, type IconOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, IconOptions>>()

const icon = computed(() => (props.options.iconFor ? props.options.iconFor(props.value, props.row) : props.options.icon))
const visible = computed(() => (props.options.show ? props.options.show(props.value, props.row) : true))
const label = computed(() => resolveOption(props.options.label, props.value, props.row))
const tone = computed(() => resolveOption(props.options.tone, props.value, props.row))
</script>

<template>
  <span
    :class="['vg-icon', { [`vg-tone-${tone}`]: tone, 'vg-invisible': !visible }]"
    :role="label ? 'img' : undefined"
    :aria-label="visible ? label : undefined"
    :aria-hidden="!label || !visible ? 'true' : undefined"
    :title="visible ? label : undefined"
  >
    <component :is="icon" v-if="icon" />
  </span>
</template>
