<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type RowKey } from '@nocopypaste/vue-grid'
import { makeBets, type Bet } from '../data'

const rows = makeBets(8, 3)
const selected = ref<RowKey[]>([])

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content' }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr' }),
  col({ key: 'status', header: 'Status', renderer: 'status' }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency' }),
]

interface Leg {
  leg: number
  event: string
  odds: number
}
const leg = createColumnHelper<Leg>()
const legColumns = [
  leg({ key: 'leg', header: 'Leg', renderer: 'number' }),
  leg({ key: 'event', header: 'Event', width: '1fr' }),
  leg({ key: 'odds', header: 'Odds', renderer: 'number', rendererOptions: { format: { minimumFractionDigits: 2 } } }),
]
const legsFor = (bet: Bet): Leg[] =>
  Array.from({ length: (bet.id % 3) + 1 }, (_, i) => ({ leg: i + 1, event: `Event ${bet.id}.${i + 1}`, odds: 1.5 + i * 0.35 }))
</script>

<template>
  <section id="detail" class="pg-card" data-demo="detail">
    <h2>Detail rows & selection</h2>
    <p>The detail slot can hold anything — here a nested grid with a different column set.</p>
    <VGrid
      v-model:selected="selected"
      :rows="rows"
      :columns="columns"
      row-key="id"
      selectable
      :is-row-selectable="(row) => row.status !== 'Void'"
      :row-expandable="(row) => row.status !== 'Void'"
      aria-label="Bets with details"
    >
      <template #detail="{ row }">
        <VGrid :rows="legsFor(row)" :columns="legColumns" row-key="leg" density="compact" :aria-label="`Legs of bet ${row.id}`" />
      </template>
    </VGrid>
    <div class="pg-log" data-testid="selected">selected: {{ selected.join(', ') || 'none' }}</div>
  </section>
</template>
