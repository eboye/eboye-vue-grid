<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, type ShallowRef } from 'vue'
import { createColumnHelper, patchRows, VGrid, type SortState } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

// Immutable rows: patchRows makes new objects for the patched rows only, so only their cells
// re-render (and flash).
const rows: ShallowRef<Bet[]> = shallowRef(makeBets(14, 4))
const running = ref(true)
const sort = ref<SortState | null>(null)
const updates = ref(0)

const timer = setInterval(() => {
  if (!running.value) return
  const patches = Array.from({ length: 3 }, () => {
    const row = rows.value[Math.floor(Math.random() * rows.value.length)]!
    return {
      id: row.id,
      stake: Math.max(1, Math.round((row.stake + (Math.random() - 0.5) * 60) * 100) / 100),
      change: Math.round((Math.random() - 0.5) * 100) / 10,
    }
  })
  rows.value = patchRows(rows.value, patches, 'id')
  updates.value += patches.length
}, 900)
onBeforeUnmount(() => clearInterval(timer))

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content', sortable: true }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr', sortable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', sortable: true }),
]
</script>

<template>
  <div class="demo-bar">
    <button type="button" class="vg-button" :aria-pressed="!running" @click="running = !running">
      {{ running ? 'Pause' : 'Resume' }}
    </button>
    <span class="demo-muted">{{ updates }} cell updates</span>
  </div>
  <VGrid
    v-model:sort="sort"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    flash="direction"
    aria-label="Live bets"
  />
</template>
