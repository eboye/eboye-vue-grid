import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { betColumns, makeBets } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const rows = makeBets(25)

/**
 * `<VGrid>` renders plain row objects with a list of column definitions. Use the Controls panel to try
 * the main props; events are logged in the Actions panel.
 */
const meta = {
  title: 'Grid/Basics',
  component: VGrid,
  args: {
    rows,
    columns: betColumns({ sortable: true }),
    rowKey: 'id',
    sortMode: 'client',
    density: 'cozy',
    loading: false,
    rowClickable: true,
    emptyText: 'No data to show.',
    ariaLabel: 'Bets',
    onRowClick: fn(),
    onCellClick: fn(),
    onCellAction: fn(),
    'onUpdate:sort': fn(),
  },
  argTypes: {
    density: { control: 'inline-radio', options: ['compact', 'cozy', 'comfortable'] },
    sortMode: { control: 'inline-radio', options: ['client', 'controlled'] },
    selectable: { control: 'inline-radio', options: [false, true, 'single'] },
    rows: { control: false },
    columns: { control: false },
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<div class="sb-frame"><VGrid v-bind="args" /></div>',
  }),
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Toggle props in the Controls panel. */
export const Playground: Story = {}

export const Compact: Story = { args: { density: 'compact' } }

export const Comfortable: Story = { args: { density: 'comfortable' } }

/** `loading` with no rows shows the `#loading` slot (default “Loading…”). */
export const LoadingEmpty: Story = { args: { rows: [], loading: true } }

/** With rows, `loading` only shows the progress bar; the rows stay visible while you refetch. */
export const LoadingWithRows: Story = { args: { loading: true } }

export const Empty: Story = { args: { rows: [], emptyText: 'No bets yet.' } }

/** Highlight rows by key and add classes per row. */
export const HighlightedRows: Story = {
  args: { highlightedRows: [2, 5, 9] },
}

/** Grows with its content when not given a height. */
export const AutoHeight: Story = {
  args: { rows: makeBets(5) },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<VGrid v-bind="args" />',
  }),
}
