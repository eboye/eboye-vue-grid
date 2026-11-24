import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type {
  CellContext,
  ContextActionEvent,
  MenuItem,
  PinnedRowsState,
} from '@nocopypaste/vue-grid'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

/** Columns with aggregates: the totals row sums the stakes, averages the odds change, counts rows. */
const totalColumns = betColumns({ sortable: true }).map((c) =>
  c.key === 'player'
    ? { ...c, aggregate: 'count' as const }
    : c.key === 'stake'
      ? { ...c, aggregate: 'sum' as const }
      : c.key === 'change'
        ? { ...c, aggregate: 'avg' as const }
        : c.key === 'placedAt'
          ? { ...c, aggregate: 'max' as const }
          : c,
)

/**
 * Rows that stay in view while the body scrolls: a totals row (aggregation feature) and rows
 * pinned above or below the body (row pinning feature). Both sit in sticky `subgrid` sections, so
 * they share the grid's columns, pinned columns and resizing.
 */
const meta = {
  title: 'Grid/Pinned rows & totals',
  component: VGrid,
  args: {
    rows: makeBets(60, 11),
    columns: totalColumns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    sortMode: 'client',
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * `totals` adds a sticky totals row with each column's `aggregate` (`sum`, `avg`, `min`, `max`,
 * `count` or a function) over the rows that pass the filters. `totals="top"` puts it under the
 * header; `totals-label` names it.
 */
export const Totals: Story = {
  args: { totals: true },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<div class="sb-frame"><VGrid v-bind="args" /></div>',
  }),
}

/** Right-click a row to pin it above or below the body (`pinRow()` / `v-model:pinned-rows`). */
export const PinRows: Story = {
  args: { totals: true, selectable: true },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const pinned = ref<PinnedRowsState>({ top: [3], bottom: [] })
      const isPinned = (key: unknown) =>
        pinned.value.top?.includes(key as number) || pinned.value.bottom?.includes(key as number)
      const menu = (ctx: CellContext<Bet>): MenuItem[] =>
        isPinned(ctx.rowKey)
          ? [{ name: 'unpin', label: 'Unpin row' }]
          : [
              { name: 'top', label: 'Pin to top' },
              { name: 'bottom', label: 'Pin to bottom' },
            ]
      const grid = ref<{ pinRow(key: unknown, side: 'top' | 'bottom' | null): void }>()
      const onAction = (event: ContextActionEvent<Bet>) =>
        grid.value?.pinRow(
          event.rowKey,
          event.name === 'unpin' ? null : (event.name as 'top' | 'bottom'),
        )
      return { args, pinned, menu, grid, onAction }
    },
    template: `
      <div class="sb-frame">
        <VGrid ref="grid" v-bind="args" v-model:pinned-rows="pinned" :context-menu="menu" @context-action="onAction" />
      </div>`,
  }),
}

/** Rows that aren't part of the data — a target, last year's figures — with `pinned-top-rows` / `pinned-bottom-rows`. */
export const ExtraRows: Story = {
  args: {
    totals: 'top',
    totalsLabel: 'All bets',
    pinnedBottomRows: [
      {
        id: 'target',
        player: { name: 'Target', city: '' },
        stake: 50000,
        change: 0,
        status: 'open',
        placedAt: '',
      },
    ] as unknown as Bet[],
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<div class="sb-frame"><VGrid v-bind="args" /></div>',
  }),
}

/** 10,000 rows in a virtual window, with a pinned row on top and the totals at the bottom. */
export const VirtualWithTotals: Story = {
  args: {
    rows: makeBets(10_000, 3),
    virtual: { rowHeight: 40 },
    totals: true,
    pinnedRows: { top: [42] },
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<div class="sb-frame"><VGrid v-bind="args" /></div>',
  }),
}
