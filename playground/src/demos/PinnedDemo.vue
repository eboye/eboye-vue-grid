<script setup lang="ts">
import { createColumnHelper, VGrid, VGridColumnMenu } from '@eboye/vue-grid'
import { makeBets, type Bet } from '../data'

const rows = makeBets(40, 11)
const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', pinned: 'left', width: '4rem', hideable: false, reorderable: false }),
  col({ key: 'player', header: 'Player', field: 'player.name', pinned: 'left', width: '11rem' }),
  col({ key: 'city', header: 'City', field: 'player.city', width: '10rem' }),
  col({ key: 'status', header: 'Status', renderer: 'status', width: '9rem' }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', width: '9rem' }),
  col({ key: 'payout', header: 'Payout', renderer: 'currency', width: '9rem' }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', width: '8rem' }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', width: '9rem' }),
  col({ key: 'verified', header: 'KYC', renderer: 'boolean', width: '6rem', hidden: true }),
  col({ key: 'site', header: 'URL', width: '18rem', renderer: 'text', rendererOptions: { ellipsis: true } }),
  col({
    key: 'open',
    header: 'Open',
    pinned: 'right',
    width: '6rem',
    renderer: 'action-button',
    rendererOptions: { label: 'Open' },
    value: () => 'Open',
  }),
]
</script>

<template>
  <section id="pinned" class="pg-card" data-demo="pinned">
    <h2>Pinned columns, column menu, drag / keyboard reorder, persistence</h2>
    <p>
      Scroll sideways: # and Player stay left, Open stays right. Drag headers (or focus one and press Alt+←/→) to
      reorder. Layout is saved in localStorage.
    </p>
    <VGrid class="pg-fixed" :rows="rows" :columns="columns" row-key="id" storage="pg-pinned-columns" aria-label="Pinned">
      <template #toolbar="{ columnState, setColumnState }">
        <VGridColumnMenu :columns="columns" :column-state="columnState" @update:column-state="setColumnState($event!)" />
      </template>
    </VGrid>
  </section>
</template>
