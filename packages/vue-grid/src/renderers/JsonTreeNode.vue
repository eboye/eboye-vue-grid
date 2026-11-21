<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseJsonish } from './format'

defineOptions({ name: 'JsonTreeNode' })

const props = withDefaults(
  defineProps<{
    name?: string | number
    value: unknown
    level: number
    collapseAt: number
    maxDepth?: number
    parseNested?: boolean
  }>(),
  { maxDepth: Infinity, parseNested: false },
)

/** With `parseNested`, a string holding a JSON object/array becomes that object/array. */
const resolved = computed(() => {
  const v = props.value
  if (!props.parseNested || typeof v !== 'string' || !/^\s*[[{]/.test(v)) return v
  return parseJsonish(v)
})
const isObject = computed(() => resolved.value !== null && typeof resolved.value === 'object' && !(resolved.value instanceof Date))
const isArray = computed(() => Array.isArray(resolved.value))
const entries = computed<[string | number, unknown][]>(() =>
  isArray.value
    ? (resolved.value as unknown[]).map((v, i) => [i, v])
    : isObject.value
      ? Object.entries(resolved.value as Record<string, unknown>)
      : [],
)
const canOpen = computed(() => entries.value.length > 0 && props.level < props.maxDepth)
const open = ref(props.level < props.collapseAt)

const primitive = computed(() => {
  const v = resolved.value
  if (v === null) return { type: 'null', text: 'null' }
  if (v instanceof Date) return { type: 'date', text: v.toISOString() }
  if (typeof v === 'string') return { type: 'string', text: JSON.stringify(v) }
  return { type: typeof v, text: String(v) }
})
const summary = computed(() => {
  const n = entries.value.length
  return isArray.value ? `[${n} ${n === 1 ? 'item' : 'items'}]` : `{${n} ${n === 1 ? 'key' : 'keys'}}`
})
</script>

<template>
  <li class="vg-json-node" :role="isObject ? 'treeitem' : 'none'" :aria-expanded="isObject && canOpen ? open : undefined">
    <template v-if="isObject">
      <button
        v-if="canOpen"
        type="button"
        class="vg-json-toggle"
        :aria-label="open ? 'Collapse' : 'Expand'"
        @click.stop="open = !open"
      >
        <span class="vg-json-caret" :class="{ 'vg-json-caret-open': open }" aria-hidden="true">▸</span>
      </button>
      <span v-if="name !== undefined" class="vg-json-key">{{ name }}:</span>
      <span class="vg-json-summary">{{ summary }}</span>
      <ul v-if="open && canOpen" class="vg-json-children" role="group">
        <JsonTreeNode
          v-for="[childName, child] in entries"
          :key="childName"
          :name="childName"
          :value="child"
          :level="level + 1"
          :collapse-at="collapseAt"
          :max-depth="maxDepth"
          :parse-nested="parseNested"
        />
      </ul>
    </template>
    <template v-else>
      <span v-if="name !== undefined" class="vg-json-key">{{ name }}:</span>
      <span :class="['vg-json-value', `vg-json-${primitive.type}`]">{{ primitive.text }}</span>
    </template>
  </li>
</template>
