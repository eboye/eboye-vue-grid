import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import type { CopyEvent, VGridExposed } from '@nocopypaste/vue-grid'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

/** Bet columns with an actions-style column left out of exports, and the stake summed. */
const exportColumns = [
  ...betColumns({ sortable: true }).map((c) =>
    c.key === 'stake'
      ? { ...c, aggregate: 'sum' as const, filterable: true }
      : { ...c, filterable: true },
  ),
  { key: 'note', header: '', width: 'min-content', exportable: false, value: () => '⋯' },
]

/**
 * CSV and Excel export and copying (export feature). `grid.exportCsv()` / `grid.exportXlsx()` download
 * the filtered, sorted rows;
 * `grid.copyRows()` and Ctrl/⌘+C copy the selected rows as tab-separated text (paste them into a
 * spreadsheet), or the focused cell when no row is selected, as the cells show them.
 */
const meta = {
  title: 'Grid/Export & copy',
  component: VGrid,
  args: {
    rows: makeBets(40, 9),
    columns: exportColumns,
    rowKey: 'id',
    ariaLabel: 'Bets',
    sortMode: 'client',
    selectable: true,
    totals: true,
    filterRow: true,
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

export const ExportAndCopy: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const grid = ref<VGridExposed>()
      const selected = ref<number[]>([])
      const copied = ref('')
      const preview = ref('')
      const onCopy = (e: CopyEvent<Bet>) =>
        (copied.value = `${e.kind === 'cell' ? 'Cell' : `${e.rows.length} rows`}: ${e.text}`)
      return { args, grid, selected, copied, preview, onCopy }
    },
    template: `
      <div class="sb-frame">
        <div class="sb-note">
          <button type="button" class="vg-button" data-test="download" @click="grid?.exportCsv({ filename: 'bets.csv', totals: true })">Download CSV</button>
          <button type="button" class="vg-button" data-test="download-xlsx" @click="grid?.exportXlsx({ filename: 'bets.xlsx', totals: true, sheetName: 'Bets' })">Download Excel</button>
          <button type="button" class="vg-button" data-test="copy" :disabled="!selected.length" @click="grid?.copyRows()">Copy {{ selected.length }} selected</button>
          <button type="button" class="vg-button vg-button-ghost" data-test="preview" @click="preview = grid?.getCsv({ values: 'formatted' }) ?? ''">Preview (formatted)</button>
          <span data-test="copied">{{ copied }}</span>
        </div>
        <VGrid ref="grid" v-bind="args" v-model:selected="selected" @copy="onCopy" />
        <pre v-if="preview" data-test="csv" style="max-height: 8rem; overflow: auto; font-size: 0.75rem">{{ preview }}</pre>
      </div>`,
  }),
}
