<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type CellActionEvent,
  type CellContext,
  type ContextActionEvent,
  type HeaderActionEvent,
  type HeaderMenuContext,
  type MenuItem,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(20, 8)
const log = ref('Right-click a cell or a header.')

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr', sortable: true }),
  col({ key: 'city', header: 'City', field: 'player.city', sortable: true, filterable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({
    key: 'site',
    header: 'Link',
    renderer: 'link',
    rendererOptions: { label: () => 'Open', target: '_blank' },
  }),
  col({
    key: 'actions',
    header: '',
    renderer: 'actions-menu',
    width: 'min-content',
    rendererOptions: {
      actions: (row: Bet): MenuItem[] => [
        { name: 'open', label: 'Open bet' },
        { name: 'void', label: 'Void bet', disabled: row.status === 'Void' && 'Already void' },
        {
          // a submenu: hover, click, → / Enter open it; ← / Esc go back
          name: 'status',
          label: 'Set status',
          items: [
            { name: 'status-open', label: 'Open' },
            { name: 'status-won', label: 'Won' },
            { name: 'status-lost', label: 'Lost' },
          ],
        },
        { separator: true },
        { name: 'delete', label: 'Delete', tone: 'danger' },
      ],
    },
  }),
]

// Body cells: your own items. Returning [] keeps the browser's menu (here, on the link).
function contextMenu({ row, column }: CellContext<Bet>): MenuItem[] {
  if (column.key === 'site') return []
  return [
    { name: 'copy', label: `Copy ${column.header || column.key}`, hint: 'Ctrl+C' },
    { name: 'open', label: `Open bet #${row.id}` },
    {
      name: 'copy-as',
      label: 'Copy as',
      items: [
        { name: 'copy-id', label: 'Bet ID' },
        { name: 'copy-player', label: 'Player' },
      ],
    },
    { separator: true },
    { name: 'void', label: 'Void bet', disabled: row.status === 'Void' },
    { name: 'delete', label: 'Delete', tone: 'danger' },
  ]
}

// Headers: the built-in items (sort, filter, pin, move, hide), plus yours.
const headerMenu = ({ items }: HeaderMenuContext<Bet>): MenuItem[] => [
  { name: 'stats', label: 'Column statistics' },
  { separator: true },
  ...items,
]

const onContextAction = (e: ContextActionEvent<Bet>) =>
  (log.value = `context-action “${e.name}” on #${e.rowKey}, column ${e.column.key}`)
const onHeaderAction = (e: HeaderActionEvent<Bet>) =>
  (log.value = `header-action “${e.name}” on column ${e.column.key}`)
const onCellAction = (e: CellActionEvent<Bet>) =>
  (log.value = `cell-action “${e.name}” on #${e.rowKey}`)
</script>

<template>
  <VGrid
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    :context-menu="contextMenu"
    :header-menu="headerMenu"
    aria-label="Bets"
    @context-action="onContextAction"
    @header-action="onHeaderAction"
    @cell-action="onCellAction"
  />
  <p class="demo-log" aria-live="polite">{{ log }}</p>
</template>
