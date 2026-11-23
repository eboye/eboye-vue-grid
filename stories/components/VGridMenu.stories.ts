import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import { VGridMenu, type MenuItem } from '@nocopypaste/vue-grid'

const items: MenuItem[] = [
  { name: 'csv', label: 'Export CSV', hint: 'Ctrl+E' },
  { name: 'xlsx', label: 'Export Excel' },
  { name: 'pdf', label: 'Export PDF', disabled: true },
  { separator: true },
  { name: 'clear', label: 'Clear data', tone: 'danger' },
]

/**
 * The menu behind `actions-menu` and the grid's context menus, exported for your own triggers.
 * Popover API (top layer, Esc / outside click close) + CSS anchor positioning (flips to stay on screen).
 */
const meta = {
  title: 'Components/VGridMenu',
  component: VGridMenu,
  args: { items, label: 'Export', onSelect: fn(), onOpen: fn(), onClose: fn() },
} satisfies Meta<typeof VGridMenu>

export default meta
type Story = StoryObj<typeof meta>

/** Declarative: a `popovertarget` button with an `anchor-name`, and the menu's `id` + `anchor-name`. */
export const AnchoredToButton: Story = {
  args: { id: 'sb-export-menu', anchorName: '--sb-export-menu' },
  render: (args) => ({
    components: { VGridMenu },
    setup: () => ({ args }),
    template: `
      <button class="sb-btn" popovertarget="sb-export-menu" :style="{ 'anchor-name': '--sb-export-menu' }">Export ▾</button>
      <VGridMenu v-bind="args" />`,
  }),
}

/** Imperative: `openAt({ x, y })` with `placement="point"` — e.g. your own right-click menu. */
export const AtPointer: Story = {
  args: { placement: 'point' },
  render: (args) => ({
    components: { VGridMenu },
    setup() {
      const menu = ref<InstanceType<typeof VGridMenu>>()
      const open = (e: MouseEvent) => {
        e.preventDefault()
        void menu.value?.openAt({ x: e.clientX, y: e.clientY }, e.currentTarget as HTMLElement)
      }
      return { args, menu, open }
    },
    template: `
      <div tabindex="0" @contextmenu="open"
        style="display: grid; place-items: center; height: 220px; border: 2px dashed currentColor; border-radius: 0.75rem; opacity: 0.8">
        Right-click anywhere in this box
      </div>
      <VGridMenu ref="menu" v-bind="args" />`,
  }),
}
