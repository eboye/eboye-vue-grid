import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import type { DataSource, GridQuery } from '../src/composables/useDataSource'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  score: number
}
const all: Row[] = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  score: (i * 7) % 10,
}))
const columns = [
  { key: 'name', sortable: true, filterable: true },
  { key: 'score', sortable: true, filterable: true },
]
const shownIds = (w: ReturnType<typeof mount>) =>
  w.findAll('.vg-row').map((r) => Number(r.attributes('data-row-key')))

/** A fake backend that records queries and serves pages of `all`. */
function backend(delay = 0) {
  const queries: GridQuery[] = []
  const signals: AbortSignal[] = []
  const source: DataSource<Row> = async (query, { signal }) => {
    queries.push(JSON.parse(JSON.stringify(query)))
    signals.push(signal)
    if (delay) await new Promise((r) => setTimeout(r, delay))
    let rows = all
    const name = query.filters.columns.name
    if (name?.type === 'text' && name.value) rows = rows.filter((r) => r.name.includes(name.value!))
    if (query.sort)
      rows = [...rows].sort(
        (a, b) =>
          (a[query.sort!.key as 'score'] - b[query.sort!.key as 'score']) *
          (query.sort!.dir === 'asc' ? 1 : -1),
      )
    const total = rows.length
    if (query.pageSize)
      rows = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
    return { rows, total }
  }
  return { source, queries, signals }
}

describe('dataSource (server rows)', () => {
  it('loads on mount with the initial query and shows the returned rows', async () => {
    const api = backend()
    const w = mount(VGrid, { props: { dataSource: api.source, columns, rowKey: 'id' } })
    await flushPromises()
    expect(api.queries).toEqual([
      { sort: null, filters: { columns: {}, search: '' }, page: 1, pageSize: null },
    ])
    expect(shownIds(w)).toHaveLength(23)
  })

  it('sortField: the query says what the backend sorts by; v-model:sort keeps the column key', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: {
        dataSource: api.source,
        columns: columns.map((c) => (c.key === 'score' ? { ...c, sortField: 'SCORE_TOTAL' } : c)),
        rowKey: 'id',
        multiSort: true,
      },
    })
    await flushPromises()
    await w.find('[data-col-key="score"] .vg-sort').trigger('click')
    await flushPromises()
    const last = api.queries.at(-1)!
    expect(last.sort).toEqual({ key: 'score', dir: 'asc', field: 'SCORE_TOTAL' })
    expect(last.sorts).toEqual([{ key: 'score', dir: 'asc', field: 'SCORE_TOTAL' }])
    expect(w.emitted('update:sort')!.at(-1)).toEqual([{ key: 'score', dir: 'asc' }])
  })

  it('sort and filter changes go to the backend; the grid does not sort or filter itself; page resets', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: { dataSource: api.source, columns, rowKey: 'id', pagination: true, pageSize: 5 },
    })
    await flushPromises()
    expect(api.queries.at(-1)).toMatchObject({ page: 1, pageSize: 5 })
    await vi.dynamicImportSettled() // the pagination bar is loaded on demand
    await flushPromises()
    expect(w.find('.vg-grid-pagination').exists()).toBe(true)

    await w.setProps({ page: 3 })
    await flushPromises()
    expect(api.queries.at(-1)).toMatchObject({ page: 3 })
    expect(shownIds(w)).toEqual([11, 12, 13, 14, 15])

    await w.find('[data-col-key="score"] .vg-sort').trigger('click')
    await flushPromises()
    const last = api.queries.at(-1)!
    expect(last.sort).toEqual({ key: 'score', dir: 'asc', field: 'score' })
    expect(last.page).toBe(1) // new sort → first page
    expect(w.emitted('update:page')!.at(-1)).toEqual([1])

    ;(w.vm as unknown as VGridExposed).setFilters({
      columns: { name: { type: 'text', op: 'contains', value: 'Row 2' } },
    })
    await flushPromises()
    expect(api.queries.at(-1)!.filters.columns.name).toEqual({
      type: 'text',
      op: 'contains',
      value: 'Row 2',
    })
  })

  it('cancels superseded requests and ignores late responses', async () => {
    const queries: string[] = []
    const signals: AbortSignal[] = []
    const resolvers: (() => void)[] = []
    const source: DataSource<Row> = (query, { signal }) => {
      queries.push(query.filters.search ?? '')
      signals.push(signal)
      const rows = query.filters.search === 'slow' ? [all[0]!] : [all[1]!]
      return new Promise((resolve) => resolvers.push(() => resolve({ rows })))
    }
    const w = mount(VGrid, {
      props: {
        dataSource: source,
        columns,
        rowKey: 'id',
        filters: { columns: {}, search: 'slow' },
      },
    })
    await nextTick()
    await w.setProps({ filters: { columns: {}, search: 'fast' } })
    await nextTick()
    expect(signals[0]!.aborted).toBe(true)
    resolvers[1]!() // the newer request answers first
    await flushPromises()
    resolvers[0]!() // the stale one answers late
    await flushPromises()
    expect(shownIds(w)).toEqual([2])
  })

  it('reports errors, shows Retry, and recovers', async () => {
    let fail = true
    const source = vi.fn<DataSource<Row>>(async () => {
      if (fail) throw new Error('boom')
      return { rows: all.slice(0, 2) }
    })
    const w = mount(VGrid, { props: { dataSource: source, columns, rowKey: 'id' } })
    await flushPromises()
    expect(w.emitted('load-error')![0]![0]).toBeInstanceOf(Error)
    expect(w.find('.vg-load-error').text()).toContain("Couldn't load")
    fail = false
    await w.find('.vg-load-error button').trigger('click')
    await flushPromises()
    expect(shownIds(w)).toEqual([1, 2])
  })

  it('a failed request with rows on screen keeps them and shows a notice with Retry', async () => {
    let fail = false
    const source = vi.fn<DataSource<Row>>(async (query) => {
      if (fail) throw new Error('boom')
      return { rows: all.slice(0, query.sort ? 3 : 2) }
    })
    const w = mount(VGrid, {
      props: { dataSource: source, columns, rowKey: 'id' },
    })
    await flushPromises()
    expect(w.find('.vg-load-error-banner').exists()).toBe(false)

    fail = true
    await w.setProps({ sort: { key: 'score', dir: 'asc' } })
    await flushPromises()
    expect(w.emitted('load-error')).toHaveLength(1)
    expect(shownIds(w)).toEqual([1, 2]) // the rows from before stay
    const banner = w.find('.vg-load-error-banner')
    expect(banner.attributes('role')).toBe('alert')
    expect(banner.text()).toContain("Couldn't load")
    expect(w.find('.vg-load-error').exists()).toBe(false) // not the empty-state message

    fail = false
    await banner.find('button').trigger('click')
    await flushPromises()
    expect(w.find('.vg-load-error-banner').exists()).toBe(false)
    expect(shownIds(w)).toEqual([1, 2, 3])
  })

  it('the notice goes away when the next query succeeds', async () => {
    let fail = false
    const source: DataSource<Row> = async () => {
      if (fail) throw new Error('boom')
      return { rows: all.slice(0, 2) }
    }
    const w = mount(VGrid, {
      props: { dataSource: source, columns, rowKey: 'id' },
    })
    await flushPromises()
    fail = true
    await w.setProps({ sort: { key: 'score', dir: 'asc' } })
    await flushPromises()
    expect(w.find('.vg-load-error-banner').exists()).toBe(true)
    fail = false
    await w.setProps({ sort: { key: 'score', dir: 'desc' } })
    await flushPromises()
    expect(w.find('.vg-load-error-banner').exists()).toBe(false)
  })

  it('patchLoadedRows patches server rows', async () => {
    const api = backend()
    const w = mount(VGrid, { props: { dataSource: api.source, columns, rowKey: 'id' } })
    await flushPromises()
    expect((w.vm as unknown as VGridExposed).patchLoadedRows([{ id: 3, name: 'Patched' }])).toBe(1)
    await nextTick()
    expect(w.find('[data-row-key="3"] > [data-col-key="name"]').text()).toBe('Patched')
  })
})

describe('query-change and client pagination', () => {
  it('emits the combined query on mount and on changes, deduplicated', async () => {
    const w = mount(VGrid, { props: { rows: all, columns, rowKey: 'id', sortMode: 'controlled' } })
    await nextTick()
    expect(w.emitted('query-change')).toHaveLength(1)
    await w.find('[data-col-key="name"] .vg-sort').trigger('click')
    await nextTick()
    expect((w.emitted('query-change') as GridQuery[][]).at(-1)![0]!.sort).toEqual({
      key: 'name',
      dir: 'asc',
      field: 'name',
    })
    const count = w.emitted('query-change')!.length
    ;(w.vm as unknown as VGridExposed).setFilters({ columns: {}, search: '' }) // same as before
    await nextTick()
    expect(w.emitted('query-change')).toHaveLength(count)
  })

  it('client pagination slices the filtered rows and keeps the page in range', async () => {
    const w = mount(VGrid, {
      props: {
        rows: all,
        columns,
        rowKey: 'id',
        pagination: { pageSizes: [5, 10] },
        pageSize: 10,
        page: 3,
      },
    })
    expect(shownIds(w)).toEqual([21, 22, 23])
    ;(w.vm as unknown as VGridExposed).setFilters({
      columns: { name: { type: 'text', op: 'contains', value: 'Row 1' } },
    })
    await nextTick()
    await nextTick()
    // "Row 1", "Row 10".."Row 19" → 11 rows → page 1 (the filter reset the page)
    expect(w.emitted('update:page')!.at(-1)).toEqual([1])
  })
})
