<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type CellActionEvent,
  type CellContext,
  type ContextActionEvent,
  type HeaderActionEvent,
  type MenuItem,
  type SortState,
} from '@nocopypaste/vue-grid'
import { makeBets, type Bet } from '../data'

const rows = makeBets(25)
const sort = ref<SortState | null>(null)
const log = ref('')

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', sortable: true, width: 'min-content' }),
  col({ key: 'player', header: 'Player', field: 'player.name', sortable: true, minWidth: '9rem', width: '1.2fr' }),
  col({ key: 'city', header: 'City', field: 'player.city', sortable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    sortable: true,
    rendererOptions: { tone: { Won: 'success', Lost: 'danger', Open: 'info', Void: 'neutral' } },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', sortable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'datetime', sortable: true }),
  col({ key: 'verified', header: 'KYC', renderer: 'boolean', align: 'center' }),
  col({ key: 'rating', header: 'Rating', renderer: 'rating', rendererOptions: { max: 5 }, sortable: true }),
  col({ key: 'site', header: 'Link', renderer: 'link', rendererOptions: { label: () => 'Open', target: '_blank' } }),
  col({ key: 'meta', header: 'Meta', renderer: 'json' }),
  col({
    key: 'actions',
    header: '',
    renderer: 'actions-menu',
    width: 'min-content',
    rendererOptions: {
      actions: (row: Bet) => [
        { name: 'void', label: 'Void bet', disabled: row.status === 'Void' },
        { name: 'delete', label: 'Delete', tone: 'danger' as const },
      ],
    },
  }),
]

function onRowClick(row: Bet) {
  log.value = `row-click #${row.id}`
}

// Right-click on any body cell. Returning [] (e.g. for the Link column) keeps the browser's menu.
function contextMenu({ row, column }: CellContext<Bet>): MenuItem[] {
  if (column.key === 'site') return []
  return [
    { name: 'copy', label: `Copy ${column.header || column.key}`, hint: 'Ctrl+C' },
    { name: 'open', label: `Open bet #${row.id}` },
    { separator: true },
    { name: 'void', label: 'Void bet', disabled: row.status === 'Void' },
    { name: 'delete', label: 'Delete', tone: 'danger' },
  ]
}

function onContextAction(e: ContextActionEvent<Bet>) {
  log.value = `context-action ${e.name} #${e.rowKey} ${e.column.key}`
}

function onHeaderAction(e: HeaderActionEvent<Bet>) {
  log.value = `header-action ${e.name} ${e.column.key}`
}

function onAction(e: CellActionEvent<Bet>) {
  log.value = `cell-action ${e.name} #${e.rowKey} ${JSON.stringify(e.payload ?? null)}`
}
</script>

<template>
  <section id="basic" class="pg-card" data-demo="basic">
    <h2>Renderers & client-side sorting</h2>
    <p>Click headers to sort (asc → desc → none). Right-click a cell or a header for menus. Rating is the boilerplate addon renderer.</p>
    <VGrid
      v-model:sort="sort"
      class="pg-fixed"
      :rows="rows"
      :columns="columns"
      row-key="id"
      sort-mode="client"
      row-clickable
      aria-label="Bets"
      :context-menu="contextMenu"
      :header-menu="({ items }) => [{ name: 'copy-column', label: 'Copy column values' }, { separator: true }, ...items]"
      @row-click="onRowClick"
      @cell-action="onAction"
      @context-action="onContextAction"
      @header-action="onHeaderAction"
    />
    <div class="pg-log" data-testid="log">{{ log }}</div>
  </section>
</template>
