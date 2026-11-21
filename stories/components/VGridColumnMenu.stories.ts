import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import { VGridColumnMenu, type ColumnDef, type ColumnState } from '@eboye/vue-grid'

const columns: ColumnDef[] = [
  { key: 'id', header: '#', hideable: false },
  { key: 'player', header: 'Player' },
  { key: 'city', header: 'City' },
  { key: 'status', header: 'Status' },
  { key: 'stake', header: 'Stake' },
  { key: 'payout', header: 'Payout', hidden: true },
  { key: 'placedAt', header: 'Placed' },
]

/**
 * Column picker: show / hide (with filter) and reorder columns, reset to the defaults. Usually placed in
 * the grid's `#toolbar` slot (see Grid / Columns); here it's bound to a plain `ColumnState`.
 */
const meta = {
  title: 'Components/VGridColumnMenu',
  component: VGridColumnMenu,
  args: {
    columns,
    label: 'Columns',
    filterPlaceholder: 'Filter columns…',
    resetLabel: 'Reset columns',
    'onUpdate:columnState': fn(),
  },
  argTypes: { columns: { control: false } },
  render: (args) => ({
    components: { VGridColumnMenu },
    setup: () => ({ args, state: ref<ColumnState | undefined>(undefined) }),
    template: `
      <VGridColumnMenu v-bind="args" v-model:column-state="state" />
      <pre class="sb-note">{{ state ? JSON.stringify(state, null, 2) : 'columnState: undefined (defaults)' }}</pre>`,
  }),
} satisfies Meta<typeof VGridColumnMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Localised: Story = {
  args: {
    label: 'Kolone',
    filterPlaceholder: 'Pretraži kolone…',
    resetLabel: 'Vrati podrazumevano',
  },
}
