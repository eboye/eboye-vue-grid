import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, ref } from 'vue'
import { fn } from 'storybook/test'
import { createColumnHelper, setCellValue, type CellEditEvent } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content' }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1.2fr)',
    editable: true,
    validate: (v) => (String(v ?? '').trim() ? undefined : 'A player needs a name.'),
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    editable: (bet) => bet.status !== 'Void',
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

/**
 * Inline editing (`editingFeature`). Mark columns `editable` (or `(row) => boolean`). Double-click a
 * cell, press Enter or F2 on a focused cell, or just type. Enter saves, Tab saves and edits the next
 * editable cell, Esc cancels. The editor follows the renderer: money → number, date → date picker,
 * boolean → flips at once, status → a select of the values. The grid emits `cell-edit`; your handler
 * changes the data (here `setCellValue`).
 */
const meta = {
  title: 'Grid/Editing',
  component: VGrid,
  args: {
    columns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    onCellEdit: fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

const describe = (e: CellEditEvent<Bet>) =>
  `${e.column.key} of #${e.rowKey}: ${JSON.stringify(e.oldValue)} → ${JSON.stringify(e.value)}`

export const InlineEditing: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const rows = reactive(makeBets(25))
      const last = ref('none yet')
      function onEdit(e: CellEditEvent<Bet>) {
        setCellValue(e.row, e.column, e.value)
        last.value = describe(e) // the Actions panel's `onCellEdit` is bound too (v-bind="args")
      }
      return { args, rows, last, onEdit }
    },
    template: `
      <p class="sb-note" data-testid="last-edit">last edit: {{ last }}</p>
      <div class="sb-frame"><VGrid v-bind="args" :rows="rows" @cell-edit="onEdit" /></div>`,
  }),
}

/**
 * `save-cell` returns a Promise: the cell shows it saving, and a rejection keeps the editor open
 * with the error. Here the "server" takes 400 ms and refuses stakes over 1,000.
 */
export const SavingToAServer: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const rows = reactive(makeBets(25))
      const last = ref('none yet')
      async function saveCell(e: CellEditEvent<Bet>) {
        await new Promise((r) => setTimeout(r, 400))
        if (e.column.key === 'stake' && Number(e.value) > 1000)
          throw new Error('The server refused it: stakes are limited to 1,000.')
        setCellValue(e.row, e.column, e.value)
        last.value = describe(e)
      }
      return { args, rows, last, saveCell }
    },
    template: `
      <p class="sb-note" data-testid="last-edit">last saved: {{ last }}</p>
      <div class="sb-frame"><VGrid v-bind="args" :rows="rows" :save-cell="saveCell" /></div>`,
  }),
}
