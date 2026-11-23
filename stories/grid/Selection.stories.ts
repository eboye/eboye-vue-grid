import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import type { RowKey } from '@nocopypaste/vue-grid'
import {
  betColumns,
  loadFolder,
  makeBets,
  makeMarkets,
  marketColumns,
  rootFolders,
  type Bet,
  type Folder,
} from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

/**
 * `selectable` adds a checkbox column; `v-model:selected` holds the selected row keys. Space toggles
 * the focused row.
 */
const meta = {
  title: 'Grid/Selection',
  component: VGrid,
  args: {
    rows: makeBets(12),
    columns: betColumns(),
    rowKey: 'id',
    selectable: true,
    ariaLabel: 'Bets',
    'onUpdate:selected': fn(),
  },
  argTypes: {
    rows: { control: false },
    columns: { control: false },
    selectable: { control: 'inline-radio', options: [true, 'single'] },
    selectionMode: { control: 'inline-radio', options: ['cascade', 'independent'] },
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, selected: ref<RowKey[]>([2, 4]) }),
    template: `
      <p class="sb-note">selected = [{{ selected.join(', ') }}]</p>
      <VGrid v-bind="args" v-model:selected="selected" />`,
  }),
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Multiple rows, with a select-all checkbox in the header. */
export const Multiple: Story = {}

/** `selectable="single"`: one row at a time, no select-all. */
export const Single: Story = { args: { selectable: 'single' } }

/** `is-row-selectable` disables the checkbox for some rows (here: Void bets). */
export const SomeRowsLocked: Story = {
  args: { isRowSelectable: (row: Bet) => row.status !== 'Void' },
}

/**
 * With sub-rows, `selection-mode="cascade"` (default) selects children with their parent and shows
 * partly selected parents as indeterminate. Switch to `independent` in Controls.
 */
export const WithSubRows: Story = {
  args: {
    rows: makeMarkets(),
    columns: marketColumns,
    subRows: (row: { children?: unknown[] }) => row.children,
    selectionMode: 'cascade',
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, selected: ref<RowKey[]>([]), expanded: ref<RowKey[]>(['fb', 'fb-1x2']) }),
    template: `
      <p class="sb-note">selected = [{{ selected.join(', ') }}]</p>
      <VGrid v-bind="args" v-model:selected="selected" v-model:expanded="expanded" />`,
  }),
}

/**
 * Cascading selection with lazily loaded children (`load-sub-rows`): tick a collapsed folder, then
 * expand it — its children arrive selected.
 */
export const WithLazySubRows: Story = {
  args: {
    rows: rootFolders as never,
    columns: [{ key: 'name', header: 'Name', width: 'minmax(16rem, 1fr)' }] as never,
    loadSubRows: loadFolder as never,
    hasSubRows: ((row: Folder) => row.hasChildren) as never,
    selectionMode: 'cascade',
    ariaLabel: 'Files',
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, selected: ref<RowKey[]>([]), expanded: ref<RowKey[]>([]) }),
    template: `
      <p class="sb-note" data-testid="selected">selected = [{{ selected.join(', ') }}]</p>
      <VGrid v-bind="args" v-model:selected="selected" v-model:expanded="expanded" />`,
  }),
}
