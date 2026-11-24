import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import { fn } from 'storybook/test'
import { createColumnHelper, sortRows, type SortState } from '@nocopypaste/vue-grid'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const rows = makeBets(25)

/**
 * Mark columns `sortable`. Clicking a header (or Enter on a focused header, or the header menu) cycles
 * ascending → descending → none. Bind `v-model:sort` to read or set the state.
 */
const meta = {
  title: 'Grid/Sorting',
  component: VGrid,
  args: {
    rows,
    columns: betColumns({ sortable: true }),
    rowKey: 'id',
    ariaLabel: 'Bets',
    'onUpdate:sort': fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * `sort-mode="client"`: the grid sorts the rows itself. Numeric and date renderers sort by value,
 * nulls always go last, and sub-rows are sorted within their level.
 */
export const ClientSide: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, sort: ref<SortState | null>({ key: 'stake', dir: 'desc' }) }),
    template: `
      <p class="sb-note">sort = {{ JSON.stringify(sort) }}</p>
      <div class="sb-frame"><VGrid v-bind="args" v-model:sort="sort" sort-mode="client" /></div>`,
  }),
}

const bet = createColumnHelper<Bet>()

/** `sortValue` sorts by a derived value; `sortFn` takes over the comparison completely. */
export const CustomSortValues: Story = {
  args: {
    columns: [
      bet({ key: 'id', header: '#', width: 'min-content', sortable: true }),
      bet({
        key: 'status',
        header: 'Status (Open → Won → Lost → Void)',
        renderer: 'status',
        sortable: true,
        sortValue: (row) => ['Open', 'Won', 'Lost', 'Void'].indexOf(row.status),
      }),
      bet({
        key: 'player',
        header: 'Player (by surname)',
        field: 'player.name',
        sortable: true,
        sortFn: (a, b) =>
          a.player.name.split(' ')[1]!.localeCompare(b.player.name.split(' ')[1]!, 'sr'),
      }),
    ],
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, sort: ref<SortState | null>(null) }),
    template:
      '<div class="sb-frame"><VGrid v-bind="args" v-model:sort="sort" sort-mode="client" /></div>',
  }),
}

/**
 * `sort-mode="controlled"` (the default): the grid only updates `sort`; you load sorted rows, e.g.
 * from a server. Here a fake 300 ms request sorts the data.
 */
export const ServerSide: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const sort = ref<SortState | null>(null)
      const data = ref<Bet[]>(rows)
      const loading = ref(false)
      watch(sort, (s) => {
        loading.value = true
        setTimeout(() => {
          data.value = s
            ? sortRows(rows, s.dir, (r) =>
                s.key === 'player' ? r.player.name : r[s.key as keyof Bet],
              )
            : rows
          loading.value = false
        }, 300)
      })
      return { args, sort, data, loading }
    },
    template: `
      <p class="sb-note">sort = {{ JSON.stringify(sort) }}</p>
      <div class="sb-frame"><VGrid v-bind="args" v-model:sort="sort" :rows="data" :loading="loading" /></div>`,
  }),
}

/**
 * `multi-sort`: Shift-click (or Shift+Enter on a focused header) adds a column as the next sort key;
 * Shift-click again turns it descending, then removes it. A plain click sorts by that column alone.
 * `v-model:sorts` holds every key; numbers in the headers show their order. Right-click a header for
 * Then sort ascending / descending.
 */
export const MultiColumn: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({
      args,
      sorts: ref<SortState[]>([
        { key: 'city', dir: 'asc' },
        { key: 'stake', dir: 'desc' },
      ]),
    }),
    template: `
      <p class="sb-note" data-testid="sorts">sorts = {{ JSON.stringify(sorts) }}</p>
      <div class="sb-frame"><VGrid v-bind="args" v-model:sorts="sorts" sort-mode="client" multi-sort /></div>`,
  }),
}
