<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  matchesFilter,
  VGrid,
  VGridSearch,
  type DataSource,
  type FilterOption,
  type GridQuery,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

// ── A fake REST backend: 500 bets, ~400 ms per request ───────────────────────────────

const db = makeBets(500, 21)
const requests = ref<{ id: number; query: string; state: string }[]>([])
let failNext = false
const failNextRequest = () => (failNext = true)
let seq = 0

const valueOf = (row: Bet, key: string) =>
  key === 'player' ? row.player.name : key === 'city' ? row.player.city : row[key as keyof Bet]

/** Called by the grid with the current sort, filters, search and page. */
const dataSource: DataSource<Bet> = (query, { signal }) => {
  const id = ++seq
  requests.value = [{ id, query: describe(query), state: 'pending' }, ...requests.value].slice(0, 6)
  let done = false
  const settle = (state: string) => {
    if (done) return
    done = true
    requests.value = requests.value.map((r) => (r.id === id ? { ...r, state } : r))
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (failNext) {
        failNext = false
        settle('error')
        return reject(new Error('500 Internal Server Error'))
      }
      let rows = db.filter((row) =>
        Object.entries(query.filters.columns).every(([key, f]) =>
          matchesFilter(valueOf(row, key), f),
        ),
      )
      const term = query.filters.search?.trim().toLowerCase()
      if (term)
        rows = rows.filter((r) => `${r.player.name} ${r.player.city}`.toLowerCase().includes(term))
      if (query.sort) {
        const { key, dir } = query.sort
        rows = [...rows].sort((a, b) => {
          const x = valueOf(a, key) as string | number
          const y = valueOf(b, key) as string | number
          return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1)
        })
      }
      const total = rows.length
      if (query.pageSize)
        rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
      settle(`ok, ${rows.length} rows`)
      resolve({ rows, total })
    }, 400)
    // A newer query supersedes this one: the grid aborts it.
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      settle('aborted')
    })
  })
}

/** City filter options, searched on the "server". */
async function cityOptions(search: string): Promise<FilterOption[]> {
  await new Promise((r) => setTimeout(r, 250))
  const counts = new Map<string, number>()
  for (const row of db) counts.set(row.player.city, (counts.get(row.player.city) ?? 0) + 1)
  return [...counts]
    .filter(([city]) => city.toLowerCase().includes(search.toLowerCase()))
    .map(([city, count]) => ({ value: city, count }))
}

function describe(q: GridQuery) {
  const parts = [`page ${q.page}/${q.pageSize}`]
  if (q.sort) parts.push(`sort ${q.sort.key} ${q.sort.dir}`)
  for (const [key, f] of Object.entries(q.filters.columns))
    parts.push(`${key} ${JSON.stringify(f).replace(/"/g, '')}`)
  if (q.filters.search) parts.push(`search “${q.filters.search}”`)
  return parts.join(' · ')
}

// ── The grid ─────────────────────────────────────────────────────────────────────────

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    sortable: true,
    filterable: true,
  }),
  col({
    key: 'city',
    header: 'City',
    field: 'player.city',
    filterable: true,
    filter: { type: 'set', options: cityOptions },
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    filterable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, filterable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true }),
]
</script>

<template>
  <!-- A failed request keeps the rows already shown, with a notice and Retry (and emits load-error). -->
  <VGrid
    :columns="columns"
    :data-source="dataSource"
    row-key="id"
    filter-row
    :pagination="{ pageSizes: [10, 25, 50] }"
    :page-size="10"
    :skeleton="10"
    aria-label="Bets from the server"
  >
    <template #toolbar>
      <VGridSearch placeholder="Search player or city…" />
      <button type="button" class="vg-button vg-button-ghost" @click="failNextRequest">
        Fail next request
      </button>
    </template>
  </VGrid>
  <ol class="demo-requests" aria-label="Requests, newest first">
    <li v-for="r in requests" :key="r.id" :data-state="r.state.split(',')[0]">
      <code>#{{ r.id }} {{ r.state }}</code> {{ r.query }}
    </li>
  </ol>
</template>
