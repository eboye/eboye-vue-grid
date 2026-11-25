import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { GridMessages, RowKey } from '@nocopypaste/vue-grid'
import { de } from '@nocopypaste/vue-grid/locales/de'
import { en } from '@nocopypaste/vue-grid/locales/en'
import { es } from '@nocopypaste/vue-grid/locales/es'
import { fr } from '@nocopypaste/vue-grid/locales/fr'
import { sr } from '@nocopypaste/vue-grid/locales/sr'
import { srLatn } from '@nocopypaste/vue-grid/locales/sr-Latn'
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

const packs = { en, de, fr, es, sr, srLatn }

/**
 * Ready-made language packs: `import { de } from '@nocopypaste/vue-grid/locales/de'`, then
 * `:messages="de"` (or `createVueGrid({ messages: de })`). Each pack is bundled only when imported;
 * spread it to change a few texts (`{ ...de, total: 'Gesamt' }`). Counts use the language's plural
 * rules (Serbian: 1 red, 2 reda, 5 redova).
 */
export const LanguagePacks: Story = {
  args: { statusBar: { summary: ['stake'] } },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({
      args,
      packs,
      language: ref<keyof typeof packs>('de'),
      selected: ref<RowKey[]>([2]),
    }),
    template: `
      <label class="sb-note">Language
        <select v-model="language" data-testid="language">
          <option v-for="(_, name) in packs" :key="name" :value="name">{{ name }}</option>
        </select>
      </label>
      <div class="sb-frame">
        <VGrid v-bind="args" v-model:selected="selected" :messages="packs[language]" />
      </div>`,
  }),
}

/**
 * `row-attrs` and `cell-attrs` add your own attributes to each data row and cell, such as test
 * hooks: here `data-test="row-<position>"` on rows and `data-test="<column>-<position>"` on cells,
 * with positions as shown (sorted, 0-based) and counted over all 2,000 virtual rows, not just the
 * drawn ones. Inspect a cell to see them.
 */
export const TestHooks: Story = {
  args: {
    rows: makeBets(2000, 14),
    virtual: { rowHeight: 41 },
    pagination: undefined,
    pageSize: undefined,
    filterRow: false,
    totals: false,
    rowAttrs: ({ rowIndex }: { rowIndex: number }) => ({ 'data-test': `row-${rowIndex}` }),
    cellAttrs: ({ columnKey, rowIndex }: { columnKey: string; rowIndex: number }) => ({
      'data-test': `${columnKey}-${rowIndex}`,
    }),
  },
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
