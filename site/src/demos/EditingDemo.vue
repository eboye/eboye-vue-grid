<script setup lang="ts">
import { reactive, ref } from 'vue'
import { createColumnHelper, setCellValue, VGrid, type CellEditEvent } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

// Rows are reactive: the save handler writes the new value into them.
const rows = reactive(makeBets(60, 17))
const log = ref<string[]>([])

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content' }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    editable: true,
    validate: (v) => (String(v ?? '').trim() ? undefined : 'A player needs a name.'),
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    editable: (bet) => bet.status !== 'Void', // a void bet is final
    editorOptions: { options: ['Open', 'Won', 'Lost', 'Void'] },
  }),
  col({
    key: 'stake',
    header: 'Stake',
    renderer: 'currency',
    editable: true,
    editorOptions: { min: 0 },
  }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', editable: true }),
  col({ key: 'verified', header: 'KYC', renderer: 'boolean', editable: true }),
]

// A pretend server: 300 ms per save, and stakes over 10,000 need approval.
async function saveCell(e: CellEditEvent<Bet>) {
  await new Promise((r) => setTimeout(r, 300))
  if (e.column.key === 'stake' && Number(e.value) > 10000)
    throw new Error('Stakes over 10,000 need approval.')
  setCellValue(e.row, e.column, e.value)
  log.value = [
    `#${e.rowKey} ${e.column.header}: ${JSON.stringify(e.oldValue)} → ${JSON.stringify(e.value)}`,
    ...log.value,
  ].slice(0, 4)
}
</script>

<template>
  <VGrid
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    :save-cell="saveCell"
    aria-label="Bets"
  />
  <p class="demo-log">saved: {{ log.length ? log.join(' · ') : 'nothing yet' }}</p>
</template>
