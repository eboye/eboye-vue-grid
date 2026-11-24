<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type SortState } from '@nocopypaste/vue-grid'
import { makeBets, type Bet } from '../data'
import ProgressCell from './ProgressCell.vue'

const rows = makeBets(12, 17)
const sort = ref<SortState | null>(null)

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content', sortable: true }),
  // A slot below draws this one.
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1.2fr', sortable: true }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  // A component as the renderer: reusable, with options; sorts by the value.
  col({
    key: 'progress',
    header: 'Progress',
    value: (row) => row.stake,
    renderer: ProgressCell,
    rendererOptions: { goal: 500 },
    width: 'minmax(10rem, 1fr)',
    sortable: true,
  }),
]

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
</script>

<template>
  <VGrid
    v-model:sort="sort"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    aria-label="Bets"
  >
    <!-- #cell-<key> replaces a column's renderer; it gets row, value, column… -->
    <template #cell-player="{ row, value }">
      <span class="person">
        <span class="avatar" aria-hidden="true">{{ initials(String(value)) }}</span>
        <span>
          <strong>{{ value }}</strong>
          <span class="city">{{ row.player.city }}</span>
        </span>
      </span>
    </template>
    <!-- #header-<key> replaces a header. -->
    <template #header-stake="{ column }">
      {{ column.header }} <abbr title="Euro, incl. fees">€</abbr>
    </template>
  </VGrid>
</template>

<style scoped>
.person {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.avatar {
  display: grid;
  place-items: center;
  inline-size: 2rem;
  block-size: 2rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--vg-color-accent) 18%, transparent);
  color: var(--vg-color-accent);
  font-size: 0.75rem;
  font-weight: 600;
}
.city {
  display: block;
  color: var(--vg-color-text-muted);
  font-size: 0.85em;
}
</style>
