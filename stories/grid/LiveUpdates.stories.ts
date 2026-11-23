import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { onBeforeUnmount, reactive, ref, shallowRef } from 'vue'
import { createColumnHelper, patchRows } from '@nocopypaste/vue-grid'
import { makeBets, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

const bet = createColumnHelper<Bet>()
const columns = [
  bet({ key: 'id', header: '#', width: 'min-content' }),
  bet({ key: 'player', header: 'Player', field: 'player.name', width: '1fr' }),
  bet({
    key: 'city',
    header: 'City (enriched later)',
    field: 'player.city',
    rendererOptions: { placeholder: 'loading…' },
  }),
  bet({ key: 'stake', header: 'Stake', renderer: 'currency' }),
  bet({ key: 'change', header: 'Δ odds', renderer: 'change' }),
]

/**
 * Updating part of the data re-renders only what changed — the grid never rebuilds the table.
 *
 * - **Immutable** (`shallowRef` + `patchRows`): patched rows become new objects, all others keep
 *   their identity, so only the patched rows' cells re-render. Best for large lists.
 * - **Reactive** (`reactive()` / `ref()` rows): assign the field (`row.stake = 12`); only that one
 *   cell re-renders.
 * - **Lazy children** (`loadSubRows`): they live in the grid's cache — use `grid.patchLoadedRows(patches)`.
 *
 * `flash` briefly highlights changed cells (CSS animation; tokens `--vg-flash-*`). `'direction'`
 * tints numbers green when they rise and red when they fall. Switch it in Controls.
 */
const meta = {
  title: 'Grid/Live updates',
  component: VGrid,
  args: { rows: [], columns, rowKey: 'id', ariaLabel: 'Bets', flash: 'direction' },
  argTypes: {
    rows: { control: false },
    columns: { control: false },
    flash: { control: 'inline-radio', options: [false, true, 'direction'] },
  },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

const withoutCities = () =>
  makeBets(12, 9).map((b) => ({ ...b, player: { ...b.player, city: '' } }))

/**
 * Cities arrive later from another (fake) service and are patched in by id. Press **Enrich** to
 * load the next batch; each changed row is a new object, every other row is untouched.
 */
export const Enrichment: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const source = makeBets(12, 9)
      const rows = shallowRef<Bet[]>(withoutCities())
      const batch = ref(0)
      function enrich() {
        const from = batch.value * 4
        const patches = source.slice(from, from + 4).map((b) => ({ id: b.id, player: b.player }))
        rows.value = patchRows(rows.value, patches, 'id')
        batch.value++
      }
      const reset = () => {
        rows.value = withoutCities()
        batch.value = 0
      }
      return { args, rows, enrich, reset, batch }
    },
    template: `
      <div class="sb-row">
        <button class="sb-btn" data-testid="enrich" :disabled="batch >= 3" @click="enrich">Enrich next 4 rows</button>
        <button class="sb-btn" data-testid="reset" @click="reset">Reset</button>
      </div>
      <VGrid v-bind="args" :rows="rows" />`,
  }),
}

/** A live feed: every 800 ms a few random rows get a new stake and odds change via `patchRows`. */
export const LiveTicker: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const rows = shallowRef<Bet[]>(makeBets(12, 4))
      const running = ref(true)
      let seed = 1
      const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
      const timer = setInterval(() => {
        if (!running.value) return
        const patches = Array.from({ length: 3 }, () => {
          const row = rows.value[Math.floor(rand() * rows.value.length)]!
          return {
            id: row.id,
            stake: Math.round((row.stake + (rand() - 0.5) * 40) * 100) / 100,
            change: Math.round((rand() - 0.5) * 100) / 10,
          }
        })
        rows.value = patchRows(rows.value, patches, 'id')
      }, 800)
      onBeforeUnmount(() => clearInterval(timer))
      return { args, rows, running }
    },
    template: `
      <div class="sb-row">
        <button class="sb-btn" data-testid="toggle" @click="running = !running">{{ running ? 'Pause' : 'Resume' }}</button>
      </div>
      <VGrid v-bind="args" :rows="rows" />`,
  }),
}

/** Reactive rows: assigning a field updates exactly that cell. */
export const ReactiveRows: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const rows = reactive(makeBets(8, 2))
      const bump = () => {
        rows[2]!.stake = Math.round((rows[2]!.stake + 10) * 100) / 100
      }
      return { args, rows, bump }
    },
    template: `
      <div class="sb-row">
        <button class="sb-btn" data-testid="bump" @click="bump">rows[2].stake += 10</button>
      </div>
      <VGrid v-bind="args" :rows="rows" />`,
  }),
}
