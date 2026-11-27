<script setup lang="ts">
import { VGrid, type ColumnDef, type RowKey, type VGridExposed } from '@nocopypaste/vue-grid'
import { computed, ref, shallowRef } from 'vue'

interface WorkItem {
  id: string
  parent?: string
  title: string
  kind: 'branch' | 'task'
  team: 'Operations' | 'Support'
  revision: number
  children?: WorkItem[]
}

const task = (id: string, title: string, parent: string, team: WorkItem['team']): WorkItem => ({
  id,
  title,
  parent,
  team,
  kind: 'task',
  revision: 1,
})
const records = shallowRef<WorkItem[]>([
  { id: 'workspace', title: 'Workspace', kind: 'branch', team: 'Operations', revision: 1 },
  {
    id: 'release',
    parent: 'workspace',
    title: 'Release',
    kind: 'branch',
    team: 'Operations',
    revision: 1,
  },
  { id: 'library', title: 'Library', kind: 'branch', team: 'Support', revision: 1 },
  ...Array.from({ length: 12 }, (_, i) =>
    task(`ops-${i + 1}`, `Release task ${i + 1}`, 'release', 'Operations'),
  ),
  ...Array.from({ length: 5 }, (_, i) =>
    task(`support-${i + 1}`, `Library task ${i + 1}`, 'library', 'Support'),
  ),
])
const treeRows = computed(() => {
  const nodes = new Map(
    records.value.map((item) => [item.id, { ...item, children: [] as WorkItem[] }]),
  )
  const roots: WorkItem[] = []
  for (const item of nodes.values()) {
    const parent = item.parent ? nodes.get(item.parent) : undefined
    if (parent) parent.children.push(item)
    else roots.push(item)
  }
  return roots
})
const taskRows = computed(() => records.value.filter((item) => item.kind === 'task'))
const columns: ColumnDef<WorkItem>[] = [
  { key: 'title', header: 'Work item', width: 'minmax(0, 1fr)' },
  { key: 'team', header: 'Team', width: '8rem' },
  { key: 'revision', header: 'Revision', width: '6rem' },
]
const subRows = (item: WorkItem) => item.children
const hasDetail = (item: WorkItem) => item.kind === 'task'
const mode = ref<'tree' | 'grouped'>('tree')
const expanded = ref<RowKey[]>(['workspace', 'release'])
const details = ref<RowKey[]>([])
const tree = ref<VGridExposed<WorkItem>>()
const grouped = ref<VGridExposed<WorkItem>>()
const visibleTasks = computed(
  () =>
    (mode.value === 'tree' ? tree.value : grouped.value)?.getVisibleRows().filter(hasDetail)
      .length ?? 0,
)

function refresh() {
  records.value = records.value.map((item) => ({ ...item, revision: item.revision + 1 }))
}

function patchTasks() {
  const revised = records.value.map((item) =>
    item.id === 'ops-6' ? { ...item, revision: item.revision + 1 } : item,
  )
  const next = revised.filter((item) => item.team === 'Support' && item.kind === 'task').length + 1
  records.value = [
    ...revised,
    task(`support-${next}`, `Library task ${next}`, 'library', 'Support'),
  ]
}
</script>

<template>
  <div class="refreshing-views">
    <div class="view-controls">
      <button type="button" :aria-pressed="mode === 'tree'" @click="mode = 'tree'">
        Tree view
      </button>
      <button type="button" :aria-pressed="mode === 'grouped'" @click="mode = 'grouped'">
        Grouped view
      </button>
      <button type="button" @click="refresh">Refresh records</button>
      <button type="button" @click="patchTasks">Apply task update</button>
    </div>
    <p role="status" aria-label="Visible tasks">Visible tasks: {{ visibleTasks }}</p>
    <div class="view-panels">
      <VGrid
        ref="tree"
        v-model:expanded="expanded"
        v-model:detail-expanded="details"
        :inert="mode !== 'tree'"
        :rows="treeRows"
        :columns="columns"
        :sub-rows="subRows"
        :row-expandable="hasDetail"
        row-key="id"
        aria-label="Work item tree"
        class="work-items"
      >
        <template #detail="{ row }"
          >Details for {{ row.title }} · Revision {{ row.revision }}</template
        >
      </VGrid>
      <VGrid
        ref="grouped"
        v-model:detail-expanded="details"
        :inert="mode !== 'grouped'"
        :rows="taskRows"
        :columns="columns"
        :row-expandable="hasDetail"
        :groups-expanded="false"
        group-by="team"
        row-key="id"
        aria-label="Tasks by team"
        class="work-items"
      >
        <template #group-team="{ value }">{{ value }} team</template>
        <template #detail="{ row }"
          >Details for {{ row.title }} · Revision {{ row.revision }}</template
        >
      </VGrid>
    </div>
  </div>
</template>

<style scoped>
.refreshing-views {
  inline-size: min(100%, 42rem);
}

.view-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.view-panels {
  display: grid;
}

.work-items {
  grid-area: 1 / 1;
  block-size: 16rem;
}

.work-items[inert] {
  visibility: hidden;
}
</style>
