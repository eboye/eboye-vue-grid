<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type SortState, type VGridExposed } from '@nocopypaste/vue-grid'
import { makeBets, type Bet } from '../data'

const rows = makeBets(10_000, 99)
const sort = ref<SortState | null>(null)
const grid = ref<VGridExposed>()

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', sortable: true, width: '6rem' }),
  col({ key: 'player', header: 'Player', field: 'player.name', sortable: true, width: '1fr' }),
  col({ key: 'city', header: 'City', field: 'player.city', width: '1fr' }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true }),
]
</script>

<template>
  <section id="virtual" class="pg-card" data-demo="virtual">
    <h2>Virtual scrolling — 10,000 rows</h2>
    <p>Only the visible window (plus overscan) is in the DOM.</p>
    <div class="pg-row">
      <button class="pg-btn" type="button" data-testid="jump" @click="grid?.scrollToRow(5000)">Jump to #5000</button>
    </div>
    <VGrid
      ref="grid"
      v-model:sort="sort"
      class="pg-fixed"
      :rows="rows"
      :columns="columns"
      row-key="id"
      sort-mode="client"
      :virtual="{ rowHeight: 40, overscan: 8 }"
      aria-label="Ten thousand bets"
    />
  </section>
</template>
