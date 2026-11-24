<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type SortState, type VGridExposed } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const count = 100_000
const rows = makeBets(count, 99)
const sort = ref<SortState | null>(null)
const grid = ref<VGridExposed>()
const target = ref(50_000)

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: '7rem', sortable: true }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr', sortable: true }),
  col({ key: 'city', header: 'City', field: 'player.city', sortable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true }),
]
</script>

<template>
  <form class="demo-bar" @submit.prevent="grid?.scrollToRow(target)">
    <label
      >Bet #
      <input v-model.number="target" class="demo-input" type="number" min="1" :max="count" />
    </label>
    <button type="submit" class="vg-button">Jump</button>
    <span class="demo-muted">{{ count.toLocaleString('en-US') }} rows</span>
  </form>
  <!-- Only the rows in view (plus overscan) are in the DOM; the grid needs a bounded height. -->
  <VGrid
    ref="grid"
    v-model:sort="sort"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    :virtual="{ rowHeight: 40, overscan: 8 }"
    aria-label="A hundred thousand bets"
  />
</template>
