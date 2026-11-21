<script setup lang="ts">
import { computed } from 'vue'
import type { BadgeSpec } from '../options'

const props = defineProps<{ badge: BadgeSpec | string }>()
const spec = computed<BadgeSpec>(() => (typeof props.badge === 'string' ? { text: props.badge } : props.badge))
</script>

<template>
  <span :class="['vg-badge', `vg-tone-${spec.tone ?? 'neutral'}`]" :title="spec.title">{{ spec.text }}</span>
</template>
