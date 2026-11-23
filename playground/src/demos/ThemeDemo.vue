<script setup lang="ts">
import { ref } from 'vue'
import { createColumnHelper, VGrid, type Density } from '@nocopypaste/vue-grid'
import { makeBets, type Bet } from '../data'

const rows = makeBets(5, 21)
const density = ref<Density>('cozy')

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'player', header: 'Player', field: 'player.name', sortable: true, width: '1fr' }),
  col({ key: 'status', header: 'Status', renderer: 'status', rendererOptions: { tone: { Won: 'success', Lost: 'danger' } } }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'rating', header: 'Rating', renderer: 'rating', rendererOptions: { readonly: true } }),
]
</script>

<template>
  <section id="theme" class="pg-card" data-demo="theme">
    <h2>Theming with CSS variables</h2>
    <p>
      The right grid sets a handful of <code>--vg-*</code> tokens in plain CSS (<code>.pg-brand</code>). The left uses
      Tailwind-style utility classes via the <code>ui</code> prop.
    </p>
    <div class="pg-row">
      <label>Density
        <select v-model="density" data-testid="density">
          <option value="compact">compact</option>
          <option value="cozy">cozy</option>
          <option value="comfortable">comfortable</option>
        </select>
      </label>
    </div>
    <div style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr))">
      <VGrid
        :rows="rows"
        :columns="columns"
        row-key="id"
        :density="density"
        :ui="{ headerCell: 'pg-utility-header' }"
        aria-label="Default theme"
        data-testid="default-grid"
      />
      <div class="pg-brand">
        <VGrid :rows="rows" :columns="columns" row-key="id" :density="density" aria-label="Brand theme" data-testid="brand-grid" />
      </div>
    </div>
  </section>
</template>

<style>
/* Stand-in for a Tailwind utility (e.g. `italic`): unlayered, so it beats the grid's layer. */
.pg-utility-header {
  font-style: italic;
}
</style>
