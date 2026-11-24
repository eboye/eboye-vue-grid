<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, VGridColumnMenu, type ColumnState } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(40, 11)
const columnState = ref<ColumnState>()

// `group` gives adjacent columns one header; `pinned` keeps a column in view while scrolling
// sideways. Drag a header to move it, drag its edge to resize; `storage` remembers the layout.
const col = createColumnHelper<Bet>()
const columns = [
  col({
    key: 'id',
    header: '#',
    pinned: 'left',
    width: '4.5rem',
    hideable: false,
    reorderable: false,
    group: 'Bet',
  }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    pinned: 'left',
    width: '11rem',
    group: 'Bet',
  }),
  col({ key: 'city', header: 'City', field: 'player.city', width: '10rem', group: 'Bet' }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    width: '9rem',
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', width: '9rem', group: 'Money' }),
  col({ key: 'payout', header: 'Payout', renderer: 'currency', width: '9rem', group: 'Money' }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', width: '8rem', group: 'Money' }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', width: '9rem' }),
  col({ key: 'verified', header: 'KYC', renderer: 'boolean', width: '6rem', hidden: true }),
  col({ key: 'site', header: 'URL', width: '18rem', rendererOptions: { ellipsis: true } }),
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
  <VGrid
    v-model:column-state="columnState"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    storage="site-columns-demo"
    aria-label="Bets"
  >
    <template #toolbar="{ columnState: state, setColumnState }">
      <VGridColumnMenu
        :columns="columns"
        :column-state="state"
        @update:column-state="setColumnState($event!)"
      />
      <button
        type="button"
        class="vg-button vg-button-ghost"
        @click="setColumnState({ order: [], hidden: ['verified'], pinned: {}, widths: {} })"
      >
        Reset layout
      </button>
    </template>
  </VGrid>
  <p class="demo-log">v-model:column-state = {{ JSON.stringify(columnState) }}</p>
</template>
