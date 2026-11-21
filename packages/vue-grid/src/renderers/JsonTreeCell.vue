<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import type { CellRendererProps } from '../types'
import { parseJsonish } from './format'
import JsonTreeNode from './JsonTreeNode.vue'
import type { JsonTreeOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, JsonTreeOptions>>()
const data = computed(() => parseJsonish(props.value))
const isEmpty = computed(() => data.value === undefined || data.value === null || data.value === '')
const shown = ref(!props.options.collapsed)
const treeId = `vg-json-tree-${useId()}`
</script>

<template>
  <span v-if="isEmpty && options.emptyText" class="vg-text vg-text-muted">{{ options.emptyText }}</span>
  <span v-else-if="!isEmpty" class="vg-json-tree-wrap">
    <button
      v-if="options.collapsed"
      type="button"
      class="vg-link-button vg-json-reveal"
      :aria-expanded="shown"
      :aria-controls="treeId"
      @click.stop="shown = !shown"
    >
      {{ options.toggleLabel ?? 'More info' }}
      <span class="vg-json-caret" :class="{ 'vg-json-caret-open': shown }" aria-hidden="true">▸</span>
    </button>
    <ul v-if="shown" :id="treeId" class="vg-json-tree" role="tree" @click.stop>
      <JsonTreeNode
        :value="data"
        :level="0"
        :collapse-at="options.collapseAt ?? 1"
        :max-depth="options.maxDepth ?? Infinity"
        :parse-nested="!!options.parseNested"
      />
    </ul>
  </span>
</template>
