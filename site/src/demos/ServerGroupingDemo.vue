<script setup lang="ts">
import { ref } from 'vue'
import {
  createColumnHelper,
  VGrid,
  type DataSource,
  type GroupPath,
  type RowKey,
} from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

// ── A fake server: 5,000 bets, ~350 ms per request ───────────────────────────────────────
const db = makeBets(5000, 41)
const requests = ref<string[]>([])
const valueOf = (b: Bet, key: string): unknown =>
  key === 'city' ? b.player.city : (b as unknown as Record<string, unknown>)[key]

/** Answers a grouped query with groups (value, count, aggregates), or rows at the last level. */
const dataSource: DataSource<Bet> = async (query) => {
  await new Promise((r) => setTimeout(r, 350))
  const path = query.groupPath ?? []
  let rows = db
  for (const p of path) rows = rows.filter((b) => valueOf(b, p.key) === p.value)
  const where = path.map((p) => String(p.value)).join(' › ') || 'top level'
  if (!query.groupBy || path.length === query.groupBy.length) {
    requests.value = [`${rows.length} rows of ${where}`, ...requests.value].slice(0, 5)
    return { rows, total: rows.length }
  }
  const key = query.groupBy[path.length]!
  const groups = [...new Set(rows.map((b) => String(valueOf(b, key))))].sort().map((value) => {
    const inGroup = rows.filter((b) => String(valueOf(b, key)) === value)
    const stake = inGroup.reduce((n, b) => n + b.stake, 0)
    return { value, count: inGroup.length, aggregates: { stake: Math.round(stake * 100) / 100 } }
  })
  requests.value = [`${groups.length} groups in ${where}`, ...requests.value].slice(0, 5)
  return { groups, total: groups.length, rowTotal: rows.length }
}

// ── The grid ─────────────────────────────────────────────────────────────────────────────
const groupBy = ref<string[]>(['status', 'city'])
const selected = ref<RowKey[]>([])
const selectedGroups = ref<GroupPath[]>([])

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content' }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: 'minmax(10rem, 1fr)' }),
  col({ key: 'city', header: 'City', field: 'player.city', groupable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    groupable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', aggregate: 'sum' }),
]
</script>

<template>
  <!-- serverGroupingFeature: the query carries groupBy / groupPath; groups load on expand. -->
  <VGrid
    v-model:group-by="groupBy"
    v-model:selected="selected"
    v-model:selected-groups="selectedGroups"
    class="demo-tall"
    :data-source="dataSource"
    :columns="columns"
    row-key="id"
    selectable
    status-bar
    aria-label="Bets, grouped on the server"
  />
  <p class="demo-log">v-model:selected-groups = {{ JSON.stringify(selectedGroups) }}</p>
  <ol class="demo-requests" aria-label="Requests, newest first">
    <li v-for="(line, i) in requests" :key="i">
      <code>{{ line }}</code>
    </li>
  </ol>
</template>
