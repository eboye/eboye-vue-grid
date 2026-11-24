<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type RowKey } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = ref<Bet[]>(makeBets(40, 4))
const selected = ref<RowKey[]>([])

const remove = (keys: readonly RowKey[]) =>
  (rows.value = rows.value.filter((r) => !keys.includes(r.id)))
const reset = () => (rows.value = makeBets(40, 4))

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr', sortable: true }),
  col({ key: 'city', header: 'City', field: 'player.city', sortable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    sortable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
]
</script>

<template>
  <!-- prune-selection: deleted rows leave the selection by themselves. -->
  <VGrid
    v-model:selected="selected"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    selectable
    prune-selection
    :is-row-selectable="(row) => row.status !== 'Void'"
    aria-label="Bets"
  >
    <template #toolbar="{ selected: keys, selectedCount, clearSelection }">
      <template v-if="selectedCount">
        <strong>{{ selectedCount }} selected</strong>
        <button type="button" class="vg-button" @click="remove(keys)">Delete</button>
        <button type="button" class="vg-button vg-button-ghost" @click="clearSelection()">
          Clear
        </button>
      </template>
      <span v-else class="demo-muted">Tick a row, then shift-click another.</span>
      <span class="demo-spacer" />
      <button type="button" class="vg-button vg-button-ghost" @click="reset">Reset rows</button>
    </template>
  </VGrid>
  <p class="demo-log">v-model:selected = [{{ selected.join(', ') }}]</p>
</template>
