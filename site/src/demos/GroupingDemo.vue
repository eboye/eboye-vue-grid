<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type RowKey } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(240, 5)
const groupBy = ref<string[]>(['status'])
const selected = ref<RowKey[]>([])

// `groupable` adds Group by / Ungroup to the header menu; `aggregate` fills the group rows.
const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({
    key: 'player',
    header: 'Player',
    field: 'player.name',
    width: 'minmax(10rem, 1fr)',
    sortable: true,
  }),
  col({ key: 'city', header: 'City', field: 'player.city', sortable: true, groupable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    sortable: true,
    groupable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, aggregate: 'sum' }),
  col({ key: 'change', header: 'Δ odds', renderer: 'change', sortable: true, aggregate: 'avg' }),
  col({
    key: 'placedAt',
    header: 'Placed',
    renderer: 'date',
    sortable: true,
    aggregate: 'max',
    groupable: true,
    groupValue: (row) => row.placedAt.slice(0, 7), // one group per month
  }),
]

const options = [
  ['status', 'Status'],
  ['city', 'City'],
  ['placedAt', 'Month'],
] as const
const toggle = (key: string) =>
  (groupBy.value = groupBy.value.includes(key)
    ? groupBy.value.filter((k) => k !== key)
    : [...groupBy.value, key])
</script>

<template>
  <VGrid
    v-model:group-by="groupBy"
    v-model:selected="selected"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    selectable
    totals
    aria-label="Bets"
  >
    <template #toolbar>
      <span class="demo-muted">Group by</span>
      <button
        v-for="[key, label] in options"
        :key="key"
        type="button"
        class="vg-button"
        :class="{ 'vg-button-ghost': !groupBy.includes(key) }"
        :aria-pressed="groupBy.includes(key)"
        @click="toggle(key)"
      >
        {{ label }}
      </button>
    </template>
  </VGrid>
  <p class="demo-log">
    v-model:group-by = {{ JSON.stringify(groupBy) }} · {{ selected.length }} rows selected
  </p>
</template>
