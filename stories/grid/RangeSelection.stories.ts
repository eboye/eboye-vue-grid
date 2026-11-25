import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import type { CellRange, CopyEvent } from '@nocopypaste/vue-grid'
import { betColumns, makeBets } from '../data'
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
