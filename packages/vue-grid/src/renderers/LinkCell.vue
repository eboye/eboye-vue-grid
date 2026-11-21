<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { safeHref } from './format'
import type { LinkOptions } from './options'

const props = defineProps<CellRendererProps<any, unknown, LinkOptions>>()
const emit = defineEmits<CellRendererEmits>()

// Without an `href` option, an absolute http(s) value links to itself. Unsafe schemes are dropped.
const href = computed(() => {
  if (props.options.href) return safeHref(props.options.href(props.value, props.row))
  return typeof props.value === 'string' && /^https?:\/\//i.test(props.value) ? props.value : undefined
})
const label = computed(() => (props.options.label ? props.options.label(props.value, props.row) : String(props.value ?? '')))
const external = computed(() => props.options.target === '_blank')
</script>

<template>
  <a
    v-if="href"
    class="vg-link"
    :href="href"
    :target="options.target"
    :rel="external ? 'noopener noreferrer' : undefined"
    @click="emit('action', 'click', value)"
    >{{ label }}</a
  >
  <button v-else-if="label" type="button" class="vg-link vg-link-button" @click="emit('action', 'click', value)">
    {{ label }}
  </button>
</template>
