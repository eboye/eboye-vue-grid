<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  VGridSearch,
  type FilterState,
  type SortState,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(200, 13)
const filters = ref<FilterState | null>(null)
const sort = ref<SortState | null>({ key: 'stake', dir: 'desc' })

// The filter type follows the renderer: currency → number, date → date, boolean → yes / no,
// status → a value list; `filter` picks another.
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
    filter: 'set',
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    filterable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, filterable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true, filterable: true }),
  col({ key: 'verified', header: 'KYC', renderer: 'boolean', filterable: true }),
]
</script>

<template>
  <VGrid
    v-model:filters="filters"
    v-model:sort="sort"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    filter-row
    aria-label="Bets"
  >
    <template #toolbar="{ activeFilterCount, clearFilters }">
      <VGridSearch placeholder="Search player or city…" />
      <span class="demo-muted">{{ activeFilterCount }} active</span>
      <button
        type="button"
        class="vg-button vg-button-ghost"
        :disabled="!activeFilterCount"
        @click="clearFilters"
      >
        Clear all
      </button>
    </template>
  </VGrid>
  <p class="demo-log">v-model:filters = {{ JSON.stringify(filters) }}</p>
</template>
