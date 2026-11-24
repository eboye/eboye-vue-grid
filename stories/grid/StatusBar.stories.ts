import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { RowKey } from '@nocopypaste/vue-grid'
import { betColumns, makeBets } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const columns = betColumns({ sortable: true }).map((c) =>
  c.key === 'city' || c.key === 'status' ? { ...c, filterable: true } : c,
)

/**
 * The status bar (status bar feature) under the grid: how many rows pass the filters ("84 of 200
 * rows"), how many are selected, how many filters are on (with Clear), and with
 * `{ summary: ['stake'] }` the sum and average of those columns over the selected rows, formatted
 * like the cells. Filter a column or tick rows to see it change.
 */
const meta = {
  title: 'Grid/Status bar',
  component: VGrid,
  args: {
    rows: makeBets(200, 6),
    columns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    sortMode: 'client',
    selectable: true,
    filterRow: true,
    statusBar: { summary: ['stake'] },
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, selected: ref<RowKey[]>([2, 3, 5]) }),
    template: `
      <div class="sb-frame">
        <VGrid v-bind="args" v-model:selected="selected" />
      </div>`,
  }),
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Counts, the active filters and the stake's sum and average over the selected rows. */
export const WithSummary: Story = {}

/** `status-bar` alone: the counts, no summary. */
export const CountsOnly: Story = { args: { statusBar: true } }

/** `aggregates` picks what each summary column shows: here the smallest and largest stake. */
export const MinAndMax: Story = {
  args: { statusBar: { summary: ['stake', 'change'], aggregates: ['min', 'max'] } },
}

/** The `#status-bar` slot replaces the content; it gets the counts, the summary and `clearFilters`. */
export const CustomContent: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, selected: ref<RowKey[]>([]) }),
    template: `
      <div class="sb-frame">
        <VGrid v-bind="args" v-model:selected="selected">
          <template #status-bar="{ rowCount, selectedCount, summary }">
            <span data-testid="custom">
              {{ rowCount }} bets{{ selectedCount ? ', ' + selectedCount + ' ticked' : '' }}
              <template v-for="col in summary" :key="col.key"> · {{ col.label }} {{ col.items[0].text }}</template>
            </span>
          </template>
        </VGrid>
      </div>`,
  }),
}

/**
 * Server data: the count is the server's `total`. With "Select all N rows" on, the summary hides,
 * since only the loaded page is known.
 */
export const ServerData: Story = {
  args: { rows: undefined, pagination: true, pageSize: 10, filterRow: false },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const db = makeBets(240, 8)
      const dataSource = async (q: { page: number; pageSize: number | null }) => {
        await new Promise((r) => setTimeout(r, 150))
        const size = q.pageSize ?? db.length
        return { rows: db.slice((q.page - 1) * size, q.page * size), total: db.length }
      }
      return { args, dataSource, selected: ref<RowKey[]>([]), all: ref(false) }
    },
    template: `
      <div class="sb-frame">
        <VGrid v-bind="args" :data-source="dataSource" v-model:selected="selected" v-model:select-all-matching="all" />
      </div>`,
  }),
}
