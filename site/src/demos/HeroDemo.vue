<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  VGridColumnMenu,
  VGridSearch,
  type RowKey,
  type VGridExposed,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(500, 3)
const selected = ref<RowKey[]>([])
const groupBy = ref<string[]>([])
const grid = ref<VGridExposed>()

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1.4fr)',
    sortable: true,
    filterable: true,
    aggregate: 'count',
  }),
  col({
    key: 'city',
    header: 'City',
    field: 'player.city',
    sortable: true,
    filterable: true,
    filter: 'set',
    groupable: true,
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    sortable: true,
    filterable: true,
    groupable: true,
  }),
  col({
    key: 'stake',
    header: 'Stake',
    renderer: 'currency',
    sortable: true,
    filterable: true,
    aggregate: 'sum',
  }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', sortable: true, aggregate: 'avg' }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true, filterable: true }),
  col({ key: 'verified', header: 'KYC', renderer: 'boolean', filterable: true }),
  col({ key: 'rating', header: 'Rating', renderer: 'rating', sortable: true }),
]

const toggleGroup = (key: string) =>
  (groupBy.value = groupBy.value.includes(key)
    ? groupBy.value.filter((k) => k !== key)
    : [...groupBy.value, key])
</script>

<template>
  <VGrid
    ref="grid"
    v-model:selected="selected"
    v-model:group-by="groupBy"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    selectable
    totals
    :virtual="{ rowHeight: 40 }"
    storage="site-hero-columns"
    :status-bar="{ summary: ['stake'] }"
    aria-label="Bets"
  >
    <template #toolbar="{ columnState, setColumnState }">
      <VGridSearch placeholder="Search 500 bets…" />
      <span class="demo-toolbar-group" role="group" aria-label="Group by">
        <button
          v-for="key in ['status', 'city']"
          :key="key"
          type="button"
          class="vg-button"
          :class="{ 'vg-button-ghost': !groupBy.includes(key) }"
          :aria-pressed="groupBy.includes(key)"
          @click="toggleGroup(key)"
        >
          By {{ key }}
        </button>
      </span>
      <VGridColumnMenu
        :columns="columns"
        :column-state="columnState"
        @update:column-state="setColumnState($event!)"
      />
      <button type="button" class="vg-button" @click="grid?.exportCsv({ filename: 'bets.csv' })">
        CSV
      </button>
    </template>
  </VGrid>
</template>
