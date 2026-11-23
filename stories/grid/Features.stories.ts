import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, defineComponent, inject, provide, ref } from 'vue'
import {
  GRID_CONFIG_KEY,
  VGridSearch,
  columnPinningFeature,
  columnReorderFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  filteringFeature,
  keyboardNavigationFeature,
  menusFeature,
  paginationFeature,
  selectionFeature,
  sortingFeature,
  subGridsFeature,
  virtualScrollingFeature,
  type GridFeature,
} from '@nocopypaste/vue-grid'
import { betColumns, makeBets, makeMarkets, marketColumns, type Market } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const rows = makeBets(40)

/**
 * Stands in for an app that registers no features: keeps the app-wide renderers and formatting
 * from `.storybook/preview.ts` but drops its `features`.
 */
const BareApp = defineComponent({
  setup(_, { slots }) {
    const parent = inject(GRID_CONFIG_KEY, undefined)
    provide(GRID_CONFIG_KEY, { ...parent, features: [] })
    return () => slots.default?.()
  },
})

const choices: { label: string; feature: GridFeature }[] = [
  { label: 'sortingFeature', feature: sortingFeature },
  { label: 'filteringFeature', feature: filteringFeature },
  { label: 'paginationFeature', feature: paginationFeature },
  { label: 'keyboardNavigationFeature', feature: keyboardNavigationFeature },
]

/**
 * Sorting, filtering, server data, pagination, selection, sub-grids, context menus, column
 * reordering, pinning and visibility, virtual scrolling and keyboard navigation are **opt-in
 * features**. A grid gets only the features you register, per grid
 * (`<VGrid :features="[sortingFeature]">`) or app-wide (`createVueGrid({ features: [...] })`,
 * `allFeatures` for all of them), and only those reach your bundle. Without them the matching
 * options (`sortable`, `filterable`, `data-source`, `pagination`, `selectable`, `sub-rows`,
 * `context-menu` …) do nothing, and a dev warning names the missing feature.
 *
 * The other stories register `allFeatures` app-wide; this one starts from an app without any.
 */
const meta = {
  title: 'Grid/Features',
  component: VGrid,
  args: {
    rows,
    columns: betColumns({ sortable: true }).map((c) => ({ ...c, filterable: true })) as GridArgs['columns'],
    rowKey: 'id',
    ariaLabel: 'Bets',
  },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Tick features on and off. The grid is re-created on change: features are read once. */
export const OptIn: Story = {
  render: (args) => ({
    components: { VGrid, BareApp, VGridSearch },
    setup() {
      const on = ref<string[]>([])
      const features = computed(() => choices.filter((c) => on.value.includes(c.label)).map((c) => c.feature))
      return { args, on, choices, features }
    },
    template: `
      <fieldset class="sb-note" style="display:flex;gap:1rem;border:0;padding:0">
        <legend style="float:left;margin-right:.5rem">features:</legend>
        <label v-for="c in choices" :key="c.label">
          <input v-model="on" type="checkbox" :value="c.label" /> <code>{{ c.label }}</code>
        </label>
      </fieldset>
      <BareApp>
        <div class="sb-frame">
          <VGrid
            :key="on.join()"
            v-bind="args"
            :features="features"
            sort-mode="client"
            filter-row
            :pagination="{ pageSizes: [10, 20] }"
            :page-size="10"
          >
            <template #toolbar><VGridSearch /></template>
          </VGrid>
        </div>
      </BareApp>`,
  }),
}

const rowChoices: { label: string; feature: GridFeature }[] = [
  { label: 'selectionFeature', feature: selectionFeature },
  { label: 'subGridsFeature', feature: subGridsFeature },
  { label: 'menusFeature', feature: menusFeature },
]
const markets = makeMarkets()

/**
 * Selection, sub-grids and context menus are features too. Without `menusFeature`, right-click
 * shows the browser's own menu.
 */
export const RowsAndMenus: Story = {
  render: () => ({
    components: { VGrid, BareApp },
    setup() {
      const on = ref<string[]>([])
      const features = computed(() => rowChoices.filter((c) => on.value.includes(c.label)).map((c) => c.feature))
      const contextMenu = () => [{ name: 'copy', label: 'Copy' }]
      return { on, rowChoices, features, markets, marketColumns, contextMenu, subRows: (m: Market) => m.children }
    },
    template: `
      <fieldset class="sb-note" style="display:flex;gap:1rem;border:0;padding:0">
        <legend style="float:left;margin-right:.5rem">features:</legend>
        <label v-for="c in rowChoices" :key="c.label">
          <input v-model="on" type="checkbox" :value="c.label" /> <code>{{ c.label }}</code>
        </label>
      </fieldset>
      <BareApp>
        <div class="sb-frame">
          <VGrid
            :key="on.join()"
            :rows="markets"
            :columns="marketColumns"
            row-key="id"
            aria-label="Markets"
            :features="features"
            selectable
            :sub-rows="subRows"
            :context-menu="contextMenu"
          />
        </div>
      </BareApp>`,
  }),
}

const columnChoices: { label: string; feature: GridFeature }[] = [
  { label: 'columnReorderFeature', feature: columnReorderFeature },
  { label: 'columnPinningFeature', feature: columnPinningFeature },
  { label: 'columnVisibilityFeature', feature: columnVisibilityFeature },
  { label: 'columnResizingFeature', feature: columnResizingFeature },
  { label: 'menusFeature', feature: menusFeature },
]
const wideColumns = betColumns().map((c) =>
  c.key === 'id'
    ? { ...c, pinned: 'left' as const }
    : c.key === 'change'
      ? { ...c, width: '12rem', hidden: true }
      : { ...c, width: '12rem' },
) as GridArgs['columns']

/**
 * Reordering (drag a header, Alt+←/→, Move items in the header menu), pinning (sticky `pinned`
 * columns, Pin items in the header menu) and visibility (`hidden` columns, Hide column in the header
 * menu) are features too. Without `columnPinningFeature` the `#` column's `pinned: 'left'` is
 * ignored and it scrolls away with the rest; without `columnVisibilityFeature` the `hidden: true`
 * "Δ odds" column shows.
 */
export const Columns: Story = {
  render: (args) => ({
    components: { VGrid, BareApp },
    setup() {
      const on = ref<string[]>([])
      const features = computed(() => columnChoices.filter((c) => on.value.includes(c.label)).map((c) => c.feature))
      return { args, on, columnChoices, features, wideColumns }
    },
    template: `
      <fieldset class="sb-note" style="display:flex;gap:1rem;border:0;padding:0">
        <legend style="float:left;margin-right:.5rem">features:</legend>
        <label v-for="c in columnChoices" :key="c.label">
          <input v-model="on" type="checkbox" :value="c.label" /> <code>{{ c.label }}</code>
        </label>
      </fieldset>
      <BareApp>
        <div class="sb-frame" style="max-width: 640px">
          <VGrid :key="on.join()" v-bind="args" :columns="wideColumns" :features="features" />
        </div>
      </BareApp>`,
  }),
}

const manyRows = makeBets(2000)

/**
 * Virtual scrolling is a feature too: with `virtualScrollingFeature`, `:virtual="{ rowHeight: 40 }"`
 * renders only the rows in view. Without it, `virtual` is ignored and all 2,000 rows render.
 */
export const VirtualScrolling: Story = {
  render: (args) => ({
    components: { VGrid, BareApp },
    setup() {
      const on = ref(false)
      const features = computed(() => (on.value ? [virtualScrollingFeature] : []))
      const rendered = ref(0)
      const count = () => (rendered.value = document.querySelectorAll('#storybook-root .vg-row').length)
      return { args, on, features, manyRows, rendered, count }
    },
    template: `
      <p class="sb-note">
        <label><input v-model="on" type="checkbox" /> <code>virtualScrollingFeature</code></label>
        · <button type="button" @click="count">Count rendered rows</button>
        <output data-testid="rendered">{{ rendered }}</output>
      </p>
      <BareApp>
        <div class="sb-frame">
          <VGrid :key="String(on)" v-bind="args" :rows="manyRows" :features="features" :virtual="{ rowHeight: 40 }" style="height: 420px" />
        </div>
      </BareApp>`,
  }),
}

/** No features: a plain, read-only table, which is the smallest bundle. */
export const NoFeatures: Story = {
  render: (args) => ({
    components: { VGrid, BareApp },
    setup: () => ({ args }),
    template: `<BareApp><div class="sb-frame"><VGrid v-bind="args" /></div></BareApp>`,
  }),
}
