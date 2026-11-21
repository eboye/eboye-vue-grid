import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, defineComponent, inject, provide, ref } from 'vue'
import {
  GRID_CONFIG_KEY,
  VGridSearch,
  filteringFeature,
  paginationFeature,
  sortingFeature,
  type GridFeature,
} from '@eboye/vue-grid'
import { betColumns, makeBets } from '../data'
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
]

/**
 * Sorting, filtering, server data and pagination are **opt-in features**. A grid gets only the
 * features you register, per grid (`<VGrid :features="[sortingFeature]">`) or app-wide
 * (`createVueGrid({ features: [...] })`, `allFeatures` for all of them), and only those reach your
 * bundle. Without them, `sortable` / `filterable` columns, `filter-row`, `data-source` and
 * `pagination` do nothing (a dev warning names the missing feature).
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

/** No features: a plain, read-only table, which is the smallest bundle. */
export const NoFeatures: Story = {
  render: (args) => ({
    components: { VGrid, BareApp },
    setup: () => ({ args }),
    template: `<BareApp><div class="sb-frame"><VGrid v-bind="args" /></div></BareApp>`,
  }),
}
