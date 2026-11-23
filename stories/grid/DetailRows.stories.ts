import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createColumnHelper } from '@nocopypaste/vue-grid'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

interface Leg {
  leg: number
  event: string
  odds: number
}

const leg = createColumnHelper<Leg>()
const legColumns = [
  leg({ key: 'leg', header: 'Leg', renderer: 'number', width: 'min-content' }),
  leg({ key: 'event', header: 'Event', width: '1fr' }),
  leg({
    key: 'odds',
    header: 'Odds',
    renderer: 'number',
    rendererOptions: { format: { minimumFractionDigits: 2 } },
  }),
]
const legsFor = (bet: Bet): Leg[] =>
  Array.from({ length: (bet.id % 3) + 1 }, (_, i) => ({
    leg: i + 1,
    event: `Event ${bet.id}.${i + 1}`,
    odds: 1.5 + i * 0.35,
  }))

/**
 * The `#detail` slot renders a full-width panel under an expanded row. It can hold anything —
 * including another grid with a different column set. `row-expandable` picks which rows get one.
 */
const meta = {
  title: 'Grid/Detail rows',
  component: VGrid,
  args: {
    rows: makeBets(8, 3),
    columns: betColumns().slice(0, 5),
    rowKey: 'id',
    rowExpandable: (row: Bet) => row.status !== 'Void',
    expanded: [1],
    ariaLabel: 'Bets with details',
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

export const NestedGrid: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, legsFor, legColumns }),
    template: `
      <VGrid v-bind="args">
        <template #detail="{ row }">
          <VGrid :rows="legsFor(row)" :columns="legColumns" row-key="leg" density="compact" :aria-label="'Legs of bet ' + row.id" />
        </template>
      </VGrid>`,
  }),
}

export const FreeformContent: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: `
      <VGrid v-bind="args">
        <template #detail="{ row }">
          <dl style="display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 0">
            <dt>Channel</dt><dd style="margin: 0">{{ row.meta.channel }}</dd>
            <dt>Link</dt><dd style="margin: 0"><a :href="row.site">{{ row.site }}</a></dd>
          </dl>
        </template>
      </VGrid>`,
  }),
}
