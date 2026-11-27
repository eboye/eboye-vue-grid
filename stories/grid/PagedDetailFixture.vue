<script setup lang="ts">
import {
  VGrid,
  VGridMenu,
  type ColumnDef,
  type DataSource,
  type RowKey,
} from '@nocopypaste/vue-grid'
import { ref, useId } from 'vue'

interface Project {
  id: number
  name: string
  owner: string
  summary: string
}

const props = defineProps<{ shortPage?: boolean }>()
const projects: Project[] = [
  { id: 1, name: 'Website update', owner: 'Taylor', summary: 'Review the updated navigation.' },
  { id: 2, name: 'Design system', owner: 'Alex', summary: 'Confirm the component inventory.' },
  { id: 3, name: 'Documentation', owner: 'Sam', summary: 'Review the getting started guide.' },
  { id: 4, name: 'Reporting', owner: 'Jordan', summary: 'Check the summary fields.' },
]
const moreProjects: Project[] = [
  {
    id: 5,
    name: 'Reporting dashboard and quarterly accessibility review',
    owner: 'Jordan',
    summary:
      'Review the dashboard with the updated contrast settings. Confirm that keyboard focus stays visible throughout the report, and record any follow-up items for the next review.',
  },
  { id: 6, name: 'Archive', owner: 'Sam', summary: 'File the completed review notes.' },
]
const columns: ColumnDef<Project>[] = [
  { key: 'name', header: 'Project', width: '1fr' },
  { key: 'owner', header: 'Owner', width: '7rem' },
]
const source: DataSource<Project> = async ({ page, pageSize }) => {
  const records = props.shortPage ? [...projects.slice(0, 3), ...moreProjects] : projects
  const size = pageSize ?? records.length
  const start = (page - 1) * size
  return { rows: records.slice(start, start + size), total: records.length }
}
const shortPageColumns: ColumnDef<Project>[] = [
  { key: 'name', header: 'Project', width: 'minmax(0, 1fr)' },
  { key: 'owner', header: 'Owner', width: '5rem' },
  { key: 'review', header: 'Review', width: '6rem' },
]
const detailExpanded = ref<RowKey[]>([])
const reviewed = ref(new Set<number>())
const menuItems = [{ name: 'review', label: 'Mark as reviewed' }]
const prefix = useId()
const menuId = (id: number) => `project-actions-${prefix}-${id}`
const anchorName = (id: number) => `--${menuId(id)}`
</script>

<template>
  <VGrid
    v-model:detail-expanded="detailExpanded"
    :data-source="source"
    :columns="shortPage ? shortPageColumns : columns"
    :page-size="shortPage ? 3 : 2"
    pagination
    row-key="id"
    aria-label="Paged projects"
    class="paged-projects"
    :class="{ 'content-sized-projects': shortPage }"
  >
    <template #cell-review="{ row }">
      <button
        type="button"
        :aria-label="`Review status for ${row.name}`"
        :aria-pressed="reviewed.has(row.id)"
        @click="reviewed.has(row.id) ? reviewed.delete(row.id) : reviewed.add(row.id)"
      >
        {{ reviewed.has(row.id) ? 'Reviewed' : 'Review' }}
      </button>
    </template>
    <template #detail="{ row, close }">
      <section :aria-label="`Details for ${row.name}`" class="project-detail">
        <p>{{ row.summary }}</p>
        <div class="project-detail-actions">
          <button type="button" @click="close()">Close details</button>
          <button
            type="button"
            :popovertarget="menuId(row.id)"
            :style="{ 'anchor-name': anchorName(row.id) }"
            aria-haspopup="menu"
          >
            Project actions
          </button>
          <VGridMenu
            :id="menuId(row.id)"
            :items="menuItems"
            :anchor-name="anchorName(row.id)"
            label="Project actions"
            placement="right-start"
            @select="reviewed.add(row.id)"
          />
        </div>
        <p v-if="reviewed.has(row.id)" role="status">Project reviewed</p>
      </section>
    </template>
  </VGrid>
</template>

<style scoped>
.paged-projects {
  inline-size: min(100%, 28rem);
  block-size: 20rem;
}

.content-sized-projects {
  block-size: auto;
  max-block-size: 26rem;
}

.project-detail p {
  margin: 0 0 0.5rem;
}

.project-detail-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
}

.project-detail-actions + p {
  margin: 0.5rem 0 0;
}
</style>
