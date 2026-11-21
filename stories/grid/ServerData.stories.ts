import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import {
  VGridSearch,
  createColumnHelper,
  currencyRenderer,
  dateRenderer,
  matchesFilter,
  statusRenderer,
  type DataSource as GridDataSource,
  type FilterOption,
  type GridQuery,
} from '@eboye/vue-grid'
import { makeBets, statusTones, type Bet } from '../data'
import { Grid as VGrid, type GridArgs } from '../support'

/** A fake REST backend: filters, searches, sorts and pages 500 bets with ~400 ms latency. */
function createFakeApi() {
  const db = makeBets(500, 21)
  const log = ref<{ id: number; query: string; status: 'pending' | 'ok' | 'aborted' | 'error'; rows?: number }[]>([])
  let failNext = false
  let seq = 0
  const get = (row: Bet, key: string) =>
    key === 'player' ? row.player.name : key === 'city' ? row.player.city : (row as unknown as Record<string, unknown>)[key]

  const source: GridDataSource<Bet> = (query, { signal }) => {
    const entry = { id: ++seq, query: describe(query), status: 'pending' as const }
    log.value = [entry, ...log.value].slice(0, 8)
    const set = (status: 'ok' | 'aborted' | 'error', rows?: number) =>
      (log.value = log.value.map((e) => (e.id === entry.id ? { ...e, status, rows } : e)))
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (failNext) {
          failNext = false
          set('error')
          return reject(new Error('500 Internal Server Error'))
        }
        let rows = db.filter((row) =>
          Object.entries(query.filters.columns).every(([key, filter]) => matchesFilter(get(row, key), filter)),
        )
        const q = query.filters.search?.trim().toLowerCase()
        if (q) rows = rows.filter((r) => `${r.player.name} ${r.player.city}`.toLowerCase().includes(q))
        if (query.sort) {
          const { key, dir } = query.sort
          rows = [...rows].sort((a, b) => {
            const x = get(a, key) as string | number
            const y = get(b, key) as string | number
            return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1)
          })
        }
        const total = rows.length
        if (query.pageSize) rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
        set('ok', rows.length)
        resolve({ rows, total })
      }, 400)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        set('aborted')
      })
    })
  }

  /** Distinct cities from the "server", searched server-side. */
  const cityOptions = async (search: string, { signal }: { signal: AbortSignal }): Promise<FilterOption[]> => {
    await new Promise((r, reject) => {
      const t = setTimeout(r, 300)
      signal.addEventListener('abort', () => {
        clearTimeout(t)
        reject(new DOMException('aborted', 'AbortError'))
      })
    })
    const counts = new Map<string, number>()
    for (const row of db) counts.set(row.player.city, (counts.get(row.player.city) ?? 0) + 1)
    return [...counts]
      .filter(([city]) => city.toLowerCase().includes(search.toLowerCase()))
      .map(([city, count]) => ({ value: city, count }))
  }

  return { source, log, cityOptions, failNextRequest: () => (failNext = true) }
}

function describe(q: GridQuery) {
  const parts = [`page ${q.page}${q.pageSize ? `/${q.pageSize}` : ''}`]
  if (q.sort) parts.push(`sort ${q.sort.key} ${q.sort.dir}`)
  for (const [key, f] of Object.entries(q.filters.columns)) parts.push(`${key}: ${JSON.stringify(f).replace(/"/g, '')}`)
  if (q.filters.search) parts.push(`search "${q.filters.search}"`)
  return parts.join(' · ')
}

/**
 * **`data-source`**: the grid calls your async function with the current query — sort, column
 * filters, quick search, page — whenever it changes, and shows what comes back. Superseded requests
 * are aborted (`signal`), late answers ignored, loading and errors handled (with Retry), and a new
 * sort / filter jumps back to page 1. Value lists can load their options from the backend too.
 *
 * Prefer your own fetching (a store, GraphQL…)? Listen to **`@query-change`** instead and pass `rows`.
 */
const meta = {
  title: 'Grid/Server data',
  component: VGrid,
  args: { columns: [], rowKey: 'id', ariaLabel: 'Bets from the server', onQueryChange: fn(), onLoadError: fn() },
  argTypes: { rows: { control: false }, columns: { control: false } },
} satisfies Meta<GridArgs>

export default meta
type Story = StoryObj<typeof meta>

export const DataSource: Story = {
  render: (args) => ({
    components: { VGrid, VGridSearch },
    setup() {
      const api = createFakeApi()
      const bet = createColumnHelper<Bet>()
      const columns = [
        bet({ key: 'id', header: '#', width: 'min-content', sortable: true }),
        bet({ key: 'player', header: 'Player', field: 'player.name', width: 'minmax(10rem, 1fr)', sortable: true, filterable: true }),
        bet({ key: 'city', header: 'City', field: 'player.city', filterable: true, filter: { type: 'set', options: api.cityOptions } }),
        bet({ key: 'status', header: 'Status', renderer: statusRenderer, rendererOptions: { tone: statusTones }, filterable: true, filter: { type: 'set', options: ['Won', 'Lost', 'Open', 'Void'].map((value) => ({ value })) } }),
        bet({ key: 'stake', header: 'Stake', renderer: currencyRenderer, sortable: true, filterable: true }),
        bet({ key: 'placedAt', header: 'Placed', renderer: dateRenderer, sortable: true }),
      ]
      return { args, api, columns }
    },
    template: `
      <div class="sb-stack">
        <div class="sb-frame">
          <VGrid v-bind="args" :columns="columns" :data-source="api.source" filter-row :pagination="{ pageSizes: [10, 25, 50] }" :page-size="10">
            <template #toolbar>
              <VGridSearch placeholder="Search player or city…" />
              <button class="sb-btn" type="button" data-testid="fail" @click="api.failNextRequest()">Fail next request</button>
            </template>
          </VGrid>
        </div>
        <section>
          <strong>Requests (newest first)</strong>
          <ol class="sb-log" data-testid="requests">
            <li v-for="r in api.log.value" :key="r.id" :data-status="r.status">
              <code>#{{ r.id }} {{ r.status }}{{ r.rows !== undefined ? ' → ' + r.rows + ' rows' : '' }}</code> — {{ r.query }}
            </li>
          </ol>
        </section>
      </div>`,
  }),
}

/** `@query-change` only: the app fetches by itself and passes `rows` (shown here with a tiny fetch). */
export const QueryChangeEvent: Story = {
  render: (args) => ({
    components: { VGrid },
    setup() {
      const db = makeBets(40, 5)
      const rows = ref<Bet[]>(db)
      const last = ref('')
      const bet = createColumnHelper<Bet>()
      const columns = [
        bet({ key: 'id', header: '#', width: 'min-content', sortable: true }),
        bet({ key: 'player', header: 'Player', field: 'player.name', width: '1fr', sortable: true, filterable: true }),
        bet({ key: 'stake', header: 'Stake', renderer: currencyRenderer, sortable: true, filterable: true }),
      ]
      function onQuery(q: GridQuery) {
        last.value = describe(q)
        let r = db.filter((row) => Object.entries(q.filters.columns).every(([k, f]) => matchesFilter(k === 'player' ? row.player.name : row.stake, f)))
        if (q.sort) {
          const { key, dir } = q.sort
          const val = (b: Bet) => (key === 'player' ? b.player.name : key === 'stake' ? b.stake : b.id)
          r = [...r].sort((a, b) => (val(a) < val(b) ? -1 : 1) * (dir === 'asc' ? 1 : -1))
        }
        rows.value = r
      }
      return { args, rows, columns, onQuery, last }
    },
    template: `
      <p class="sb-note" data-testid="last-query">last query: {{ last }}</p>
      <div class="sb-frame">
        <VGrid v-bind="args" :rows="rows" :columns="columns" sort-mode="controlled" filter-mode="controlled" filter-row @query-change="onQuery" />
      </div>`,
  }),
}
