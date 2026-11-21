<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import { parseJsonish, tokenizeJson } from './format'
import type { CodeOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, CodeOptions>>()

const source = computed(() => {
  const v = props.value
  if (v === null || v === undefined || v === '') return null
  const lang = props.options.language ?? 'auto'
  const parsed = lang === 'text' ? v : parseJsonish(v)
  const isJson = lang === 'json' || (lang === 'auto' && parsed !== null && typeof parsed === 'object')
  if (!isJson) return { json: false, text: typeof v === 'string' ? v : JSON.stringify(v) }
  try {
    return { json: true, text: JSON.stringify(parsed, null, props.options.indent ?? 2) ?? String(v) }
  } catch {
    return { json: false, text: String(v) }
  }
})
// Tokens become text nodes in <span>s — the value is never parsed as HTML.
const tokens = computed(() =>
  source.value?.json && props.options.highlight !== false ? tokenizeJson(source.value.text) : null,
)
</script>

<template>
  <pre
    v-if="source"
    :class="['vg-code', { 'vg-text-clamp': options.lines }]"
    :style="{ '--vg-text-lines': options.lines }"
    :title="options.lines ? source.text : undefined"
  ><template v-if="tokens"><span v-for="(t, i) in tokens" :key="i" :class="t.type === 'punct' ? undefined : `vg-code-${t.type}`">{{ t.text }}</span></template><template v-else>{{ source.text }}</template></pre>
</template>
