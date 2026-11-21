import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref, watch } from 'vue'
import { sortRows, VGridPagination, type SortState } from '@eboye/vue-grid'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const all = makeBets(137, 5)

/** Two ways to show many rows: pages, or a virtual window over all of them. */
const meta = {
  title: 'Grid/Large data',
  component: VGrid,
  args: { rows: all, columns: betColumns({ sortable: true }), rowKey: 'id', ariaLabel: 'Bets' },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * `VGridPagination` next to a controlled grid: the page sorts and slices the rows (as a server would)
 * whenever page, page size or sort change.
 */
export const Pagination: Story = {
  render: (args) => ({
    components: { VGrid, VGridPagination },
    setup() {
      const page = ref(1)
      const pageSize = ref(10)
      const sort = ref<SortState | null>({ key: 'id', dir: 'asc' })
      const loading = ref(false)
      const sorted = computed(() => {
        const s = sort.value
        return s
          ? sortRows(all, s.dir, (r) =>
              s.key === 'player' ? r.player.name : (r as Bet & Record<string, unknown>)[s.key],
            )
          : all
      })
      const pageRows = computed(() =>
        sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
      )
      watch([page, pageSize, sort], () => {
        loading.value = true
        setTimeout(() => (loading.value = false), 250)
      })
      return { args, page, pageSize, sort, loading, pageRows, total: all.length }
    },
    template: `
      <div class="sb-stack">
        <VGrid v-bind="args" v-model:sort="sort" :rows="pageRows" :loading="loading" />
        <VGridPagination v-model:page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 25, 50]" />
      </div>`,
  }),
}

const many = makeBets(10_000, 3)

/**
 * `:virtual="{ rowHeight: 40 }"` renders only the visible rows (plus `overscan`) — here 10,000 rows.
 * Rows must share one height and the grid needs a fixed height.
 */
export const VirtualScrolling: Story = {
  args: { rows: many, virtual: { rowHeight: 40, overscan: 6 }, sortMode: 'client' },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<div class="sb-frame"><VGrid v-bind="args" /></div>',
  }),
}
