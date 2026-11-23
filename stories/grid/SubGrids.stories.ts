import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import { createColumnHelper, type RowKey, type VGridExposed } from '@nocopypaste/vue-grid'
import {
  loadFolder,
  makeMarkets,
  marketColumns,
  rootFolders,
  type Folder,
  type Market,
} from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

/**
 * Nested rows render inside the parent grid with CSS `subgrid`, so children line up with the parent's
 * columns at every depth and follow its sorting, pinning, reordering and hiding. Use → / ← on a focused
 * tree cell to expand / collapse.
 */
const meta = {
  title: 'Grid/Sub-grids',
  component: VGrid,
  args: {
    rows: makeMarkets(),
    columns: marketColumns,
    rowKey: 'id',
    subRows: (row: Market) => row.children,
    sortMode: 'client',
    ariaLabel: 'Markets',
    'onUpdate:expanded': fn(),
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/** `:sub-rows="(row) => row.children"` — children already in the data. */
export const Nested: Story = {
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args, expanded: ref<RowKey[]>(['fb']), grid: ref<VGridExposed>() }),
    template: `
      <div class="sb-row">
        <button class="sb-btn" @click="grid?.expandAll()">Expand all</button>
        <button class="sb-btn" @click="grid?.collapseAll()">Collapse all</button>
        <span class="sb-note">expanded = [{{ expanded.join(', ') }}]</span>
      </div>
      <VGrid ref="grid" v-bind="args" v-model:expanded="expanded" />`,
  }),
}

const folder = createColumnHelper<Folder>()

/**
 * `load-sub-rows` fetches children on first expand (cached afterwards); `has-sub-rows` decides which
 * rows get an expander. “Broken” fails on the first try to show the inline error and Retry.
 */
export const LazyLoaded: Story = {
  args: {
    rows: rootFolders,
    columns: [
      folder({ key: 'name', header: 'Name', width: 'minmax(16rem, 2fr)' }),
      folder({
        key: 'size',
        header: 'Size (KB)',
        renderer: 'number',
        value: (row) => (row.size ? row.size / 1024 : null),
        rendererOptions: { format: { maximumFractionDigits: 0 }, placeholder: '—' },
      }),
      folder({ key: 'modified', header: 'Modified', renderer: 'date' }),
    ],
    subRows: undefined,
    loadSubRows: loadFolder,
    hasSubRows: (row: Folder) => row.hasChildren,
    onSubRowsError: fn(),
    ariaLabel: 'Files',
  },
  render: (args) => ({
    components: { VGrid },
    setup: () => ({ args }),
    template: `
      <VGrid v-bind="args">
        <template #sub-rows-loading="{ row }">Loading {{ row.name }}…</template>
      </VGrid>`,
  }),
}
