<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { safeHref } from './format'
import type { LinkOptions } from './options'
import { useRouterLink } from './parts/routerLink'

const props = defineProps<CellRendererProps<unknown, unknown, LinkOptions>>()
const emit = defineEmits<CellRendererEmits>()
const RouterLink = useRouterLink()

const to = computed(() => props.options.to?.(props.value, props.row) ?? null)
// Without `href`/`to`, an absolute http(s) value links to itself. Unsafe schemes are dropped.
// Without a router, a string `to` falls back to a plain href; `to` returning null → plain text.
const href = computed(() => {
  if (props.options.href) return safeHref(props.options.href(props.value, props.row))
  if (props.options.to) return to.value !== null && !RouterLink && typeof to.value === 'string' ? safeHref(to.value) : undefined
  return typeof props.value === 'string' && /^https?:\/\//i.test(props.value) ? props.value : undefined
})
const useRouter = computed(() => !!RouterLink && to.value !== null && !props.options.href)
const label = computed(() => (props.options.label ? props.options.label(props.value, props.row) : String(props.value ?? '')))
const external = computed(() => props.options.target === '_blank')
const tooltip = computed(() => props.options.tooltip?.(props.value, props.row))
</script>

<template>
  <component
    :is="RouterLink"
    v-if="useRouter && label"
    class="vg-link"
    :to="to"
    :target="options.target"
    :title="tooltip"
    @click="emit('action', 'click', value)"
    >{{ label }}</component
  >
  <a
    v-else-if="href"
    class="vg-link"
    :href="href"
    :target="options.target"
    :rel="external ? 'noopener noreferrer' : undefined"
    :title="tooltip"
    @click="emit('action', 'click', value)"
    >{{ label }}</a
  >
  <span v-else-if="label && options.to" class="vg-text" :title="tooltip">{{ label }}</span>
  <button v-else-if="label" type="button" class="vg-link vg-link-button" :title="tooltip" @click="emit('action', 'click', value)">
    {{ label }}
  </button>
</template>
