import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { createColumnHelper, type VGridExposed } from '@nocopypaste/vue-grid'
import { computed, ref } from 'vue'
import { betColumns, makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'
import PagedDetailFixture from './PagedDetailFixture.vue'
import RefreshingViewsFixture from './RefreshingViewsFixture.vue'

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

export const IndependentExpansion: Story = {
  render: () => ({
    components: { VGrid },
    setup() {
      interface ProjectRow {
        id: number
        name: string
        kind: 'project' | 'task'
        children?: ProjectRow[]
      }
      const rows: ProjectRow[] = [
        {
          id: 1,
          name: 'Website update',
          kind: 'project',
          children: [{ id: 2, name: 'Review content', kind: 'task' }],
        },
      ]
      const columns = [{ key: 'name', header: 'Name' }]
      const expanded = ref<number[]>([])
      const detailExpanded = ref<number[]>([])
      const grid = ref<VGridExposed<ProjectRow>>()
      const taskCount = computed(
        () => grid.value?.getVisibleRows().filter((row) => row.kind === 'task').length ?? 0,
      )
      return { rows, columns, expanded, detailExpanded, grid, taskCount }
    },
    template: `
      <VGrid
        ref="grid"
        v-model:expanded="expanded"
        v-model:detail-expanded="detailExpanded"
        :rows="rows"
        :columns="columns"
        :sub-rows="row => row.children"
        :virtual="{ rowHeight: 40 }"
        row-key="id"
        aria-label="Projects and tasks"
        style="height: 280px"
      >
        <template #detail="{ row }"><p>Details of {{ row.name }}</p></template>
      </VGrid>
      <p role="status">Visible tasks: {{ taskCount }}</p>`,
  }),
}

/** Server-paged projects with a keyboard-accessible detail panel and its own anchored menu. */
export const PagedDetails: Story = {
  render: () => ({
    components: { PagedDetailFixture },
    template: '<PagedDetailFixture />',
  }),
}

/** A short final page with wrapping cells and details that grow with their content. */
export const ContentSizedPage: Story = {
  render: () => ({
    components: { PagedDetailFixture },
    template: '<PagedDetailFixture short-page />',
  }),
}

/** Switch between a project tree and teams while refreshing the same tasks. */
export const RefreshingViews: Story = {
  render: () => ({
    components: { RefreshingViewsFixture },
    template: '<RefreshingViewsFixture />',
  }),
}
