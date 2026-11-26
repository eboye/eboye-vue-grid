<script setup lang="ts">
import { tipAttrs } from '../../internal/tooltip'
import { computed } from 'vue'
import { safeTone, type BadgeSpec } from '../options'

const props = defineProps<{ badge: BadgeSpec | string }>()
const spec = computed<BadgeSpec>(() =>
  typeof props.badge === 'string' ? { text: props.badge } : props.badge,
)
</script>

<template>
  <span
    :class="['vg-badge', `vg-tone-${safeTone(spec.tone) ?? 'neutral'}`]"
    v-bind="tipAttrs(spec.title, { describe: true })"
    >{{ spec.text }}</span
  >
</template>
