import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { DataSource, GroupPath, RowKey } from '@nocopypaste/vue-grid'
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

/**
 * The label in a narrow first column: `#` is a fixed `7rem` and the next column has an aggregate,
 * so the label can't run across empty cells. The column name gives way first, then the value
 * ellipsizes; the count always shows, and the whole label is the cell's tooltip.
 */
export const NarrowFirstColumn: Story = {
  args: {
    columns: [
      { ...groupColumns.find((c) => c.key === 'id')!, width: '7rem' },
      groupColumns.find((c) => c.key === 'stake')!,
      ...groupColumns.filter((c) => c.key !== 'id' && c.key !== 'stake'),
    ],
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, groupBy: ref<string[]>(['city']) }),
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

/** A fake backend that groups on the server: 2,000 bets, ~300 ms per request, with a request log. */
function groupingServer() {
  const db = makeBets(2000, 12)
  const log = ref<string[]>([])
  const valueOf = (b: Bet, key: string): unknown =>
    key === 'city' ? b.player.city : (b as unknown as Record<string, unknown>)[key]
  const source: DataSource<Bet> = async (query) => {
    await new Promise((r) => setTimeout(r, 300))
    let rows = db
    for (const p of query.groupPath ?? []) rows = rows.filter((b) => valueOf(b, p.key) === p.value)
    const level = (query.groupPath ?? []).length
    const path = (query.groupPath ?? []).map((p) => String(p.value)).join(' › ') || 'top'
    if (!query.groupBy || level === query.groupBy.length) {
      log.value = [`rows of ${path}: ${rows.length}`, ...log.value].slice(0, 6)
      return { rows, total: rows.length }
    }
    const key = query.groupBy[level]!
    const values = [...new Set(rows.map((b) => String(valueOf(b, key))))].sort()
    const groups = values.map((value) => {
      const inGroup = rows.filter((b) => String(valueOf(b, key)) === value)
      return {
        value,
        count: inGroup.length,
        aggregates: { stake: Math.round(inGroup.reduce((n, b) => n + b.stake, 0) * 100) / 100 },
      }
    })
    log.value = [`groups in ${path}: ${groups.length}`, ...log.value].slice(0, 6)
    return { groups, total: groups.length, rowTotal: rows.length }
  }
  return { source, log }
}

/**
 * **Server-side grouping**: with a `data-source`, the query carries `groupBy` and `groupPath`, and the
 * server answers with groups (value, count, aggregates) instead of rows. Each group's contents load
 * when it expands: its sub-groups, or its rows at the last level. A group's checkbox selects it by
 * query (`v-model:selected-groups`), without loading its rows.
 */
export const ServerSide: Story = {
  args: { rows: undefined, selectable: true, statusBar: true },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const api = groupingServer()
      return {
        args,
        api,
        groupBy: ref<string[]>(['status', 'city']),
        selected: ref<RowKey[]>([]),
        selectedGroups: ref<GroupPath[]>([]),
      }
    },
    template: `
      <div class="sb-frame">
        <p class="sb-note" data-testid="selection">selected = [{{ selected.join(', ') }}] · selected-groups = {{ JSON.stringify(selectedGroups) }}</p>
        <VGrid v-bind="args" :data-source="api.source" v-model:group-by="groupBy" v-model:selected="selected" v-model:selected-groups="selectedGroups" />
        <ol class="sb-log" data-testid="requests"><li v-for="(line, i) in api.log.value" :key="i">{{ line }}</li></ol>
      </div>`,
  }),
}

/** Server-side groups in a virtual window: a big group's rows render only where you look. */
export const ServerSideVirtual: Story = {
  args: { rows: undefined, virtual: { rowHeight: 40 }, statusBar: true },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, api: groupingServer(), groupBy: ref<string[]>(['city']) }),
    template: `
      <div class="sb-frame" style="height: 480px">
        <VGrid v-bind="args" :data-source="api.source" v-model:group-by="groupBy" style="height: 100%" />
      </div>`,
  }),
}
