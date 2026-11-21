<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererProps } from '../types'
import { parseJsonish } from './format'
import JsonTreeNode from './JsonTreeNode.vue'
import type { JsonTreeOptions } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, JsonTreeOptions>>()
const data = computed(() => parseJsonish(props.value))
</script>

<template>
  <ul v-if="data !== undefined" class="vg-json-tree" role="tree" @click.stop>
    <JsonTreeNode :value="data" :level="0" :collapse-at="options.collapseAt ?? 1" />
  </ul>
</template>
