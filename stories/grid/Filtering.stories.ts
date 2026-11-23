import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { defineComponent, h, ref } from 'vue'
import { fn } from 'storybook/test'
import {
  VGridColumnMenu,
  VGridSearch,
  booleanRenderer,
  createColumnHelper,
  currencyRenderer,
  dateRenderer,
  statusRenderer,
  type ColumnFilter,
  type FilterComponentProps,
  type FilterState,
} from '@nocopypaste/vue-grid'
import { makeBets, makeMarkets, marketColumns, statusTones, type Bet, type Market } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const bet = createColumnHelper<Bet>()
const columns = [
  bet({ key: 'id', header: '#', width: 'min-content' }),
  bet({ key: 'player', header: 'Player', field: 'player.name', width: 'minmax(10rem, 1fr)', filterable: true, sortable: true }),
  bet({ key: 'city', header: 'City', field: 'player.city', filterable: true, filter: 'set' }),
  bet({ key: 'status', header: 'Status', renderer: statusRenderer, rendererOptions: { tone: statusTones }, filterable: true }),
  bet({ key: 'stake', header: 'Stake', renderer: currencyRenderer, filterable: true, sortable: true }),
  bet({ key: 'placedAt', header: 'Placed', renderer: dateRenderer, filterable: true, sortable: true }),
  bet({ key: 'verified', header: 'KYC', renderer: booleanRenderer, filterable: true }),
]

/**
 * Mark columns `filterable`. The filter type comes from the renderer (currency → number, date → date,
 * boolean → yes/no, status → value list, otherwise text) and can be set with `filter`.
 *
 * - **Funnel** in each filterable header (shown on hover / focus, always when active) opens a popover:
 *   condition + value(s), or a searchable value list with counts.
 * - **Filter row** (`filter-row`): a quick input under each header — `> 100`, `50..200`, `> 2026-03-01`.
 * - **Quick search**: `<VGridSearch>` in the toolbar (accent-insensitive, across visible columns).
 * - Header right-click: *Filter…*, *Clear filter*, *Clear all filters*.
 */
const meta = {
  title: 'Grid/Filtering',
  component: VGrid,
  args: {
    rows: makeBets(60, 13),
    columns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    sortMode: 'client',
    filterRow: true,
    'onUpdate:filters': fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
  render: (args) => ({
    components: { VGrid, VGridSearch },
    setup: () => ({ args, filters: ref<FilterState | null>(null) }),
    template: `
      <div class="sb-frame">
        <VGrid v-bind="args" v-model:filters="filters">
          <template #toolbar="{ activeFilterCount, clearFilters }">
            <VGridSearch />
            <span class="sb-note" data-testid="count">{{ activeFilterCount }} active</span>
            <button class="sb-btn" type="button" :disabled="!activeFilterCount" @click="clearFilters">Clear all</button>
          </template>
        </VGrid>
      </div>
      <pre class="sb-note" data-testid="model">{{ JSON.stringify(filters) }}</pre>`,
  }),
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Funnels, filter row and quick search together. */
export const AllFilters: Story = {}

/** Only the funnel popovers (no filter row). */
export const PopoversOnly: Story = { args: { filterRow: false } }

/**
 * `filter-storage="…"` saves the filter model in localStorage (with the column layout's
 * `storage` if you like) — set a filter and reload the story.
 */
export const Persisted: Story = {
  args: { filterStorage: 'storybook-filters-demo' },
  render: (args) => ({
    components: { VGrid, VGridColumnMenu, VGridSearch },
    setup: () => ({ args }),
    template: `
      <div class="sb-frame">
        <VGrid v-bind="args" storage="storybook-filters-layout">
          <template #toolbar="{ columnState, setColumnState }">
            <VGridSearch />
            <VGridColumnMenu :columns="args.columns" :column-state="columnState" @update:column-state="setColumnState($event)" />
          </template>
        </VGrid>
      </div>`,
  }),
}

// A custom filter: a "high rollers" toggle as the column's own filter UI + predicate.
const HighRollerFilter = defineComponent({
  props: {
    modelValue: { type: Object as () => FilterComponentProps<Bet>['modelValue'], default: undefined },
    column: { type: Object as () => FilterComponentProps<Bet>['column'], required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('label', { class: 'vg-filter-option' }, [
        h('input', {
          type: 'checkbox',
          checked: props.modelValue?.type === 'custom' && props.modelValue.value === true,
          onChange: (e: Event) =>
            emit('update:modelValue', (e.target as HTMLInputElement).checked ? { type: 'custom', value: true } : undefined),
        }),
        ' Only stakes ≥ €300',
      ])
  },
})

/** `filterComponent` + `filterFn`: your own filter UI and matching for a column. */
export const CustomFilter: Story = {
  args: {
    columns: [
      ...columns.slice(0, 4),
      bet({
        key: 'stake',
        header: 'Stake (custom)',
        renderer: currencyRenderer,
        filterable: true,
        filterComponent: HighRollerFilter,
        filterFn: (row, filter: ColumnFilter) => !(filter.type === 'custom' && filter.value === true) || row.stake >= 300,
      }),
    ],
  },
}

/**
 * A value list with a thousand distinct values: the panel renders the first 300 and asks for a search
 * to narrow the rest (“All” still covers every match). Ticking values doesn't recount the rows.
 */
export const ManyValues: Story = {
  args: {
    rows: makeBets(1000, 5),
    filterRow: false,
    columns: [
      bet({ key: 'id', header: '#', width: 'min-content', filterable: true, filter: 'set' }),
      bet({ key: 'player', header: 'Player', field: 'player.name', width: 'minmax(10rem, 1fr)' }),
      bet({ key: 'stake', header: 'Stake', renderer: currencyRenderer }),
    ],
  },
}

const market = createColumnHelper<Market>()

/**
 * Trees: a parent stays visible when one of its children matches (so you can see where the match
 * is); a parent that matches keeps all of its children. Try "Draw" or "Football".
 */
export const SubGrids: Story = {
  args: {
    rows: makeMarkets() as unknown as Bet[],
    columns: [
      market({ ...marketColumns[0]!, filterable: true }),
      ...marketColumns.slice(1).map((c) => ({ ...c, filterable: true })),
    ] as never,
    subRows: (row: { children?: unknown[] }) => row.children,
    expanded: ['fb', 'fb-1x2', 'bb'],
  },
}
