import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import type { CellContext, HeaderMenuContext, MenuItem } from '@nocopypaste/vue-grid'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

function contextMenu({ row, column }: CellContext<Bet>): MenuItem[] {
  if (column.key === 'city') return [] // [] / null → the browser's own menu for this column
  return [
    { name: 'copy', label: `Copy ${column.header ?? column.key}`, hint: 'Ctrl+C' },
    { name: 'open', label: `Open bet #${row.id}` },
    { separator: true },
    { name: 'void', label: 'Void bet', disabled: row.status === 'Void' },
    { name: 'delete', label: 'Delete', tone: 'danger' },
  ]
}

/**
 * Menus use the Popover API and CSS anchor positioning: never clipped by the grid, they flip to stay
 * on screen and close on Esc or an outside click. Arrow keys, Home / End and typeahead move between
 * items. Picked items are logged in the Actions panel.
 */
const meta = {
  title: 'Grid/Context menus',
  component: VGrid,
  args: {
    rows: makeBets(20),
    columns: betColumns({ sortable: true }),
    rowKey: 'id',
    sortMode: 'client',
    ariaLabel: 'Bets',
    onContextAction: fn(),
    onHeaderAction: fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: '<div class="sb-frame"><VGrid v-bind="args" /></div>',
  }),
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Right-click a body cell (the City column keeps the native menu). Keyboard: focus a cell and press
 * the ContextMenu key or Shift+F10.
 */
export const CellMenu: Story = { args: { contextMenu } }

/** Right-click a header: sort, pin, move, hide and reset are built in (on by default). */
export const HeaderMenu: Story = {}

/** Add your own header items; they emit `header-action`, built-ins (`vg:*`) run themselves. */
export const HeaderMenuExtended: Story = {
  args: {
    headerMenu: ({ items }: HeaderMenuContext<Bet>): MenuItem[] => [
      { name: 'copy-column', label: 'Copy column values' },
      { name: 'stats', label: 'Show statistics…' },
      { separator: true },
      ...items,
    ],
  },
}

/** Keep only some built-ins by filtering on their names — here: no move items. */
export const HeaderMenuFiltered: Story = {
  args: {
    headerMenu: ({ items }: HeaderMenuContext<Bet>) =>
      items.filter((i) => !('name' in i) || !i.name.startsWith('vg:move')),
  },
}

/** `:header-menu="false"` turns the header menu off. */
export const HeaderMenuOff: Story = { args: { headerMenu: false } }
