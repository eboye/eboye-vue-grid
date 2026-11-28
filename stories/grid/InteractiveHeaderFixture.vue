<script setup lang="ts">
import { VGrid, VGridMenu, type ColumnDef } from '@nocopypaste/vue-grid'
import { computed, ref } from 'vue'

interface Project {
  id: number
  name: string
  owner: string
}

const projects: Project[] = [
  { id: 1, name: 'Roadmap', owner: 'Taylor' },
  { id: 2, name: 'Design system', owner: 'Alex' },
  { id: 3, name: 'Documentation', owner: 'Sam' },
]
const group = { key: 'project', label: 'Project' }
const columns: ColumnDef<Project>[] = [
  { key: 'name', header: 'Name', width: '1fr', sortable: true, groupPath: [group] },
  { key: 'owner', header: 'Owner', width: '112px', groupPath: [group] },
]
const menuItems = [
  { name: 'description', label: 'Show column description' },
  { name: 'shortcut', label: 'Show keyboard shortcut' },
  { name: 'field', label: 'Show field key' },
]
const compact = ref(true)
const rows = computed(() => (compact.value ? projects.slice(0, 1) : projects))
const rowHeight = 36
const groupHeight = 32
const headerHeight = 40
const menu = ref<InstanceType<typeof VGridMenu>>()
const menuOpen = ref(false)
const help = ref('')

function openMenu(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    void menu.value?.openAt(event.currentTarget, event.currentTarget)
  }
}

function selectHelp(name: string) {
  if (name === 'description') help.value = 'Name is the title of the project.'
  else if (name === 'shortcut') help.value = 'Press Enter on the column header to sort.'
  else help.value = 'Field key: name'
}
</script>

<template>
  <div class="interactive-table">
    <button type="button" @click="compact = !compact">
      {{ compact ? 'Show all projects' : 'Show one project' }}
    </button>
    <div
      class="fitted-table"
      :style="{
        height: `${groupHeight + headerHeight + rowHeight * rows.length}px`,
        '--demo-row-height': `${rowHeight}px`,
        '--demo-group-height': `${groupHeight}px`,
        '--demo-header-height': `${headerHeight}px`,
      }"
    >
      <VGrid :rows="rows" :columns="columns" row-key="id" sort-mode="client" aria-label="Projects">
        <template #column-group="{ group: headerGroup }">
          {{ headerGroup.label }}
          <button
            type="button"
            @click="help = 'Project columns describe the project and its owner.'"
          >
            About this group
          </button>
        </template>
        <template #column-actions-name>
          <button type="button" aria-haspopup="menu" :aria-expanded="menuOpen" @click="openMenu">
            Name options
          </button>
          <VGridMenu
            ref="menu"
            :items="menuItems"
            label="Name options"
            placement="bottom-start"
            @open="menuOpen = true"
            @close="menuOpen = false"
            @select="selectHelp($event.name)"
          />
        </template>
      </VGrid>
    </div>
    <p role="status" aria-label="Project help">{{ help }}</p>
  </div>
</template>

<style scoped>
.interactive-table {
  inline-size: min(100%, 23rem);
}

.fitted-table {
  margin-block-start: 0.5rem;
  --vg-outer-border: none;
  --vg-cell-padding-y: 0px;
  --vg-header-padding-y: 0px;
}

.fitted-table :deep(.vg-root) {
  height: 100%;
}

.fitted-table :deep(.vg-group-cell) {
  box-sizing: border-box;
  height: var(--demo-group-height);
}

.fitted-table :deep(.vg-header-cell) {
  box-sizing: border-box;
  height: var(--demo-header-height);
}

.fitted-table :deep(.vg-row > .vg-cell) {
  box-sizing: border-box;
  height: var(--demo-row-height);
}

.fitted-table button {
  cursor: pointer;
}
</style>
