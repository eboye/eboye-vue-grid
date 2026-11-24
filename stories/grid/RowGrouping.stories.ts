import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

/**
 * Columns for grouping: city and status can be grouped from the header menu (`groupable`), and the
 * money columns carry aggregates, which every group row shows for its own rows.
 */
const groupColumns = betColumns({ sortable: true }).map((c) =>
  c.key === 'city' || c.key === 'status'
    ? { ...c, groupable: true }
    : c.key === 'stake'
      ? { ...c, aggregate: 'sum' as const }
      : c.key === 'change'
        ? { ...c, aggregate: 'avg' as const }
        : c.key === 'placedAt'
          ? {
              ...c,
              aggregate: 'max' as const,
              groupable: true,
              groupValue: (b: Bet) => String(b.placedAt).slice(0, 7),
            }
          : c,
)

/**
 * Row grouping (row grouping feature): `v-model:group-by` groups the rows by one or more columns
 * into collapsible group rows with the value, the row count and the columns' aggregates. Groups
 * follow the filters and the sort; right-click a City, Status or Placed header to group by it.
 */
const meta = {
  title: 'Grid/Row grouping',
  component: VGrid,
  args: {
    rows: makeBets(120, 5),
    columns: groupColumns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    sortMode: 'client',
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

const template = `
  <div class="sb-frame">
    <p class="sb-note">
      Grouped by: <strong>{{ groupBy.length ? groupBy.join(' › ') : 'nothing' }}</strong>
      <button v-if="groupBy.length" type="button" class="vg-button vg-button-ghost" @click="groupBy = []">Ungroup</button>
    </p>
    <VGrid v-bind="args" v-model:group-by="groupBy" />
  </div>`

/** One level: a group per status, collapsed. Click a group row (or its arrow) to open it. */
export const ByStatus: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, groupBy: ref<string[]>(['status']) }),
    template,
  }),
}

/** Two levels — status, then city — all open (`groups-expanded`), with group checkboxes and a totals row. */
export const Nested: Story = {
  args: { groupsExpanded: true, selectable: true, totals: true },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, groupBy: ref<string[]>(['status', 'city']) }),
    template,
  }),
}

/** `groupValue` groups by something derived from the row: here the month a bet was placed. */
export const ByMonth: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, groupBy: ref<string[]>(['placedAt']) }),
    template,
  }),
}

/** 10,000 rows grouped by city in a virtual window: only the rows in view render, groups included. */
export const Virtual: Story = {
  args: { rows: makeBets(10_000, 3), virtual: { rowHeight: 40 }, groupsExpanded: true },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, groupBy: ref<string[]>(['city']) }),
    template,
  }),
}
