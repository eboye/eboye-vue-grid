<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type CellActionEvent,
  type MenuItem,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

interface Row extends Bet {
  notify: boolean
}

// Editable renderers (switch, rating) are controlled: the app writes the change back.
const rows = ref<Row[]>(makeBets(16, 12).map((b) => ({ ...b, notify: b.id % 3 !== 0 })))
const log = ref('Use a control in the grid.')

const col = createColumnHelper<Row>()
const columns = [
  col({
    key: 'ticket',
    header: 'Ticket',
    renderer: 'copy',
    value: (row) => `TK-${String(row.id).padStart(5, '0')}`,
    width: 'min-content',
  }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(13rem, 1.5fr)',
    rendererOptions: { secondary: (_v, row) => row.player.city },
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones, dot: true },
  }),
  col({
    key: 'risk',
    header: 'Risk',
    renderer: 'chip',
    value: (row) => (row.stake > 350 ? 'C' : row.stake > 150 ? 'B' : 'A'),
    rendererOptions: { tone: { A: 'success', B: 'warning', C: 'danger' }, shape: 'circle' },
    align: 'center',
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency' }),
  col({
    key: 'profit',
    header: 'Profit',
    renderer: 'change',
    value: (row) => Math.round((row.payout - row.stake) * 100) / 100,
    rendererOptions: { currency: true },
  }),
  col({ key: 'change', header: 'Δ odds', renderer: 'signed-number' }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'datetime' }),
  col({
    key: 'channel',
    header: 'Channel',
    renderer: 'multi-line',
    value: (row) => [String(row.meta.channel), `odds ${(row.meta.odds as number[])[0]}`],
    rendererOptions: { boldLines: [0] },
  }),
  col({
    key: 'verified',
    header: 'KYC',
    renderer: 'boolean',
    rendererOptions: { display: 'icon' },
    align: 'center',
  }),
  col({
    key: 'notify',
    header: 'Notify',
    renderer: 'switch',
    rendererOptions: { label: (_v, row) => `Notify ${row.player.name}` },
  }),
  col({ key: 'rating', header: 'Rating', renderer: 'rating' }),
  col({
    key: 'site',
    header: 'Link',
    renderer: 'link',
    rendererOptions: { label: () => 'Open', target: '_blank' },
  }),
  col({
    key: 'meta',
    header: 'Meta',
    renderer: 'json',
    rendererOptions: { dialogTitle: 'Bet meta' },
  }),
  col({
    key: 'actions',
    header: '',
    renderer: 'actions-menu',
    width: 'min-content',
    rendererOptions: {
      actions: (row: Row): MenuItem[] => [
        { name: 'edit', label: 'Edit' },
        { name: 'void', label: 'Void bet', disabled: row.status === 'Void' },
        { separator: true },
        { name: 'delete', label: 'Delete', tone: 'danger' },
      ],
    },
  }),
]

function onCellAction(e: CellActionEvent<Row>) {
  log.value = `cell-action “${e.name}” on #${e.rowKey}, payload ${JSON.stringify(e.payload ?? null)}`
  const patch =
    e.name === 'change'
      ? { notify: e.payload as boolean }
      : e.name === 'rate'
        ? { rating: e.payload as number }
        : null
  if (patch) rows.value = rows.value.map((r) => (r.id === e.rowKey ? { ...r, ...patch } : r))
}
</script>

<template>
  <VGrid
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    aria-label="Renderer gallery"
    @cell-action="onCellAction"
  />
  <p class="demo-log" aria-live="polite">{{ log }}</p>
</template>
