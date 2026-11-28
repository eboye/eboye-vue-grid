<script setup lang="ts">
import { VGrid, type ColumnDef } from '@nocopypaste/vue-grid'
import { nextTick, ref, shallowRef } from 'vue'

type Workload = 'page' | 'tree' | 'grouped' | 'flat' | 'custom'

interface WorkItem {
  id: string
  title: string
  team: string
  owner: string
  effort: number
  revision: number
  children?: WorkItem[]
}

const props = withDefaults(
  defineProps<{ workload: Workload; startMounted?: boolean; overscan?: number }>(),
  { startMounted: true, overscan: 6 },
)
const custom = props.workload === 'custom'
const rowsPerBranch = 40
const rowCount = custom
  ? 500
  : props.workload === 'page'
    ? 50
    : props.workload === 'flat'
      ? 10_000
      : 2_000
const leaves = Array.from({ length: rowCount }, (_, index) => ({
  id: `task-${index + 1}`,
  title: `Work item ${index + 1}`,
  team: `Team ${Math.floor(index / rowsPerBranch) + 1}`,
  owner: ['Taylor', 'Jordan', 'Alex', 'Sam'][index % 4]!,
  effort: (index % 8) + 1,
  revision: 0,
}))
const branches: WorkItem[] = custom
  ? [{ ...leaves[0]!, id: 'project-1', title: 'Project 1', children: leaves }]
  : props.workload === 'tree'
    ? Array.from({ length: rowCount / rowsPerBranch }, (_, index) => {
        const start = index * rowsPerBranch
        return {
          ...leaves[start]!,
          id: `project-${index + 1}`,
          title: `Project ${index + 1}`,
          children: leaves.slice(start, start + rowsPerBranch),
        }
      })
    : []
const initialRows: WorkItem[] = branches.length ? branches : leaves
const expanded = branches.map((branch) => branch.id)
const childrenOf = (row: WorkItem) => row.children
const columns: ColumnDef<WorkItem>[] = [
  { key: 'id', header: 'ID', width: '8rem' },
  { key: 'title', header: 'Work item', width: 'minmax(10rem, 1fr)' },
  { key: 'team', header: 'Team', width: '8rem' },
  { key: 'owner', header: 'Owner', width: '8rem' },
  { key: 'effort', header: 'Effort', width: '6rem', renderer: 'number' },
  { key: 'revision', header: 'Revision', width: '6rem', renderer: 'number' },
]
if (custom) {
  columns[0] = { ...columns[0]!, pinned: 'left' }
  for (let index = 1; index <= 11; index++)
    columns.push({ key: `metric-${index}`, header: `Metric ${index}`, width: '6rem' })
}
const virtual = props.workload === 'page' ? undefined : { rowHeight: 36, overscan: props.overscan }
const rows = shallowRef(initialRows)
const fixture = ref<HTMLElement>()
const mounted = ref(props.startMounted)
const changedKeys = new Set(leaves.slice(0, custom ? 1 : 10).map((item) => item.id))
const detailExpanded = ref<string[]>([])
const format = new Intl.NumberFormat('en-US')

function display(column: ColumnDef<WorkItem>, row: WorkItem, value: unknown) {
  return column.key.startsWith('metric-')
    ? format.format(row.effort + Number(column.key.slice('metric-'.length)))
    : String(value ?? '')
}

async function commit() {
  await nextTick()
  fixture.value?.dispatchEvent(new Event('benchmark-commit'))
}

async function toggleGrid() {
  if (!mounted.value) rows.value = initialRows
  detailExpanded.value = []
  mounted.value = !mounted.value
  await commit()
}

async function updateRows(fresh = false) {
  const patch = (item: WorkItem) => {
    if (changedKeys.has(item.id)) return { ...item, revision: item.revision + 1 }
    return fresh ? { ...item } : item
  }
  const first = rows.value[0]
  rows.value = first?.children
    ? [{ ...first, children: first.children.map(patch) }, ...rows.value.slice(1)]
    : rows.value.map(patch)
  await commit()
}

async function openDetail() {
  detailExpanded.value = ['project-1']
  await commit()
}
</script>

<template>
  <div ref="fixture" data-testid="grid-benchmark" :data-last-row="leaves.at(-1)?.id">
    <button type="button" data-action="mount" @click="toggleGrid">
      {{ mounted ? 'Unmount grid' : 'Mount grid' }}
    </button>
    <button type="button" data-action="update" :disabled="!mounted" @click="updateRows()">
      {{ custom ? 'Update one row' : 'Update 10 rows' }}
    </button>
    <button
      v-if="custom"
      type="button"
      data-action="fresh"
      :disabled="!mounted"
      @click="updateRows(true)"
    >
      Replace snapshot
    </button>
    <button
      v-if="custom"
      type="button"
      data-action="detail"
      :disabled="!mounted"
      @click="openDetail"
    >
      Open detail
    </button>
    <VGrid
      v-if="mounted"
      :rows="rows"
      :columns="columns"
      :sub-rows="workload === 'tree' || custom ? childrenOf : undefined"
      :expanded="expanded"
      :detail-expanded="custom ? detailExpanded : undefined"
      :group-by="workload === 'grouped' ? 'team' : undefined"
      groups-expanded
      :virtual="virtual"
      row-key="id"
      aria-label="Benchmark grid"
      class="benchmark-grid"
      :class="{ 'benchmark-custom': custom }"
    >
      <template
        v-for="column in custom ? columns : []"
        :key="column.key"
        #[`cell-${column.key}`]="{ row, value }"
      >
        <span class="vg-text vg-text-ellipsis" :title="display(column, row, value)">{{
          display(column, row, value)
        }}</span>
      </template>
      <template v-if="custom" #detail>
        <VGrid
          :rows="leaves.slice(0, 12)"
          :columns="columns.slice(0, 3)"
          density="compact"
          row-key="id"
          class="vg-scroll-chain-y"
          aria-label="Project details"
        />
      </template>
    </VGrid>
  </div>
</template>

<style scoped>
.benchmark-grid {
  margin-block-start: 0.5rem;
  inline-size: min(100%, 60rem);
  block-size: 28rem;
}
.benchmark-custom {
  inline-size: min(100%, 640px);
}
</style>
