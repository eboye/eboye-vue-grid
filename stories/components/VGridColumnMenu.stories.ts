import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import {
  VGridColumnMenu,
  type ColumnDef,
  type ColumnState,
  type HeaderActionEvent,
  type HeaderMenuContext,
} from '@nocopypaste/vue-grid'
import { Grid as VGrid } from '../support'

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

/** The same icon-only picker can open from the toolbar or a header menu command. */
export const HeaderCommand: Story = {
  render: () => ({
    components: { VGrid, VGridColumnMenu },
    setup() {
      const picker = ref<InstanceType<typeof VGridColumnMenu>>()
      return {
        picker,
        rows: [{ id: 1, name: 'Cedar', region: 'North' }],
        columns: [
          { key: 'name', header: 'Name', hideable: false },
          { key: 'region', header: 'Region' },
        ],
        headerMenu: ({ items }: HeaderMenuContext) => [
          ...items,
          { name: 'choose-columns', label: 'Choose columns' },
        ],
        onHeaderAction: ({ name }: HeaderActionEvent) => {
          if (name === 'choose-columns') picker.value?.open()
        },
      }
    },
    template: `
      <VGrid :rows="rows" :columns="columns" row-key="id" aria-label="Locations"
        :header-menu="headerMenu" @header-action="onHeaderAction">
        <template #toolbar="{ columnState, setColumnState }">
          <VGridColumnMenu ref="picker" :columns="columns" :column-state="columnState"
            icon-only label="Choose columns" @update:column-state="setColumnState">
            <template #icon>
              <svg viewBox="0 0 16 16" width="16" height="16" data-testid="picker-icon">
                <path d="M2 3h12v10H2zM6 3v10m4-10v10" fill="none" stroke="currentColor" />
              </svg>
            </template>
          </VGridColumnMenu>
        </template>
      </VGrid>`,
  }),
}
