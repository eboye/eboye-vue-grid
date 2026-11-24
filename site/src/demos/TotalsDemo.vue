<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type CellContext,
  type ContextActionEvent,
  type MenuItem,
  type PinnedRowsState,
  type RowKey,
  type VGridExposed,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(60, 11)
const pinned = ref<PinnedRowsState>({ top: [3], bottom: [] })
const grid = ref<VGridExposed>()

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    aggregate: 'count',
  }),
  col({ key: 'city', header: 'City', field: 'player.city', filterable: true, filter: 'set' }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, aggregate: 'sum' }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', aggregate: 'avg' }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', aggregate: 'max' }),
]

const isPinned = (key: RowKey) =>
  pinned.value.top?.includes(key) || pinned.value.bottom?.includes(key)

// Right-click a row: pin it above or below the body.
const contextMenu = ({ rowKey }: CellContext<Bet>): MenuItem[] =>
  isPinned(rowKey)
    ? [{ name: 'unpin', label: 'Unpin row' }]
    : [
        { name: 'top', label: 'Pin to top' },
        { name: 'bottom', label: 'Pin to bottom' },
      ]

const onContextAction = ({ name, rowKey }: ContextActionEvent<Bet>) =>
  grid.value?.pinRow(rowKey, name === 'unpin' ? null : (name as 'top' | 'bottom'))
</script>

<template>
  <VGrid
    ref="grid"
    v-model:pinned-rows="pinned"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    totals
    totals-label="All bets"
    :context-menu="contextMenu"
    aria-label="Bets"
    @context-action="onContextAction"
  />
  <p class="demo-log">v-model:pinned-rows = {{ JSON.stringify(pinned) }}</p>
</template>
