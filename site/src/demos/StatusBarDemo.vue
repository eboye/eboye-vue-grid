<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, VGridSearch, type RowKey } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(300, 31)
const selected = ref<RowKey[]>([4, 9, 12])

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    sortable: true,
  }),
  col({
    key: 'city',
    header: 'City',
    field: 'player.city',
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
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'payout', header: 'Payout', renderer: 'currency', sortable: true }),
]
</script>

<template>
  <!-- status-bar: the counts; summary: these columns' sum and average over the selected rows. -->
  <VGrid
    v-model:selected="selected"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    selectable
    :status-bar="{ summary: ['stake', 'payout'] }"
    aria-label="Bets"
  >
    <template #toolbar>
      <VGridSearch placeholder="Search player or city…" />
    </template>
  </VGrid>
</template>
