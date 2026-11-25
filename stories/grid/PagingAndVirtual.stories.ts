import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref, watch } from 'vue'
import { sortRows, VGridPagination, type SortState } from '@nocopypaste/vue-grid'
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

type TreeBet = Bet & { children?: TreeBet[] }
/** 1,000 bets, each with 10 child bets; every third child has 3 of its own: 14,000 rows. */
function makeBetTree(): TreeBet[] {
  const pool = makeBets(14_000, 9)
  let next = 1000
  const take = (n: number): TreeBet[] => pool.slice(next, (next += n))
  return pool.slice(0, 1000).map((parent) => ({
    ...parent,
    children: take(10).map((child, i) => (i % 3 === 0 ? { ...child, children: take(3) } : child)),
  }))
}
const tree = makeBetTree()

const toolbar = `
  <p class="sb-note">
    <button class="sb-btn" type="button" @click="grid.expandAll()">Expand all</button>
    <button class="sb-btn" type="button" @click="grid.collapseAll()">Collapse all</button>
    <button class="sb-btn" type="button" @click="grid.scrollToRow(13999)">Scroll to the last row</button>
    · <span data-testid="rendered">{{ rendered }}</span> rows in the DOM
    <button class="sb-btn" type="button" @click="count">Count</button>
  </p>`
const withToolbar = () => {
  const grid = ref()
  const rendered = ref(0)
  const count = () => (rendered.value = document.querySelectorAll('#storybook-root .vg-row').length)
  return { grid, rendered, count }
}

/**
 * Virtual scrolling works with sub-grids too: children stay inside their parent's CSS `subgrid`
 * (lined up with its columns), and every level renders only what is in view. *Expand all* opens
 * 14,000 rows; the DOM keeps a screenful.
 */
export const VirtualSubGrids: Story = {
  args: {
    rows: tree,
    virtual: { rowHeight: 40 },
    subRows: (row: TreeBet) => row.children,
    sortMode: 'client',
    selectable: true,
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, ...withToolbar() }),
    template: `${toolbar}<div class="sb-frame"><VGrid ref="grid" v-bind="args" /></div>`,
  }),
}

/** Lazily loaded children in a virtual grid: only rows that scroll into view ask for theirs. */
export const VirtualLazySubGrids: Story = {
  args: {
    rows: many.slice(0, 5000),
    virtual: { rowHeight: 40 },
    loadSubRows: async (row: Bet) => {
      await new Promise((r) => setTimeout(r, 300))
      return makeBets(4, row.id).map((b, i) => ({ ...b, id: row.id * 100_000 + i + 1 }))
    },
    hasSubRows: () => true,
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, ...withToolbar() }),
    template: `${toolbar}<div class="sb-frame"><VGrid ref="grid" v-bind="args" /></div>`,
  }),
}

/**
 * Detail rows in a virtual grid can be any height: they are measured once rendered (until then
 * `virtual.detailHeight` is the estimate), and the scroll position holds while they settle.
 */
export const VirtualDetailRows: Story = {
  args: { rows: many.slice(0, 5000), virtual: { rowHeight: 40, detailHeight: 90 } },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, ...withToolbar() }),
    template: `${toolbar}
      <div class="sb-frame">
        <VGrid ref="grid" v-bind="args">
          <template #detail="{ row }">
            <div class="sb-detail" :data-testid="'detail-' + row.id">
              <p v-for="n in (row.id % 4) + 1" :key="n" style="margin: 0.25rem 0">
                Note {{ n }} for bet #{{ row.id }} — {{ row.player.name }}, {{ row.player.city }}
              </p>
            </div>
          </template>
        </VGrid>
      </div>`,
  }),
}

interface Sheet {
  id: number
  name: string
  [month: string]: number | string
}
/** 120 number columns (M001 … M120) after a name. */
const sheetColumns = [
  { key: 'name', header: 'Name', width: '10rem', pinned: 'left' as const, editable: true },
  ...Array.from({ length: 120 }, (_, i) => ({
    key: `m${i + 1}`,
    header: `M${String(i + 1).padStart(3, '0')}`,
    renderer: 'number' as const,
    width: '7rem',
    sortable: true,
    editable: true,
  })),
]
const sheetRows: Sheet[] = Array.from({ length: 2000 }, (_, r) => {
  const row: Sheet = { id: r + 1, name: `Row ${r + 1}` }
  for (let c = 1; c <= 120; c++) row[`m${c}`] = ((r + 1) * 31 + c * 17) % 1000
  return row
})

/**
 * `virtual-columns` with `virtual`: 2,000 rows × 121 columns, but only the cells in view render
 * (plus a little overscan), with the Name column pinned, row selection, keyboard navigation,
 * editing and cell ranges. Every column keeps its track in the CSS grid; scroll sideways and only
 * the cells change.
 */
export const VirtualColumns: Story = {
  args: {
    rows: sheetRows,
    columns: sheetColumns,
    rowKey: 'id',
    ariaLabel: 'Sheet',
    virtual: { rowHeight: 40 },
    virtualColumns: true,
    sortMode: 'client',
    selectable: true,
    rangeSelection: true,
    statusBar: true,
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template:
      '<div class="sb-frame"><VGrid v-bind="args" @cell-edit="(e) => (e.row[e.column.key] = e.value)" /></div>',
  }),
}

const teams = ['North', 'South', 'East', 'West']
/** 120 months in ten years (column groups), a team to group the rows by, and totals. */
const groupedSheetColumns = [
  { key: 'name', header: 'Name', width: '10rem', pinned: 'left' as const },
  { key: 'team', header: 'Team', width: '7rem', groupable: true },
  ...Array.from({ length: 120 }, (_, i) => ({
    key: `m${i + 1}`,
    header: `M${String(i + 1).padStart(3, '0')}`,
    group: `Year ${Math.floor(i / 12) + 1}`,
    renderer: 'number' as const,
    width: '7rem',
    aggregate: 'sum' as const,
  })),
]
const groupedSheetRows = sheetRows.slice(0, 200).map((r, i) => ({ ...r, team: teams[i % 4]! }))

/**
 * Column virtualization with column groups (the Year header row), row grouping (the group label
 * spans the columns up to the first total) and a totals row.
 */
export const VirtualColumnsGrouped: Story = {
  args: {
    rows: groupedSheetRows,
    columns: groupedSheetColumns,
    rowKey: 'id',
    ariaLabel: 'Sheet by team',
    virtualColumns: true,
    groupBy: ['team'],
    groupsExpanded: true,
    totals: true,
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<div class="sb-frame"><VGrid v-bind="args" /></div>',
  }),
}
