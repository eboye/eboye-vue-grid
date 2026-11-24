<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type CopyEvent,
  type RowKey,
  type VGridExposed,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(40, 9)
const grid = ref<VGridExposed>()
const selected = ref<RowKey[]>([])
const copied = ref('')
const preview = ref('')

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    sortable: true,
    filterable: true,
  }),
  col({ key: 'city', header: 'City', field: 'player.city', filterable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    filterable: true,
  }),
  col({
    key: 'stake',
    header: 'Stake',
    renderer: 'currency',
    sortable: true,
    filterable: true,
    aggregate: 'sum',
  }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true }),
  // Left out of exports and copies.
  col({ key: 'note', header: '', width: 'min-content', exportable: false, value: () => '⋯' }),
]

const onCopy = (e: CopyEvent<Bet>) =>
  (copied.value = e.kind === 'cell' ? `Copied a cell: ${e.text}` : `Copied ${e.rows.length} rows`)
</script>

<template>
  <VGrid
    ref="grid"
    v-model:selected="selected"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    selectable
    filter-row
    totals
    aria-label="Bets"
    @copy="onCopy"
  >
    <template #toolbar>
      <button
        type="button"
        class="vg-button"
        @click="grid?.exportCsv({ filename: 'bets.csv', totals: true })"
      >
        Download CSV
      </button>
      <!-- Typed cells (numbers, dates), money formats, a bold frozen header; the writer loads on demand. -->
      <button
        type="button"
        class="vg-button"
        @click="grid?.exportXlsx({ filename: 'bets.xlsx', totals: true, sheetName: 'Bets' })"
      >
        Download Excel
      </button>
      <!-- Every row that passes the filters, the header on each printed page. -->
      <button type="button" class="vg-button" @click="grid?.print({ title: 'Bets', totals: true })">
        Print
      </button>
      <button
        type="button"
        class="vg-button"
        :disabled="!selected.length"
        @click="grid?.copyRows()"
      >
        Copy {{ selected.length }} selected
      </button>
      <button
        type="button"
        class="vg-button vg-button-ghost"
        @click="preview = grid?.getCsv({ values: 'formatted' }) ?? ''"
      >
        Preview CSV
      </button>
      <span class="demo-muted" aria-live="polite">{{ copied }}</span>
    </template>
  </VGrid>
  <pre v-if="preview" class="demo-csv" tabindex="0" aria-label="CSV preview">{{ preview }}</pre>
</template>
