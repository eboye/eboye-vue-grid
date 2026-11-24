<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import { parseJsonish } from './format'
import JsonTreeNode from './JsonTreeNode.vue'
import type { JsonTreeOptions } from './options'
import { useMessages } from '../internal/messages'

const props = defineProps<CellRendererProps<unknown, unknown, JsonTreeOptions>>()
const m = useMessages()
const data = computed(() => parseJsonish(props.value))
const isEmpty = computed(() => data.value === undefined || data.value === null || data.value === '')
</script>

<template>
  <span v-if="isEmpty && options.emptyText" class="vg-text vg-text-muted">{{
    options.emptyText
  }}</span>
  <!-- `collapsed`: a native <details> disclosure — no JS state. -->
  <details v-else-if="!isEmpty && options.collapsed" class="vg-json-reveal" @click.stop>
    <summary class="vg-link-button">{{ options.toggleLabel ?? m.moreInfo ?? 'More info' }}</summary>
    <ul class="vg-json-tree">
      <JsonTreeNode
        :value="data"
        :level="0"
        :collapse-at="options.collapseAt ?? 1"
        :max-depth="options.maxDepth ?? Infinity"
        :parse-nested="!!options.parseNested"
      />
    </ul>
  </details>
  <ul v-else-if="!isEmpty" class="vg-json-tree" @click.stop>
    <JsonTreeNode
      :value="data"
      :level="0"
      :collapse-at="options.collapseAt ?? 1"
      :max-depth="options.maxDepth ?? Infinity"
      :parse-nested="!!options.parseNested"
    />
  </ul>
</template>
