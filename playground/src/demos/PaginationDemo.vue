<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { createColumnHelper, sortRows, VGrid, VGridPagination, type SortState } from '@eboye/vue-grid'
import { makeBets, type Bet } from '../data'

// Pretend server: the grid stays "controlled" — it only emits sort, we sort + slice here.
const all = makeBets(137, 5)
const page = ref(1)
const pageSize = ref(10)
const sort = ref<SortState | null>({ key: 'id', dir: 'asc' })
const loading = ref(false)

const sorted = computed(() =>
  sort.value
    ? sortRows(all, sort.value.dir, (r) => (sort.value!.key === 'player' ? r.player.name : r[sort.value!.key as keyof Bet]))
    : all,
)
const pageRows = computed(() => sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

watch([page, sort], () => {
  loading.value = true
  setTimeout(() => (loading.value = false), 250)
})

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', sortable: true, width: '5rem' }),
  col({ key: 'player', header: 'Player', field: 'player.name', sortable: true, width: '1fr' }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'status', header: 'Status', renderer: 'status' }),
]
</script>

<template>
  <section id="pagination" class="pg-card" data-demo="pagination">
    <h2>Pagination with controlled (server-style) sorting</h2>
    <p>The grid emits sort changes; the page sorts and slices "on the server".</p>
    <div style="display: grid; gap: 0.75rem">
      <VGrid v-model:sort="sort" :rows="pageRows" :columns="columns" row-key="id" :loading="loading" aria-label="Paged bets" />
      <VGridPagination v-model:page="page" v-model:page-size="pageSize" :total="all.length" :page-sizes="[10, 25, 50]" />
    </div>
  </section>
</template>
