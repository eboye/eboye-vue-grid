import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { createColumnHelper } from '@nocopypaste/vue-grid'
import { makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const bet = createColumnHelper<Bet>()

/**
 * `#cell-<key>` replaces a column's renderer, `#header-<key>` its header. Good for one-offs; write a
 * renderer for anything you reuse.
 */
const meta = {
  title: 'Grid/Slots & events',
  component: VGrid,
  args: {
    rows: makeBets(8),
    columns: [
      bet({ key: 'id', header: '#', width: 'min-content' }),
      bet({ key: 'player', header: 'Player', width: '1fr' }),
      bet({ key: 'stake', header: 'Stake', renderer: 'currency', clickable: true }),
      bet({ key: 'status', header: 'Status', renderer: 'status' }),
    ],
    rowKey: 'id',
    rowClickable: true,
    ariaLabel: 'Bets',
    onRowClick: fn(),
    onCellClick: fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The Player cell and the Stake header are slots. Clicking a row logs `row-click`; the Stake column is
 * `clickable`, so it logs `cell-click` instead (see Actions).
 */
export const CellAndHeaderSlots: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: `
      <VGrid v-bind="args">
        <template #cell-player="{ row }">
          <strong>{{ row.player.name }}</strong>
          <div style="font-size: 0.8em; opacity: 0.7">{{ row.player.city }}</div>
        </template>
        <template #header-stake="{ column }">
          {{ column.header }} <abbr title="Click a stake cell">ⓘ</abbr>
        </template>
      </VGrid>`,
  }),
}

/** `#empty` and `#loading` replace the default texts. */
export const EmptyAndLoadingSlots: Story = {
  args: { rows: [] },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: `
      <div class="sb-stack">
        <VGrid v-bind="args" aria-label="Empty">
          <template #empty>🗂️ Nothing here yet — <a href="#">create a bet</a>.</template>
        </VGrid>
        <VGrid v-bind="args" loading aria-label="Loading">
          <template #loading>⏳ Fetching bets…</template>
        </VGrid>
      </div>`,
  }),
}
