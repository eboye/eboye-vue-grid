<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CellRendererProps } from '../types'
import { resolveImageSrc } from './format'
import { resolveOption, type ImageOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ImageOptions>>()

const src = computed(() => {
  const raw = props.options.src ? props.options.src(props.value, props.row) : props.value
  return resolveImageSrc(raw, props.options.baseUrl)
})
const alt = computed(() => resolveOption(props.options.alt, props.value, props.row) ?? '')
const failed = ref(false)
watch(src, () => (failed.value = false))
const classes = computed(() => [
  'vg-image',
  `vg-image-${props.options.shape ?? 'rounded'}`,
  `vg-image-${props.options.fit ?? 'contain'}`,
])
</script>

<template>
  <img
    v-if="src && !failed"
    :class="classes"
    :src="src"
    :alt="alt"
    :style="{ '--vg-image-size': options.size }"
    loading="lazy"
    decoding="async"
    @error="failed = true"
  />
  <span
    v-else
    :class="[classes, 'vg-image-placeholder']"
    :style="{ '--vg-image-size': options.size }"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
  />
</template>
