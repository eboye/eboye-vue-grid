<script setup lang="ts">
import { computed, ref } from 'vue'
import { createColumnHelper, VGrid, type SortState, type VGridExposed } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const count = 100_000
const rows = makeBets(count, 99)
const sort = ref<SortState | null>(null)
const grid = ref<VGridExposed>()
const target = ref(50_000)
/** 60 more columns, with column virtualization: only the ones in view render. */
const wide = ref(false)

const col = createColumnHelper<Bet>()
const base = [
  col({ key: 'id', header: '#', renderer: 'number', width: '7rem', sortable: true }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr', sortable: true }),
  col({ key: 'city', header: 'City', field: 'player.city', sortable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable: true }),
]
// worked-out figures, one column per week: no data needed
const weeks = Array.from({ length: 60 }, (_, i) =>
  col({
    key: `w${i + 1}`,
    header: `Week ${i + 1}`,
    renderer: 'number',
    width: '6.5rem',
    value: (b) => (b.id * 31 + (i + 1) * 17) % 1000,
  }),
)
const columns = computed(() =>
  wide.value
    ? [
        { ...base[0]!, pinned: 'left' as const },
        { ...base[1]!, width: '12rem' },
        ...base.slice(2),
        ...weeks,
      ]
    : base,
)
</script>

<template>
  <form class="demo-bar" @submit.prevent="grid?.scrollToRow(target)">
    <label
      >Bet #
      <input v-model.number="target" class="demo-input" type="number" min="1" :max="count" />
    </label>
    <button type="submit" class="vg-button">Jump</button>
    <label><input v-model="wide" type="checkbox" /> 60 more columns</label>
    <span class="demo-muted"
      >{{ count.toLocaleString('en-US') }} rows × {{ columns.length }} columns</span
    >
  </form>
  <!-- Only the rows (and with virtual-columns, the columns) in view are in the DOM. -->
  <VGrid
    ref="grid"
    v-model:sort="sort"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    :virtual="{ rowHeight: 40, overscan: 8 }"
    :virtual-columns="wide"
    aria-label="A hundred thousand bets"
  />
</template>
