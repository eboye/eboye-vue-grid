import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import {
  createColumnHelper,
  sortingFeature,
  type CellActionEvent,
  type ColumnDef,
  type Tone,
} from '@nocopypaste/vue-grid'
import { Grid as VGrid } from './support'

/**
 * Data where every cell is an object with its own look, as grids such as RevoGrid often get it
 * (`{ value, tone, tooltip, copy }` per cell). One small helper maps it onto the text renderer's
 * per-row options, so the rows stay as the API sends them. The same helper is in
 * `docs/migrating-from-revogrid.md`.
 */
const meta = { title: 'Recipes/Cell objects' } satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** One cell as the API sends it. */
interface CellObject {
  value: string | number | null
  /** Background colour of the cell text (`toneMode: 'fill'`). */
  tone?: Tone
  /** A tooltip, or several lines. */
  tooltip?: string | string[]
  /** A copy button: `true` copies the value, a string copies that. */
  copy?: boolean | string
}

interface Row {
  id: number
  player: CellObject
  status: CellObject
  ticket: CellObject
}

/** A column for a `CellObject` field: value, colour, tooltip and copy button from the cell itself. */
function objectCell<T extends Record<K, CellObject | undefined>, K extends keyof T & string>(
  key: K,
  def: Omit<ColumnDef<T>, 'key'> = {},
): ColumnDef<T> {
  const cell = (row: T) => row[key] as CellObject | undefined
  return {
    key,
    ...def,
    value: (row) => cell(row)?.value,
    rendererOptions: {
      tone: (_v: unknown, row: T) => cell(row)?.tone,
      toneMode: 'fill',
      tooltip: (_v: unknown, row: T) => cell(row)?.tooltip,
      copyable: (_v: unknown, row: T) => !!cell(row)?.copy,
      copyValue: (_v: unknown, row: T) => {
        const c = cell(row)
        return typeof c?.copy === 'string' ? c.copy : String(c?.value ?? '')
      },
      ...(def.rendererOptions as object),
    },
  }
}

const rows: Row[] = [
  {
    id: 1,
    player: { value: 'Ana Petrović', tooltip: ['VIP since 2024', 'Limit 5,000'] },
    status: { value: 'Won', tone: 'success' },
    ticket: { value: 'TK-000481', copy: true },
  },
  {
    id: 2,
    player: { value: 'Marko Ilić' },
    status: { value: 'Lost', tone: 'danger', tooltip: 'Settled 10:42' },
    ticket: { value: 'TK-000482', copy: 'https://example.com/tickets/482' },
  },
  {
    id: 3,
    player: { value: 'Jelena Kovač', tooltip: 'New player' },
    status: { value: 'Open' },
    ticket: { value: 'TK-000483' },
  },
]

const col = createColumnHelper<Row>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content' }),
  objectCell<Row, 'player'>('player', { header: 'Player', sortable: true }),
  objectCell<Row, 'status'>('status', { header: 'Status' }),
  objectCell<Row, 'ticket'>('ticket', { header: 'Ticket' }),
]

export const FromCellObjects: Story = {
  name: 'From cell objects',
  render: () => ({
    components: { VGrid },
    setup() {
      const log = ref('Use a copy button.')
      const onCellAction = (e: CellActionEvent<Row>) =>
        (log.value = `cell-action ${e.name} #${e.rowKey} ${JSON.stringify(e.payload ?? null)}`)
      return { rows, columns, log, onCellAction, features: [sortingFeature] }
    },
    template: `<div class="sb-frame">
      <VGrid :rows="rows" :columns="columns" row-key="id" sort-mode="client" :features="features" aria-label="Cell objects" @cell-action="onCellAction" />
      <p data-testid="log">{{ log }}</p>
    </div>`,
  }),
}
