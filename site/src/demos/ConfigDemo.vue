<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type GridMessages,
  type GridParts,
  type RowKey,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(80, 24)
const selected = ref<RowKey[]>([3])

// Built-in text: set the ones you need (app-wide in createVueGrid({ messages }), or per grid).
const serbian: GridMessages = {
  empty: 'Nema podataka.',
  noMatch: 'Nijedan red ne odgovara filterima.',
  clearFilters: 'Obriši filtere',
  total: 'Ukupno',
  sortAscending: 'Rastuće',
  sortDescending: 'Opadajuće',
  clearSort: 'Bez sortiranja',
  clearFilter: 'Obriši filter',
  clearAllFilters: 'Obriši sve filtere',
  groupBy: (column) => `Grupiši po: ${column}`,
  ungroup: 'Razgrupiši',
  pinLeft: 'Zakači levo',
  pinRight: 'Zakači desno',
  unpin: 'Otkači',
  moveLeft: 'Pomeri levo',
  moveRight: 'Pomeri desno',
  fitWidth: 'Prilagodi širinu',
  resetWidth: 'Vrati širinu',
  hideColumn: 'Sakrij kolonu',
  resetColumns: 'Vrati kolone',
  filterPlaceholder: 'Filtriraj…',
  filterColumn: (column) => `Filter: ${column}`,
  rowsPerPage: 'Redova po strani',
  pageSize: (size) => `${size} po strani`,
  pageSummary: (from, to, total) => `${from}–${to} od ${total}`,
  nextPage: 'Sledeća strana',
  previousPage: 'Prethodna strana',
  rowCount: (shown, total) => (total ? `${shown} od ${total} redova` : `${shown} redova`),
  selectedCount: (count) => `izabrano: ${count}`,
  filterCount: (count) => `filtera: ${count}`,
  clear: 'Obriši',
  sum: 'Zbir',
  average: 'Prosek',
}
const language = ref<'en' | 'sr'>('sr')
const messages = computed(() => (language.value === 'sr' ? serbian : {}))

// Built-in parts: each is on unless set to false.
const parts = reactive<
  Required<
    Pick<GridParts, 'filterButtons' | 'resizeGrips' | 'headerDrag' | 'selectAll' | 'groupCounts'>
  >
>({
  filterButtons: true,
  resizeGrips: true,
  headerDrag: true,
  selectAll: true,
  groupCounts: true,
})
const labels: Record<keyof typeof parts, string> = {
  filterButtons: 'Filter funnels',
  resizeGrips: 'Resize grips',
  headerDrag: 'Header drag',
  selectAll: 'Select-all checkbox',
  groupCounts: 'Group counts',
}

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
  col({
    key: 'city',
    header: 'City',
    field: 'player.city',
    sortable: true,
    filterable: true,
    groupable: true,
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    filterable: true,
    groupable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, aggregate: 'sum' }),
]
</script>

<template>
  <div class="demo-bar">
    <label
      >Language
      <select v-model="language" class="demo-input">
        <option value="sr">Srpski</option>
        <option value="en">English</option>
      </select>
    </label>
    <label v-for="(label, name) in labels" :key="name">
      <input v-model="parts[name]" type="checkbox" /> {{ label }}
    </label>
  </div>
  <VGrid
    v-model:selected="selected"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    selectable
    filter-row
    totals
    :pagination="{ pageSizes: [10, 25] }"
    :page-size="10"
    :status-bar="{ summary: ['stake'] }"
    :messages="messages"
    :parts="parts"
    aria-label="Bets"
  />
</template>
