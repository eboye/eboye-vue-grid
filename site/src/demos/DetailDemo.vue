<script setup lang="ts">
import { createColumnHelper, VGrid } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(10, 3)

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content' }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr' }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency' }),
  col({ key: 'payout', header: 'Payout', renderer: 'currency' }),
]

interface Leg {
  leg: number
  event: string
  pick: string
  odds: number
}
const leg = createColumnHelper<Leg>()
const legColumns = [
  leg({ key: 'leg', header: 'Leg', renderer: 'number', width: 'min-content' }),
  leg({ key: 'event', header: 'Event', width: '1fr' }),
  leg({ key: 'pick', header: 'Pick' }),
  leg({
    key: 'odds',
    header: 'Odds',
    renderer: 'number',
    rendererOptions: { format: { minimumFractionDigits: 2 } },
  }),
]
const legsOf = (bet: Bet): Leg[] =>
  Array.from({ length: (bet.id % 3) + 1 }, (_, i) => ({
    leg: i + 1,
    event: ['Partizan – Zvezda', 'Vojvodina – Čukarički', 'TSC – Radnički'][i]!,
    pick: ['Home', 'Draw', 'Away'][(bet.id + i) % 3]!,
    odds: 1.5 + ((bet.id * 7 + i * 3) % 20) / 10,
  }))
</script>

<template>
  <!-- The #detail slot holds anything: here another grid with its own columns. -->
  <VGrid
    :rows="rows"
    :columns="columns"
    row-key="id"
    :row-expandable="(row) => row.status !== 'Void'"
    aria-label="Bets with legs"
  >
    <template #detail="{ row }">
      <VGrid
        :rows="legsOf(row)"
        :columns="legColumns"
        row-key="leg"
        density="compact"
        :aria-label="`Legs of bet ${row.id}`"
      />
    </template>
  </VGrid>
</template>
