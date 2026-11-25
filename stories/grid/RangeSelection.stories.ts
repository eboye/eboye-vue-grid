import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, ref } from 'vue'
import { fn } from 'storybook/test'
import {
  setCellValue,
  type CellEditEvent,
  type CellRange,
  type CellsPasteEvent,
  type CopyEvent,
} from '@nocopypaste/vue-grid'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

/**
 * Cell-range selection (`rangeSelectionFeature`, `range-selection`): drag across cells or
 * Shift+click to select a block; Shift+arrows extend it from a focused cell, Ctrl/⌘+A selects every
 * cell, Esc clears it. Ctrl/⌘+C copies it as tab-separated text (pastes into a spreadsheet), and
 * the status bar shows how many cells and the sum and average of their numbers.
 * `v-model:range` holds the corners (`{ start, end }`, by row key and column key).
 */
const meta = {
  title: 'Grid/Range selection',
  component: VGrid,
  args: {
    rows: makeBets(40, 7),
    columns: betColumns({ sortable: true }),
    rowKey: 'id',
    ariaLabel: 'Bets',
    sortMode: 'client',
    rangeSelection: true,
    statusBar: true,
    onCopy: fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
  render: (args) => ({
    components: { VGrid },
    setup() {
      const range = ref<CellRange | null>(null)
      const copied = ref('')
      const onCopy = (e: CopyEvent) => (copied.value = e.text)
      return { args, range, copied, onCopy }
    },
    template: `
      <p class="sb-note" data-testid="range">range: {{ range ? JSON.stringify(range) : 'none' }}</p>
      <div class="sb-frame">
        <VGrid v-bind="args" v-model:range="range" @copy="onCopy" />
      </div>
      <pre class="sb-note" data-testid="copied">{{ copied }}</pre>`,
  }),
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

export const RangeSelection: Story = {}

/** With row selection too: checkboxes select rows, dragging across cells selects a range. */
export const WithRowSelection: Story = {
  args: { selectable: true, statusBar: { summary: ['stake'] } },
}

/**
 * Pasting (with `editingFeature`): Ctrl/⌘+V writes tab-separated text, as spreadsheets copy it,
 * into the `editable` cells from the selected range's top-left cell; one value fills the whole
 * range. Each changed cell is a `cell-edit` (and a `save-cell`); `cells-paste` reports the lot,
 * with the cells it left alone. Copy the sample below (or cells of the grid) and paste it.
 * Ctrl/⌘+Z undoes a whole paste (or an edit), Ctrl+Y / Ctrl/⌘+Shift+Z redoes it; the toolbar's
 * buttons use `undo` / `redo` / `canUndo` / `canRedo` from the `#toolbar` slot.
 */
export const PasteIntoARange: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const rows = reactive(makeBets(30, 7))
      const editable = new Set(['player', 'city', 'status', 'stake', 'placedAt'])
      const columns = betColumns().map((c) =>
        editable.has(c.key)
          ? {
              ...c,
              editable: true,
              ...(c.key === 'status'
                ? { editorOptions: { options: ['Open', 'Won', 'Lost', 'Void'] } }
                : {}),
            }
          : c,
      )
      const sample = 'Jovana Test\tNovi Sad\tWon\t1,234.50\nMarko Test\tNiš\tlost\t€99'
      const report = ref('none yet')
      const onEdit = (e: CellEditEvent<Bet>) => setCellValue(e.row, e.column, e.value)
      const onPaste = (e: CellsPasteEvent<Bet>) =>
        (report.value = `${e.edits.length} changed, ${e.skipped.length} skipped${
          e.skipped.length
            ? ` (${e.skipped.map((s) => `${s.columnKey} #${String(s.rowKey)}: ${s.reason}`).join(', ')})`
            : ''
        }`)
      return { args, rows, columns, sample, report, onEdit, onPaste }
    },
    template: `
      <label class="sb-note">Sample to copy
        <textarea data-testid="sample" rows="2" cols="60" :value="sample"></textarea>
      </label>
      <p class="sb-note" data-testid="paste-report">last paste: {{ report }}</p>
      <div class="sb-frame">
        <VGrid v-bind="args" :rows="rows" :columns="columns" @cell-edit="onEdit" @cells-paste="onPaste">
          <template #toolbar="{ undo, redo, canUndo, canRedo }">
            <button type="button" :disabled="!canUndo" @click="undo()">Undo</button>
            <button type="button" :disabled="!canRedo" @click="redo()">Redo</button>
          </template>
        </VGrid>
      </div>`,
  }),
}
