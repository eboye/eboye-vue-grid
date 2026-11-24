<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type SortState } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(137, 5)
const page = ref(1)
const pageSize = ref(10)
const sort = ref<SortState | null>({ key: 'id', dir: 'asc' })

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: '5rem', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: '1fr',
    sortable: true,
    filterable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, filterable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    filterable: true,
  }),
]
</script>

<template>
  <VGrid
    v-model:page="page"
    v-model:page-size="pageSize"
    v-model:sort="sort"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    filter-row
    :pagination="{ pageSizes: [10, 25, 50] }"
    aria-label="Paged bets"
  />
  <p class="demo-log">page = {{ page }} · page-size = {{ pageSize }}</p>
</template>
