<script setup lang="ts">
import { VGrid, type ColumnDef } from '@nocopypaste/vue-grid'
import { nextTick, ref, shallowRef } from 'vue'

type Workload = 'page' | 'tree' | 'grouped' | 'flat'

interface WorkItem {
  id: string
  title: string
  team: string
  owner: string
  effort: number
  revision: number
  children?: WorkItem[]
}

const props = withDefaults(defineProps<{ workload: Workload; startMounted?: boolean }>(), {
  startMounted: true,
})
const rowsPerBranch = 40
const rowCount = props.workload === 'page' ? 50 : props.workload === 'flat' ? 10_000 : 2_000
const leaves = Array.from({ length: rowCount }, (_, index) => ({
  id: `task-${index + 1}`,
  title: `Work item ${index + 1}`,
  team: `Team ${Math.floor(index / rowsPerBranch) + 1}`,
  owner: ['Taylor', 'Jordan', 'Alex', 'Sam'][index % 4]!,
  effort: (index % 8) + 1,
  revision: 0,
}))
const branches: WorkItem[] =
  props.workload === 'tree'
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
const virtual = props.workload === 'page' ? undefined : { rowHeight: 36, overscan: 6 }
const rows = shallowRef(initialRows)
const fixture = ref<HTMLElement>()
const mounted = ref(props.startMounted)
const changedKeys = new Set(leaves.slice(0, 10).map((item) => item.id))

async function commit() {
  await nextTick()
  fixture.value?.dispatchEvent(new Event('benchmark-commit'))
}

async function toggleGrid() {
  if (!mounted.value) rows.value = initialRows
  mounted.value = !mounted.value
  await commit()
}

async function updateRows() {
  const patch = (item: WorkItem) =>
    changedKeys.has(item.id) ? { ...item, revision: item.revision + 1 } : item
  const first = rows.value[0]
  rows.value = first?.children
    ? [{ ...first, children: first.children.map(patch) }, ...rows.value.slice(1)]
    : rows.value.map(patch)
  await commit()
}
</script>

<template>
  <div ref="fixture" data-testid="grid-benchmark">
    <button type="button" data-action="mount" @click="toggleGrid">
      {{ mounted ? 'Unmount grid' : 'Mount grid' }}
    </button>
    <button type="button" data-action="update" :disabled="!mounted" @click="updateRows">
      Update 10 rows
    </button>
    <VGrid
      v-if="mounted"
      :rows="rows"
      :columns="columns"
      :sub-rows="workload === 'tree' ? childrenOf : undefined"
      :expanded="expanded"
      :group-by="workload === 'grouped' ? 'team' : undefined"
      groups-expanded
      :virtual="virtual"
      row-key="id"
      aria-label="Benchmark grid"
      class="benchmark-grid"
    />
  </div>
</template>

<style scoped>
.benchmark-grid {
  margin-block-start: 0.5rem;
  inline-size: min(100%, 60rem);
  block-size: 28rem;
}
</style>
