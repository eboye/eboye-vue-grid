<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type CellRange,
  type CopyEvent,
  type RowKey,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const few = makeBets(60, 31)
const many = makeBets(2000, 31)
const virtual = ref(false)
const grouped = ref(false)
const rows = computed(() => (virtual.value ? many : few))

// The selected block: its corners, by row key and column key (null: none).
const range = ref<CellRange | null>(null)
const selected = ref<RowKey[]>([])
const copied = ref('')
const onCopy = (e: CopyEvent<Bet>) => (copied.value = e.text)

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    sortable: true,
  }),
  col({ key: 'city', header: 'City', field: 'player.city', sortable: true, groupable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    groupable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, aggregate: 'sum' }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', sortable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true }),
]
</script>

<template>
  <div class="demo-bar">
    <label><input v-model="virtual" type="checkbox" /> 2,000 rows, virtual scrolling</label>
    <label><input v-model="grouped" type="checkbox" /> Group by status</label>
    <span class="demo-muted">{{
      range
        ? `${range.start.columnKey} #${range.start.rowKey} → ${range.end.columnKey} #${range.end.rowKey}`
        : 'No range'
    }}</span>
  </div>
  <VGrid
    :key="virtual ? 'virtual' : 'plain'"
    v-model:range="range"
    v-model:selected="selected"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    range-selection
    selectable
    status-bar
    :group-by="grouped ? ['status'] : null"
    groups-expanded
    :virtual="virtual ? { rowHeight: 41 } : undefined"
    aria-label="Bets"
    @copy="onCopy"
  />
  <p class="demo-muted">Copied (paste it into a spreadsheet):</p>
  <pre class="demo-log" data-testid="copied">{{ copied || '–' }}</pre>
</template>
