<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, moveRow, VGrid, type RowMoveEvent } from '@nocopypaste/vue-grid'

interface Task {
  id: number
  title: string
  owner: string
  due: string
}
const titles = [
  'Fix the login timeout',
  'Ship the March report',
  'Review the new pricing',
  'Update the onboarding emails',
  'Plan the Q3 roadmap',
  'Clean up old feature flags',
  'Translate the help pages',
  'Renew the SSL certificates',
]
const owners = ['Ana', 'Bo', 'Cy', 'Dea']
const tasks = ref<Task[]>(
  titles.map((title, i) => ({
    id: i + 1,
    title,
    owner: owners[i % owners.length]!,
    due: `2026-12-${String(3 + i * 3).padStart(2, '0')}`,
  })),
)
const log = ref<string[]>([])

// The grid doesn't move rows itself: put the row where it was dropped (or saved, server side).
function onRowMove(e: RowMoveEvent<Task>) {
  tasks.value = moveRow(tasks.value, e)
  log.value = [
    `“${e.row.title}” ${e.position} “${e.target.title}” (${e.source})`,
    ...log.value,
  ].slice(0, 3)
}

const col = createColumnHelper<Task>()
const columns = [
  // the priority is the row's place in the list
  col({
    key: 'priority',
    header: '#',
    width: 'min-content',
    value: (t) => tasks.value.indexOf(t) + 1,
  }),
  col({ key: 'title', header: 'Task', width: 'minmax(12rem, 1fr)', sortable: true }),
  col({ key: 'owner', header: 'Owner', sortable: true }),
  col({ key: 'due', header: 'Due', renderer: 'date', sortable: true }),
]
</script>

<template>
  <VGrid
    :rows="tasks"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    row-reorder
    aria-label="Tasks by priority"
    @row-move="onRowMove"
  />
  <ul class="demo-log" data-testid="log">
    <li v-for="(line, i) in log" :key="i">{{ line }}</li>
    <li v-if="!log.length">Drag a task by its handle, or click it and press Alt+↑ / Alt+↓.</li>
  </ul>
</template>
