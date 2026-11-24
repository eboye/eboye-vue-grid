<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type RowKey, type VGridExposed } from '@nocopypaste/vue-grid'
import { loadFolder, makeMarkets, rootFolders, type Folder, type Market } from '../data'

const markets = makeMarkets()
const expanded = ref<RowKey[]>([])
const selected = ref<RowKey[]>([])
const marketGrid = ref<VGridExposed>()

const m = createColumnHelper<Market>()
const marketColumns = [
  m({ key: 'name', header: 'Market', width: 'minmax(14rem, 2fr)', sortable: true }),
  m({ key: 'selections', header: 'Selections', renderer: 'number', sortable: true }),
  m({ key: 'turnover', header: 'Turnover', renderer: 'currency', sortable: true }),
  m({
    key: 'margin',
    header: 'Margin %',
    renderer: 'number',
    rendererOptions: { format: { minimumFractionDigits: 1 } },
  }),
  m({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: { Active: 'success', Suspended: 'warning', Closed: 'neutral' } },
  }),
]

const f = createColumnHelper<Folder>()
const folderColumns = [
  f({ key: 'name', header: 'Name', width: 'minmax(16rem, 2fr)' }),
  f({
    key: 'size',
    header: 'Size',
    renderer: 'number',
    value: (row) => (row.size ? row.size / 1024 : null),
    rendererOptions: { format: { maximumFractionDigits: 0 }, placeholder: '—' },
  }),
  f({ key: 'modified', header: 'Modified', renderer: 'date' }),
]
const errors = ref(0)
</script>

<template>
  <section id="subgrid" class="pg-card" data-demo="subgrid">
    <h2>Sub-grid (CSS subgrid), nested, with cascading selection</h2>
    <p>Child rows share the parent's column tracks. Sorting applies within each level.</p>
    <div class="pg-row">
      <button
        class="pg-btn"
        type="button"
        data-testid="expand-all"
        @click="marketGrid?.expandAll()"
      >
        Expand all
      </button>
      <button
        class="pg-btn"
        type="button"
        data-testid="collapse-all"
        @click="marketGrid?.collapseAll()"
      >
        Collapse all
      </button>
      <span data-testid="subgrid-selected"
        >Selected: {{ selected.length ? selected.join(', ') : 'none' }}</span
      >
    </div>
    <VGrid
      ref="marketGrid"
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
  </section>

  <section id="lazy" class="pg-card" data-demo="lazy">
    <h2>Lazy sub-grid (async loadSubRows)</h2>
    <p>Children load on first expand. "Broken" fails once — use Retry.</p>
    <VGrid
      :rows="rootFolders"
      :columns="folderColumns"
      row-key="id"
      :load-sub-rows="loadFolder"
      :has-sub-rows="(row) => row.hasChildren"
      aria-label="Files"
      @sub-rows-error="errors++"
    />
    <div class="pg-log" data-testid="errors">errors: {{ errors }}</div>
  </section>
</template>
