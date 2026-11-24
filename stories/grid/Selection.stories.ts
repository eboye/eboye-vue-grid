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

/**
 * Batch actions: the `#toolbar` slot gets `selected`, `selectedCount` and `clearSelection`, so the
 * bar sits in the grid. Shift-click (or Shift+Space) selects a range. Deleting rows with
 * `prune-selection` drops their keys from the selection by itself.
 */
export const BatchActions: Story = {
  args: { pruneSelection: true, sortMode: 'client' },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const rows = ref<Bet[]>(makeBets(40, 4))
      const selected = ref<RowKey[]>([])
      const remove = (keys: readonly RowKey[]) => (rows.value = rows.value.filter((r) => !keys.includes(r.id)))
      return { args, rows, selected, remove }
    },
    template: `
      <p class="sb-note" data-testid="selected">selected = [{{ selected.join(', ') }}]</p>
      <div class="sb-frame">
        <VGrid v-bind="args" :rows="rows" v-model:selected="selected">
          <template #toolbar="{ selected: keys, selectedCount, clearSelection }">
            <span v-if="selectedCount" data-testid="bar" style="display: flex; gap: 0.5rem; align-items: center; margin-inline-end: auto">
              <strong>{{ selectedCount }} selected</strong>
              <button type="button" class="vg-button" data-testid="delete" @click="remove(keys)">Delete</button>
              <button type="button" class="vg-button vg-button-ghost" @click="clearSelection()">Clear</button>
            </span>
            <span v-else style="margin-inline-end: auto">Tick a row, then shift-click another to select the rows between.</span>
          </template>
        </VGrid>
      </div>`,
  }),
}

/**
 * Server data: ticking the header selects the loaded page; the banner then offers every row that
 * matches the query (`v-model:select-all-matching`). Act on the query then, not on `selected`.
 */
export const SelectAllMatching: Story = {
  args: { rows: undefined, pagination: true, pageSize: 10 },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const db = makeBets(240, 8)
      const dataSource = async (q: { page: number; pageSize: number | null; filters: { search: string } }) => {
        await new Promise((r) => setTimeout(r, 150))
        const term = q.filters.search?.toLowerCase() ?? ''
        const rows = term ? db.filter((b) => b.player.name.toLowerCase().includes(term)) : db
        const size = q.pageSize ?? rows.length
        return { rows: rows.slice((q.page - 1) * size, q.page * size), total: rows.length }
      }
      return { args, dataSource, selected: ref<RowKey[]>([]), all: ref(false) }
    },
    template: `
      <p class="sb-note" data-testid="state">selected = [{{ selected.join(', ') }}] · all matching = {{ all }}</p>
      <div class="sb-frame">
        <VGrid v-bind="args" :data-source="dataSource" v-model:selected="selected" v-model:select-all-matching="all">
          <template #toolbar="{ selectedCount }"><span data-testid="count">{{ selectedCount }} selected</span></template>
        </VGrid>
      </div>`,
  }),
}
