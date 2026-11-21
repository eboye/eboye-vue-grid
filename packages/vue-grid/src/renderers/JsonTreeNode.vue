<script setup lang="ts">
import { computed, ref } from 'vue'

defineOptions({ name: 'JsonTreeNode' })

const props = defineProps<{
  name?: string | number
  value: unknown
  level: number
  collapseAt: number
}>()

const isObject = computed(() => props.value !== null && typeof props.value === 'object' && !(props.value instanceof Date))
const isArray = computed(() => Array.isArray(props.value))
const entries = computed<[string | number, unknown][]>(() =>
  isArray.value
    ? (props.value as unknown[]).map((v, i) => [i, v])
    : isObject.value
      ? Object.entries(props.value as Record<string, unknown>)
      : [],
)
const open = ref(props.level < props.collapseAt)

const primitive = computed(() => {
  const v = props.value
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
  <li class="vg-json-node" :role="isObject ? 'treeitem' : 'none'" :aria-expanded="isObject && entries.length ? open : undefined">
    <template v-if="isObject">
      <button
        v-if="entries.length"
        type="button"
        class="vg-json-toggle"
        :aria-label="open ? 'Collapse' : 'Expand'"
        @click.stop="open = !open"
      >
        <span class="vg-json-caret" :class="{ 'vg-json-caret-open': open }" aria-hidden="true">▸</span>
      </button>
      <span v-if="name !== undefined" class="vg-json-key">{{ name }}:</span>
      <span class="vg-json-summary">{{ summary }}</span>
      <ul v-if="open && entries.length" class="vg-json-children" role="group">
        <JsonTreeNode
          v-for="[childName, child] in entries"
          :key="childName"
          :name="childName"
          :value="child"
          :level="level + 1"
          :collapse-at="collapseAt"
        />
      </ul>
    </template>
    <template v-else>
      <span v-if="name !== undefined" class="vg-json-key">{{ name }}:</span>
      <span :class="['vg-json-value', `vg-json-${primitive.type}`]">{{ primitive.text }}</span>
    </template>
  </li>
</template>
