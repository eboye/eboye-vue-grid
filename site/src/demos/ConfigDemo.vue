<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { createColumnHelper, VGrid, type GridParts, type RowKey } from '@nocopypaste/vue-grid'
// Ready-made language packs: each is bundled only when imported.
import { de } from '@nocopypaste/vue-grid/locales/de'
import { es } from '@nocopypaste/vue-grid/locales/es'
import { fr } from '@nocopypaste/vue-grid/locales/fr'
import { it } from '@nocopypaste/vue-grid/locales/it'
import { ja } from '@nocopypaste/vue-grid/locales/ja'
import { nl } from '@nocopypaste/vue-grid/locales/nl'
import { pl } from '@nocopypaste/vue-grid/locales/pl'
import { ptBR } from '@nocopypaste/vue-grid/locales/pt-BR'
import { sr } from '@nocopypaste/vue-grid/locales/sr'
import { srLatn } from '@nocopypaste/vue-grid/locales/sr-Latn'
import { makeBets, statusTones, type Bet } from '../data'

const rows = makeBets(80, 24)
const selected = ref<RowKey[]>([3])

// Built-in text: a pack, your own wording on top of one ({ ...de, total: 'Gesamt' }), or just the
// texts you need. App-wide in createVueGrid({ messages }), or per grid. `locale` is separate: it
// formats money, numbers and dates.
const languages = {
  en: { name: 'English', locale: 'en', messages: {} },
  de: { name: 'Deutsch', locale: 'de', messages: de },
  fr: { name: 'Français', locale: 'fr', messages: fr },
  es: { name: 'Español', locale: 'es', messages: es },
  it: { name: 'Italiano', locale: 'it', messages: it },
  ptBR: { name: 'Português (Brasil)', locale: 'pt-BR', messages: ptBR },
  nl: { name: 'Nederlands', locale: 'nl', messages: nl },
  pl: { name: 'Polski', locale: 'pl', messages: pl },
  ja: { name: '日本語', locale: 'ja', messages: ja },
  sr: { name: 'Српски', locale: 'sr', messages: sr },
  srLatn: {
    name: 'Srpski (latinica)',
    locale: 'sr-Latn',
    messages: { ...srLatn, total: 'Ukupan ulog' },
  },
}
const language = ref<keyof typeof languages>('de')
const messages = computed(() => languages[language.value].messages)
const locale = computed(() => languages[language.value].locale)

// Built-in parts: each is on unless set to false.
const parts = reactive<
  Required<
    Pick<GridParts, 'filterButtons' | 'resizeGrips' | 'headerDrag' | 'selectAll' | 'groupCounts'>
  >
>({
  filterButtons: true,
  resizeGrips: true,
  headerDrag: true,
  selectAll: true,
  groupCounts: true,
})
const labels: Record<keyof typeof parts, string> = {
  filterButtons: 'Filter funnels',
  resizeGrips: 'Resize grips',
  headerDrag: 'Header drag',
  selectAll: 'Select-all checkbox',
  groupCounts: 'Group counts',
}

const col = createColumnHelper<Bet>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable: true }),
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
    sortable: true,
    filterable: true,
    groupable: true,
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: statusTones },
    filterable: true,
    groupable: true,
  }),
  col({ key: 'stake', header: 'Stake', renderer: 'currency', sortable: true, aggregate: 'sum' }),
]
</script>

<template>
  <div class="demo-bar">
    <label
      >Language
      <select v-model="language" class="demo-input">
        <option v-for="(lang, code) in languages" :key="code" :value="code">
          {{ lang.name }}
        </option>
      </select>
    </label>
    <label v-for="(label, name) in labels" :key="name">
      <input v-model="parts[name]" type="checkbox" /> {{ label }}
    </label>
  </div>
  <VGrid
    v-model:selected="selected"
    class="demo-tall"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    selectable
    filter-row
    totals
    :pagination="{ pageSizes: [10, 25] }"
    :page-size="10"
    :status-bar="{ summary: ['stake'] }"
    :messages="messages"
    :locale="locale"
    :parts="parts"
    aria-label="Bets"
  />
</template>
