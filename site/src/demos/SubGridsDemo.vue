<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type RowKey, type VGridExposed } from '@nocopypaste/vue-grid'
import { loadFolder, makeMarkets, rootFolders, type Folder, type Market } from '../data'

// Children in the data: `sub-rows` returns them. Selection cascades through the levels.
const markets = makeMarkets()
const expanded = ref<RowKey[]>(['fb'])
const selected = ref<RowKey[]>([])
const grid = ref<VGridExposed>()

const m = createColumnHelper<Market>()
const marketColumns = [
  m({ key: 'name', header: 'Market', width: 'minmax(14rem, 2fr)', sortable: true }),
  m({ key: 'selections', header: 'Selections', renderer: 'number', sortable: true }),
  m({ key: 'turnover', header: 'Turnover', renderer: 'currency', sortable: true }),
  m({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: { Active: 'success', Suspended: 'warning', Closed: 'neutral' } },
  }),
]

// Children loaded on first expand: `load-sub-rows` (a failed load shows Retry).
const f = createColumnHelper<Folder>()
const folderColumns = [
  f({ key: 'name', header: 'Name', width: 'minmax(16rem, 2fr)' }),
  f({
    key: 'size',
    header: 'Size (kB)',
    renderer: 'number',
    value: (row) => (row.size ? row.size / 1024 : null),
    rendererOptions: { format: { maximumFractionDigits: 0 }, placeholder: '—' },
  }),
  f({ key: 'modified', header: 'Modified', renderer: 'date' }),
]
</script>

<template>
  <div class="demo-bar">
    <button type="button" class="vg-button" @click="grid?.expandAll()">Expand all</button>
    <button type="button" class="vg-button vg-button-ghost" @click="grid?.collapseAll()">
      Collapse all
    </button>
  </div>
  <VGrid
    ref="grid"
    v-model:expanded="expanded"
    v-model:selected="selected"
    :rows="markets"
    :columns="marketColumns"
    row-key="id"
    :sub-rows="(row) => row.children"
    selectable
    sort-mode="client"
    aria-label="Markets"
  />
  <p class="demo-log">v-model:selected = [{{ selected.join(', ') }}]</p>

  <h2 class="demo-heading">Loaded on demand</h2>
  <VGrid
    :rows="rootFolders"
    :columns="folderColumns"
    row-key="id"
    :load-sub-rows="loadFolder"
    :has-sub-rows="(row) => row.hasChildren"
    aria-label="Files"
  />
</template>
