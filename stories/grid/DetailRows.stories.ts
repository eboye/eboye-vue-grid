import type { Meta, StoryObj } from '@storybook/vue3-vite'
import {
  createColumnHelper,
  type ExpanderAttrsContext,
  type VGridExposed,
} from '@nocopypaste/vue-grid'
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

/** A virtual grid measures the detail panel around independently sized nested grids. */
export const VirtualNestedGrids: Story = {
  render: () => ({
    components: { VGrid },
    setup() {
      return {
        projects: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, name: `Project ${i + 1}` })),
        tasks: [{ id: 1, name: 'Review content' }],
        nextTask: { id: 2, name: 'Publish content' },
        taskList: Array.from({ length: 16 }, (_, i) => ({ id: i + 1, name: `Task ${i + 1}` })),
        showMore: ref(false),
        columns: [{ key: 'name', header: 'Name' }],
      }
    },
    template: `
      <VGrid :rows="projects" :columns="columns" row-key="id" aria-label="Projects"
        :expanded="[1]" :row-expandable="row => row.id === 1"
        :virtual="{ rowHeight: 60, overscan: 0 }" style="height: 470px">
        <template #detail>
          <VGrid :rows="showMore ? [...tasks, nextTask] : tasks" :columns="columns"
            row-key="id" density="compact" aria-label="Project tasks" />
          <button type="button" @click="showMore = !showMore">Toggle extra task</button>
          <VGrid :rows="taskList" :columns="columns" :virtual="{ rowHeight: 32 }"
            row-key="id" aria-label="All tasks" style="height: 128px" />
        </template>
      </VGrid>`,
  }),
}

/** The outer virtual grid scrolls vertically past a content-height child in its detail panel. */
export const ContentHeightDetailGrid: Story = {
  render: () => ({
    components: { VGrid },
    setup: () => ({
      projects: [{ id: 1, name: 'Website update' }],
      projectColumns: [{ key: 'name', header: 'Project', sortable: true }],
      tasks: Array.from({ length: 64 }, (_, i) => ({
        id: i + 1,
        name: `Task ${i + 1}`,
        description: 'Review and update content',
      })),
      taskColumns: [
        { key: 'name', header: 'Task', width: '140px', pinned: 'left', sortable: true },
        { key: 'description', header: 'Description', width: '600px' },
      ],
    }),
    template: `
      <VGrid :rows="projects" :columns="projectColumns" row-key="id" aria-label="Projects"
        :expanded="[1]" :virtual="{ rowHeight: 48 }" style="width: 640px; height: 400px">
        <template #detail>
          <VGrid :rows="tasks" :columns="taskColumns" row-key="id" aria-label="Project tasks"
            density="compact" class="vg-scroll-chain-y" style="width: 500px; max-width: 100%" />
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

const expansionStory = (split = false): Story => ({
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
      const columns = split
        ? [
            { key: 'details', header: 'Details', width: '4.5rem', align: 'center', pinned: 'left' },
            { key: 'name', header: 'Name', width: '12rem', pinned: 'left' },
            { key: 'kind', header: 'Type', width: '34rem' },
          ]
        : [{ key: 'name', header: 'Name' }]
      const expanded = ref<number[]>([])
      const detailExpanded = ref<number[]>([])
      const grid = ref<VGridExposed<ProjectRow>>()
      const taskCount = computed(
        () => grid.value?.getVisibleRows().filter((row) => row.kind === 'task').length ?? 0,
      )
      const treeExpanderAttrs = ({ row, rowKey, expanded }: ExpanderAttrsContext<ProjectRow>) => ({
        'aria-label': `${expanded ? 'Hide' : 'Show'} tasks for ${row.name}`,
        'data-testid': `tree-${rowKey}`,
      })
      const detailExpanderAttrs = ({
        row,
        rowKey,
        expanded,
      }: ExpanderAttrsContext<ProjectRow>) => ({
        'aria-label': `${expanded ? 'Hide' : 'Show'} details for ${row.name}`,
        'data-testid': `detail-${rowKey}`,
      })
      return {
        rows,
        columns,
        expanded,
        detailExpanded,
        grid,
        taskCount,
        treeExpanderAttrs,
        detailExpanderAttrs,
        split,
      }
    },
    template: `
      <VGrid
        ref="grid"
        v-model:expanded="expanded"
        v-model:detail-expanded="detailExpanded"
        :rows="rows"
        :columns="columns"
        :sub-rows="row => row.children"
        :tree-column-key="split ? 'name' : undefined"
        :detail-expander-column-key="split ? 'details' : undefined"
        :tree-expander-attrs="treeExpanderAttrs"
        :detail-expander-attrs="detailExpanderAttrs"
        :virtual="{ rowHeight: 40 }"
        row-key="id"
        aria-label="Projects and tasks"
        :style="{ height: '280px', maxWidth: split ? '640px' : undefined }"
      >
        <template #detail="{ row, close }">
          <p>Details of {{ row.name }}</p>
          <button type="button" @click="close()">Close details</button>
        </template>
      </VGrid>
      <p role="status">Visible tasks: {{ taskCount }}</p>`,
  }),
})

export const IndependentExpansion = expansionStory()

/** Pinned detail buttons live in a separate column from tree labels and indentation. */
export const SeparateControlColumns = expansionStory(true)

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
