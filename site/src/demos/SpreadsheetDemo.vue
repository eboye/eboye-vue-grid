<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  createColumnHelper,
  setCellValue,
  VGrid,
  type CellEditEvent,
  type CellsPasteEvent,
  type VGridExposed,
} from '@nocopypaste/vue-grid'

// A half-year budget: every month cell is editable, Total is worked out from them.
interface Line {
  id: number
  item: string
  team: string
  jan: number
  feb: number
  mar: number
  apr: number
  may: number
  jun: number
}
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun'] as const

const items: [string, string][] = [
  ['Salaries', 'People'],
  ['Contractors', 'People'],
  ['Training', 'People'],
  ['Office rent', 'Facilities'],
  ['Utilities', 'Facilities'],
  ['Cloud hosting', 'Engineering'],
  ['Software licences', 'Engineering'],
  ['Laptops', 'Engineering'],
  ['Ads', 'Marketing'],
  ['Events', 'Marketing'],
  ['Travel', 'Sales'],
  ['Commissions', 'Sales'],
]
// Deterministic sample figures, so the demo looks the same on every visit.
const lines = reactive<Line[]>(
  items.map(([item, team], i) => {
    const base = 800 + ((i * 7919) % 9000)
    const month = (m: number) => Math.round((base * (1 + ((i + m) % 5) * 0.04)) / 10) * 10
    return {
      id: i + 1,
      item,
      team,
      jan: month(0),
      feb: month(1),
      mar: month(2),
      apr: month(3),
      may: month(4),
      jun: month(5),
    }
  }),
)

const grid = ref<VGridExposed>()
const log = ref<string[]>([])
const say = (line: string) => (log.value = [line, ...log.value].slice(0, 4))

// Typing, paste, fill, replace, clear, cut, undo and redo all arrive here, one call per cell.
const onEdit = (e: CellEditEvent<Line>) => setCellValue(e.row, e.column, e.value)
const onPaste = (e: CellsPasteEvent<Line>) =>
  say(
    `Pasted ${e.edits.length} cells` + (e.skipped.length ? `, ${e.skipped.length} left alone` : ''),
  )

let next = lines.length + 1
function addLine() {
  lines.push({
    id: next++,
    item: 'New line',
    team: '',
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 0,
    may: 0,
    jun: 0,
  })
  say('Added a line at the bottom')
}

const total = (l: Line) => months.reduce((sum, m) => sum + (Number(l[m]) || 0), 0)

const col = createColumnHelper<Line>()
const columns = [
  col({ key: 'item', header: 'Line', width: 'minmax(11rem, 1fr)', pinned: 'left', editable: true }),
  col({ key: 'team', header: 'Team', groupable: true, editable: true }),
  ...months.map((m) =>
    col({
      key: m,
      header: m[0]!.toUpperCase() + m.slice(1),
      renderer: 'currency',
      aggregate: 'sum',
      editable: true,
      editorOptions: { min: 0 },
    }),
  ),
  col({ key: 'total', header: 'Total', renderer: 'currency', value: total, aggregate: 'sum' }),
]
</script>

<template>
  <VGrid
    ref="grid"
    class="demo-tall"
    :rows="lines"
    :columns="columns"
    row-key="id"
    density="compact"
    range-selection
    status-bar
    totals
    totals-label="Budget"
    aria-label="Budget"
    @cell-edit="onEdit"
    @cells-paste="onPaste"
  >
    <template #toolbar="{ undo, redo, canUndo, canRedo, openFind }">
      <button type="button" class="vg-button" :disabled="!canUndo" @click="undo()">Undo</button>
      <button type="button" class="vg-button" :disabled="!canRedo" @click="redo()">Redo</button>
      <button type="button" class="vg-button" @click="openFind({ replace: true })">
        Find and replace
      </button>
      <button type="button" class="vg-button" @click="addLine">Add line</button>
      <!-- Numbers stay numbers in Excel; the totals row comes along -->
      <button
        type="button"
        class="vg-button vg-button-ghost"
        @click="grid?.exportXlsx({ filename: 'budget.xlsx', totals: true, sheetName: 'Budget' })"
      >
        Download Excel
      </button>
    </template>
  </VGrid>
  <ul class="demo-log" data-testid="log">
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
    <li v-if="!log.length">Click a cell and start typing, or paste a block from a spreadsheet.</li>
  </ul>
</template>
