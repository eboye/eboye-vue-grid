import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'
import { allFeatures } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { DataSource, GridQuery } from '../src/composables/useDataSource'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  status: string
  city: string
  stake: number
}
const all: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  status: ['Won', 'Lost', 'Open'][i % 3]!,
  city: ['Niš', 'Beograd'][i % 2]!,
  stake: i + 1,
}))
const columns = [
  { key: 'id', header: '#' },
  { key: 'status', header: 'Status', groupable: true },
  { key: 'city', header: 'City', groupable: true },
  { key: 'stake', header: 'Stake', aggregate: 'sum' },
]

/** A fake backend that groups like a server: counts, sums, paging of top-level groups. */
function backend(opts: { failOn?: (q: GridQuery) => boolean; ignoreGrouping?: boolean } = {}) {
  const queries: GridQuery[] = []
  const source: DataSource<Row> = async (q) => {
    queries.push(JSON.parse(JSON.stringify(q)))
    if (opts.failOn?.(q)) throw new Error('boom')
    let rows = all
    const city = q.filters.columns.city
    if (city?.type === 'text') rows = rows.filter((r) => r.city === city.value)
    if (!q.groupBy || opts.ignoreGrouping) return { rows, total: rows.length }
    for (const p of q.groupPath ?? []) rows = rows.filter((r) => r[p.key as keyof Row] === p.value)
    const level = (q.groupPath ?? []).length
    if (level === q.groupBy.length) return { rows }
    const key = q.groupBy[level] as keyof Row
    const values = [...new Set(rows.map((r) => r[key]))].sort()
    if (q.sort?.key === key && q.sort.dir === 'desc') values.reverse()
    let groups = values.map((value) => {
      const inGroup = rows.filter((r) => r[key] === value)
      return {
        value,
        count: inGroup.length,
        aggregates: { stake: inGroup.reduce((n, r) => n + r.stake, 0) },
      }
    })
    const total = groups.length
    if (level === 0 && q.pageSize)
      groups = groups.slice((q.page - 1) * q.pageSize, q.page * q.pageSize)
    return { groups, total, rowTotal: rows.length }
  }
  return { source, queries }
}

const groupRows = (w: ReturnType<typeof mount>) =>
  w.findAll('.vg-rowgroup').map((r) => ({
    level: Number(r.attributes('data-group-level')),
    text: r.find('.vg-rowgroup-label').text(),
  }))
const dataRows = (w: ReturnType<typeof mount>) =>
  w.findAll('.vg-row:not(.vg-rowgroup)').map((r) => Number(r.attributes('data-row-key')))
const expand = async (w: ReturnType<typeof mount>, text: string) => {
  const row = w
    .findAll('.vg-rowgroup')
    .find((r) => r.find('.vg-rowgroup-label').text().includes(text))!
  await row.find('[aria-label="Expand group"], [aria-label="Collapse group"]').trigger('click')
  await flushPromises()
}

describe('row grouping with server data', () => {
  it('asks the server for the top-level groups and shows them with its counts and sums', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: { dataSource: api.source, columns, rowKey: 'id', groupBy: ['status', 'city'] },
    })
    await flushPromises()
    expect(api.queries[0]).toMatchObject({ groupBy: ['status', 'city'], groupPath: [] })
    expect(groupRows(w)).toEqual([
      { level: 0, text: expect.stringMatching(/Lost\s*10/) },
      { level: 0, text: expect.stringMatching(/Open\s*10/) },
      { level: 0, text: expect.stringMatching(/Won\s*10/) },
    ])
    expect(dataRows(w)).toEqual([]) // no rows until a group opens
    // the server's sum, in the Stake column of the "Won" group: 1+4+…+28
    const won = w.findAll('.vg-rowgroup').find((r) => r.text().includes('Won'))!
    expect(won.find('[data-col-key="stake"]').text()).toBe('145')
  })

  it('expanding loads the sub-groups, then the last level’s rows; each level once', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: { dataSource: api.source, columns, rowKey: 'id', groupBy: ['status', 'city'] },
    })
    await flushPromises()
    await expand(w, 'Won')
    expect(api.queries.at(-1)).toMatchObject({
      groupBy: ['status', 'city'],
      groupPath: [{ key: 'status', value: 'Won' }],
      page: 1,
      pageSize: null,
    })
    expect(
      groupRows(w)
        .filter((g) => g.level === 1)
        .map((g) => g.text),
    ).toEqual([expect.stringMatching(/Beograd\s*5/), expect.stringMatching(/Niš\s*5/)])
    await expand(w, 'Niš')
    expect(api.queries.at(-1)!.groupPath).toEqual([
      { key: 'status', value: 'Won' },
      { key: 'city', value: 'Niš' },
    ])
    expect(dataRows(w)).toEqual([1, 7, 13, 19, 25])
    // collapse and open again: no new request
    const count = api.queries.length
    await expand(w, 'Won') // collapses
    const won = w.findAll('.vg-rowgroup').find((r) => r.text().includes('Won'))!
    await won.find('[aria-label="Expand group"]').trigger('click')
    await flushPromises()
    expect(api.queries.length).toBe(count)
    expect(dataRows(w)).toEqual([1, 7, 13, 19, 25])
  })

  it('a group that fails to load shows the error with Retry', async () => {
    let fail = true
    const api = backend({ failOn: (q) => fail && (q.groupPath?.length ?? 0) > 0 })
    const w = mount(VGrid, {
      props: { dataSource: api.source, columns, rowKey: 'id', groupBy: ['status'] },
    })
    await flushPromises()
    await expand(w, 'Lost')
    expect(w.emitted('load-error')).toHaveLength(1)
    expect(w.find('.vg-status-error').text()).toContain('Could not load rows.')
    fail = false
    await w.find('.vg-status-error button').trigger('click')
    await flushPromises()
    expect(dataRows(w)).toEqual([2, 5, 8, 11, 14, 17, 20, 23, 26, 29])
  })

  it('a new sort or filter asks again, and open groups load their contents again', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: { dataSource: api.source, columns, rowKey: 'id', groupBy: ['status'] },
    })
    await flushPromises()
    await expand(w, 'Won')
    await w.setProps({
      filters: { columns: { city: { type: 'text', op: 'equals', value: 'Niš' } }, search: '' },
    })
    await flushPromises()
    await flushPromises()
    expect(api.queries.at(-1)!.groupPath).toEqual([{ key: 'status', value: 'Won' }])
    expect(api.queries.at(-1)!.filters.columns.city).toBeTruthy()
    expect(dataRows(w)).toEqual([1, 7, 13, 19, 25])
  })

  it('pagination pages the top-level groups', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: {
        dataSource: api.source,
        columns,
        rowKey: 'id',
        groupBy: ['status'],
        pagination: true,
        pageSize: 2,
      },
    })
    await flushPromises()
    expect(groupRows(w)).toHaveLength(2)
    await w.setProps({ page: 2 })
    await flushPromises()
    expect(groupRows(w).map((g) => g.text)).toEqual([expect.stringContaining('Won')])
  })

  it('a group’s checkbox selects it by query; rows inside show ticked and locked', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: {
        dataSource: api.source,
        columns,
        rowKey: 'id',
        groupBy: ['status'],
        selectable: true,
        statusBar: true,
        'onUpdate:selectedGroups': (v: unknown) => w.setProps({ selectedGroups: v }),
        'onUpdate:selected': (v: unknown) => w.setProps({ selected: v }),
      },
    })
    await flushPromises()
    await expand(w, 'Won')
    // tick a row first, then its group: the row counts through the group
    await w.find('[data-row-key="1"] input[type="checkbox"]').setValue(true)
    const won = () => w.findAll('.vg-rowgroup').find((r) => r.text().includes('Won'))!
    await won().find('input[type="checkbox"]').trigger('change')
    await flushPromises()
    expect(w.props('selectedGroups' as never)).toEqual([[{ key: 'status', value: 'Won' }]])
    expect(w.props('selected' as never)).toEqual([])
    const row4 = w.find('[data-row-key="4"] input[type="checkbox"]')
    expect((row4.element as HTMLInputElement).checked).toBe(true)
    expect((row4.element as HTMLInputElement).disabled).toBe(true)
    await vi.waitFor(() => expect(w.find('.vg-status-bar').text()).toContain('10 selected'))
    // the header checkbox: every top-level group
    await w.find('.vg-header input[type="checkbox"]').trigger('change')
    await flushPromises()
    expect(w.props('selectedGroups' as never)).toHaveLength(3)
    await vi.waitFor(() => expect(w.find('.vg-status-bar').text()).toContain('30 selected'))
    // a new filter: the groups mean something else now
    await w.setProps({
      filters: { columns: { city: { type: 'text', op: 'equals', value: 'Niš' } }, search: '' },
    })
    await flushPromises()
    expect(w.props('selectedGroups' as never)).toEqual([])
    // clearSelection clears them too
    await w.find('.vg-header input[type="checkbox"]').trigger('change')
    await flushPromises()
    ;(w.vm as unknown as VGridExposed).clearSelection()
    await flushPromises()
    expect(w.props('selectedGroups' as never)).toEqual([])
  })

  it('the status bar counts every matching row (rowTotal)', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: {
        dataSource: api.source,
        columns,
        rowKey: 'id',
        groupBy: ['status'],
        statusBar: true,
      },
    })
    await flushPromises()
    await vi.waitFor(() => expect(w.find('.vg-status-bar').text()).toBe('30 rows'))
  })

  it('exports the loaded rows of server groups', async () => {
    const api = backend()
    const w = mount(VGrid, {
      props: { dataSource: api.source, columns, rowKey: 'id', groupBy: ['status'] },
    })
    await flushPromises()
    await expand(w, 'Open')
    const csv = (w.vm as unknown as VGridExposed).getCsv({ columns: ['id'], header: false })
    expect(csv.split('\r\n').map(Number)).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30])
  })

  it('a server that ignores the grouping: the loaded rows are grouped, with a dev hint', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const api = backend({ ignoreGrouping: true })
    const w = mount(VGrid, {
      props: { dataSource: api.source, columns, rowKey: 'id', groupBy: ['status'] },
    })
    await flushPromises()
    expect(groupRows(w).map((g) => g.text)).toEqual([
      expect.stringMatching(/Lost\s*10/),
      expect.stringMatching(/Open\s*10/),
      expect.stringMatching(/Won\s*10/),
    ])
    expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain(
      'returned rows, not groups',
    )
    warn.mockRestore()
  })

  it('without grouping the query has no groupBy (servers see what they saw before)', async () => {
    const api = backend()
    mount(VGrid, { props: { dataSource: api.source, columns, rowKey: 'id' } })
    await flushPromises()
    expect(api.queries[0]).not.toHaveProperty('groupBy')
    expect(api.queries[0]).not.toHaveProperty('groupPath')
  })

  it('without serverGroupingFeature: no grouping in the query, the loaded rows grouped, a dev hint', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const api = backend()
    const w = mount(VGrid, {
      global: {
        plugins: [
          createVueGrid({
            renderers: allRenderers,
            features: allFeatures.filter((f) => f.feature !== 'serverGrouping'),
          }),
        ],
      },
      props: { dataSource: api.source, columns, rowKey: 'id', groupBy: ['status'] },
    })
    await flushPromises()
    expect(api.queries[0]).not.toHaveProperty('groupBy')
    expect(groupRows(w)).toHaveLength(3)
    expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain('serverGroupingFeature')
    warn.mockRestore()
  })
})
