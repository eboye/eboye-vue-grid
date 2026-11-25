<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  createColumnHelper,
  setCellValue,
  VGrid,
  type CellEditEvent,
  type CellRange,
  type CellsPasteEvent,
  type CopyEvent,
  type RowKey,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

// Reactive rows: pasted values are written into them (one `cell-edit` per changed cell).
const few = reactive(makeBets(60, 31))
const many = reactive(makeBets(2000, 31))
const virtual = ref(false)
const grouped = ref(false)
const rows = computed(() => (virtual.value ? many : few))

// The selected block: its corners, by row key and column key (null: none).
const range = ref<CellRange | null>(null)
const selected = ref<RowKey[]>([])
const log = ref<string[]>([])
const say = (line: string) => (log.value = [line, ...log.value].slice(0, 4))

const onCopy = (e: CopyEvent<Bet>) =>
  say(`Copied ${e.rows.length} × ${e.columns.length}: ${e.text.split('\n')[0]}…`)
const onEdit = (e: CellEditEvent<Bet>) => setCellValue(e.row, e.column, e.value)
const onPaste = (e: CellsPasteEvent<Bet>) =>
  say(
    `Pasted: ${e.edits.length} changed` +
      (e.skipped.length
        ? `, ${e.skipped.length} left alone (${[...new Set(e.skipped.map((s) => s.reason))].join(', ')})`
        : ''),
  )

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    sortable: true,
    editable: true,
  }),
  col({
    key: 'city',
    header: 'City',
    field: 'player.city',
    sortable: true,
    groupable: true,
    editable: true,
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    groupable: true,
    editable: true,
    editorOptions: { options: ['Open', 'Won', 'Lost', 'Void'] },
  }),
  col({
    key: 'stake',
    header: 'Stake',
    renderer: 'currency',
    sortable: true,
    aggregate: 'sum',
    editable: true,
    editorOptions: { min: 0 },
  }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', sortable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true, editable: true }),
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
    @cell-edit="onEdit"
    @cells-paste="onPaste"
  />
  <ul class="demo-log" data-testid="log">
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
    <li v-if="!log.length">Copy a block (Ctrl+C), click another cell, paste it (Ctrl+V).</li>
  </ul>
</template>
