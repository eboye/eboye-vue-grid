<script setup lang="ts">
// The grid with base.css only (no theme): structure must hold on its own. See e2e/unstyled.spec.ts.
import { ref } from 'vue'
import { VGrid, allFeatures, numberRenderer, type ColumnDef, type RowKey, type SortState } from '@nocopypaste/vue-grid'

interface Row {
  id: number
  name: string
  city: string
  stake: number
  a: string
  b: string
  c: string
  d: string
  children?: Row[]
}

const rows: Row[] = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  name: `Market ${i + 1}`,
  city: ['Beograd', 'Niš', 'Novi Sad'][i % 3]!,
  stake: (i * 37) % 500,
  a: 'Alpha',
  b: 'Bravo',
  c: 'Charlie',
  d: 'Delta',
  children:
    i < 3 ? [{ id: 1000 + i, name: `Child of ${i + 1}`, city: 'Subotica', stake: 5, a: 'x', b: 'y', c: 'z', d: 'w' }] : undefined,
}))

const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#', width: '4rem', pinned: 'left', renderer: numberRenderer },
  { key: 'name', header: 'Name', width: '12rem', sortable: true, filterable: true },
  { key: 'city', header: 'City', width: '10rem', filterable: true, filter: 'set' },
  { key: 'stake', header: 'Stake', width: '8rem', sortable: true, renderer: numberRenderer },
  { key: 'a', header: 'A', width: '10rem' },
  { key: 'b', header: 'B', width: '10rem' },
  { key: 'c', header: 'C', width: '10rem' },
  { key: 'd', header: 'D', width: '10rem' },
]

const expanded = ref<RowKey[]>([1, 2])
const sort = ref<SortState | null>({ key: 'name', dir: 'asc' })
</script>

<template>
  <VGrid
    v-model:expanded="expanded"
    v-model:sort="sort"
    :rows="rows"
    :columns="columns"
    row-key="id"
    :features="allFeatures"
    aria-label="Markets"
    selectable
    :sub-rows="(r) => r.children"
    style="height: 100%"
  />
</template>
