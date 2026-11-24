import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { GridMessages, RowKey } from '@nocopypaste/vue-grid'
import { betColumns, makeBets } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const columns = betColumns({ sortable: true }).map((c) =>
  c.key === 'city' || c.key === 'status'
    ? { ...c, filterable: true, groupable: true }
    : c.key === 'stake'
      ? { ...c, filterable: true, aggregate: 'sum' as const }
      : c,
)

/** Serbian (Latin) text for the grid: set app-wide in `createVueGrid({ messages })`, or per grid. */
const serbian: GridMessages = {
  loading: 'Učitavanje…',
  empty: 'Nema podataka.',
  noMatch: 'Nijedan red ne odgovara filterima.',
  clearFilters: 'Obriši filtere',
  total: 'Ukupno',
  selectAllRows: 'Izaberi sve redove',
  selectRow: 'Izaberi red',
  sortAscending: 'Rastuće',
  sortDescending: 'Opadajuće',
  clearSort: 'Bez sortiranja',
  filterMenu: 'Filter…',
  clearFilter: 'Obriši filter',
  clearAllFilters: 'Obriši sve filtere',
  groupBy: (column) => `Grupiši po: ${column}`,
  ungroup: 'Razgrupiši',
  pinLeft: 'Zakači levo',
  pinRight: 'Zakači desno',
  unpin: 'Otkači',
  moveLeft: 'Pomeri levo',
  moveRight: 'Pomeri desno',
  fitWidth: 'Prilagodi širinu',
  resetWidth: 'Vrati širinu',
  hideColumn: 'Sakrij kolonu',
  resetColumns: 'Vrati kolone',
  filterColumn: (column) => `Filter: ${column}`,
  filterColumnActive: (column) => `Filter: ${column} (uključen)`,
  filterPlaceholder: 'Filtriraj…',
  rowsPerPage: 'Redova po strani',
  pageSize: (size) => `${size} po strani`,
  pageSummary: (from, to, total) => `${from}–${to} od ${total}`,
  firstPage: 'Prva strana',
  previousPage: 'Prethodna strana',
  nextPage: 'Sledeća strana',
  lastPage: 'Poslednja strana',
  page: (page) => `Strana ${page}`,
  rowCount: (shown, total) => (total ? `${shown} od ${total} redova` : `${shown} redova`),
  selectedCount: (count) => `izabrano: ${count}`,
  filterCount: (count) => `filtera: ${count}`,
  clear: 'Obriši',
  sum: 'Zbir',
  average: 'Prosek',
}

/**
 * Everything a feature adds is configurable. **`messages`** replaces the built-in text
 * (translations, wording): app-wide in `createVueGrid({ messages })`, per grid with `:messages`.
 * **`parts`** leaves out pieces a feature adds, and some can be replaced with a slot
 * (`#load-error`, `#no-match`, `#select-all-banner`).
 */
const meta = {
  title: 'Grid/Configuration',
  component: VGrid,
  args: {
    rows: makeBets(60, 14),
    columns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    sortMode: 'client',
    selectable: true,
    filterRow: true,
    totals: true,
    pagination: { pageSizes: [10, 25] },
    pageSize: 10,
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, selected: ref<RowKey[]>([2]) }),
    template: `
      <div class="sb-frame">
        <VGrid v-bind="args" v-model:selected="selected" />
      </div>`,
  }),
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/** `:messages` in Serbian: menus, filters, the pager, the status bar and the totals row. */
export const Translated: Story = {
  args: { messages: serbian, statusBar: { summary: ['stake'] } },
}

/**
 * `:parts` turns pieces off: no filter funnels (the filter row still filters), no resize grips,
 * no dragging headers, no select-all checkbox, no first / last page buttons, and a status bar
 * without the Clear button.
 */
export const PartsOff: Story = {
  args: {
    parts: { filterButtons: false, resizeGrips: false, headerDrag: false, selectAll: false },
    pagination: { pageSizes: [10, 25], firstLast: false },
    statusBar: { clear: false },
  },
}
