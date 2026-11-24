<script setup lang="ts">
import { computed, ref } from 'vue'
import { createColumnHelper, VGrid, type Density } from '@nocopypaste/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(8, 21)
const density = ref<Density>('cozy')
const accent = ref('#db2777')
const radius = ref(12)
const uppercase = ref(true)

// The grid's look is CSS variables in a cascade layer: set them anywhere, no !important.
const tokens = computed(() => ({
  '--vg-color-accent': accent.value,
  '--vg-color-focus-ring': accent.value,
  '--vg-color-header-text': `light-dark(color-mix(in srgb, ${accent.value} 75%, black), color-mix(in srgb, ${accent.value} 45%, white))`,
  '--vg-color-header-bg': `light-dark(color-mix(in srgb, ${accent.value} 7%, white), color-mix(in srgb, ${accent.value} 18%, #111827))`,
  '--vg-radius': `${radius.value}px`,
  '--vg-header-text-transform': uppercase.value ? 'uppercase' : 'none',
}))

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'player', header: 'Player', field: 'player.name', width: '1fr', sortable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true }),
  col({ key: 'rating', header: 'Rating', renderer: 'rating', rendererOptions: { readonly: true } }),
]
</script>

<template>
  <div class="demo-bar">
    <label>Accent <input v-model="accent" type="color" /></label>
    <label
      >Radius <input v-model.number="radius" type="range" min="0" max="24" /> {{ radius }}px</label
    >
    <label><input v-model="uppercase" type="checkbox" /> Uppercase headers</label>
    <label
      >Density
      <select v-model="density" class="demo-input">
        <option value="compact">compact</option>
        <option value="cozy">cozy</option>
        <option value="comfortable">comfortable</option>
      </select>
    </label>
  </div>
  <div class="demo-split">
    <div>
      <h2 class="demo-heading">Default theme</h2>
      <VGrid
        :rows="rows"
        :columns="columns"
        row-key="id"
        :density="density"
        sort-mode="client"
        aria-label="Default theme"
      />
    </div>
    <div :style="tokens">
      <h2 class="demo-heading">Your tokens</h2>
      <VGrid
        :rows="rows"
        :columns="columns"
        row-key="id"
        :density="density"
        sort-mode="client"
        aria-label="Custom theme"
      />
    </div>
  </div>
  <pre class="demo-csv" tabindex="0" aria-label="The CSS">{{
    Object.entries(tokens)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n')
  }}</pre>
</template>
