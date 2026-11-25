import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { moveRow, type RowMoveEvent, type SortState } from '@nocopypaste/vue-grid'
import { Grid as VGrid, type GridArgs } from '../support'

interface Task {
  id: number
  title: string
  owner: string
  children?: Task[]
}

const owners = ['Ana', 'Bo', 'Cy', 'Dea']
const tasks = (): Task[] =>
  Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    title: `Task ${i + 1}`,
    owner: owners[i % owners.length]!,
  }))

const columns = [
  { key: 'title', header: 'Task', width: 'minmax(10rem, 1fr)', sortable: true },
  { key: 'owner', header: 'Owner', width: '8rem', sortable: true },
]

/**
 * `row-reorder` adds a handle column: drag a row by it (mouse, pen or touch), or press Alt+↑ /
 * Alt+↓ on a row. The grid emits `row-move` and the handler moves the row (`moveRow`).
 */
const meta = {
  title: 'Grid/Row reorder',
  component: VGrid,
  args: { rows: [], columns, rowKey: 'id', rowReorder: true, ariaLabel: 'Tasks' },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

const render =
  (make: () => Task[], extra = '') =>
  (args: GridArgs) => ({
    components: { VGrid },
    setup() {
      const rows = ref(make())
      const sort = ref<SortState | null>(null)
      const last = ref('')
      function onRowMove(e: RowMoveEvent<Task>) {
        if (e.parent) e.parent.children = moveRow(e.parent.children!, e)
        else rows.value = moveRow(rows.value, e)
        last.value = `${e.row.title} ${e.position} ${e.target.title} (${e.source})`
      }
      return { args, rows, sort, last, onRowMove }
    },
    template: `
    <div class="sb-frame">
      <VGrid v-bind="args" v-model:sort="sort" :rows="rows" ${extra} @row-move="onRowMove" />
    </div>
    <p class="sb-note" data-testid="last-move">{{ last || 'Drag a row by its handle, or Alt+↑ / Alt+↓.' }}</p>
    <p class="sb-note" data-testid="order">{{ rows.map((r) => r.id).join(',') }}</p>`,
  })

/** A flat list: drag, or Alt+↑ / Alt+↓. Sort a column and the handles turn off. */
export const Reorder: Story = {
  args: { sortMode: 'client' },
  render: render(tasks),
}

/** Nested rows move among their siblings, under the same parent. */
export const NestedRows: Story = {
  render: render(
    () =>
      tasks()
        .slice(0, 4)
        .map((t) => ({
          ...t,
          children: [1, 2, 3].map((n) => ({
            id: t.id * 100 + n,
            title: `${t.title}.${n}`,
            owner: t.owner,
          })),
        })),
    ':sub-rows="(t) => t.children" :expanded="[1, 2]"',
  ),
}
