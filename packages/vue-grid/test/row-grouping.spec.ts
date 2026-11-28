import { describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { groupRows, isRowGroup, pathKey, type RowGroup } from '../src/core/grouping'
import { sortingFeature } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { ColumnDef, VGridExposed } from '../src/types'
import { validateGridConfig } from '../src/agent'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  region: string | null
  status: string
  amount: number
}
const rows: Row[] = [
  { id: 1, name: 'Ana', region: 'North', status: 'Paid', amount: 10 },
  { id: 2, name: 'Bo', region: 'South', status: 'Open', amount: 5 },
  { id: 3, name: 'Cy', region: 'North', status: 'Open', amount: 7 },
  { id: 4, name: 'Di', region: null, status: 'Paid', amount: 1 },
  { id: 5, name: 'Ed', region: 'South', status: 'Paid', amount: 20 },
  { id: 6, name: 'Flo', region: 'North', status: 'Paid', amount: 3 },
]
const columns: ColumnDef<Row>[] = [
  { key: 'name', header: 'Name', sortable: true, filterable: true },
  { key: 'region', header: 'Region', groupable: true },
  { key: 'status', header: 'Status', groupable: true },
  { key: 'amount', header: 'Amount', renderer: 'number', aggregate: 'sum', sortable: true },
]

type Wrapper = ReturnType<typeof mount>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const label = (r: any) =>
  ['.vg-rowgroup-name', '.vg-rowgroup-value', '.vg-rowgroup-count']
    .map((s) => r.find(s).text())
    .join(' ')
/** Text of the top-level rows: group labels (`Region North 3`) or the name cell. */
const topLevel = (w: Wrapper) =>
  w
    .findAll('.vg > .vg-row')
    .map((r) => (r.classes('vg-rowgroup') ? label(r) : r.find('[data-col-key="name"]').text()))
const namesIn = (w: Wrapper, groupKey: string) =>
  w
    .findAll(
      `[data-subgrid-for="${CSS.escape(groupKey)}"] > .vg-row:not(.vg-rowgroup) > [data-col-key="name"]`,
    )
    .map((c) => c.text())
const groupRow = (w: Wrapper, label: string) =>
  w.findAll('.vg-rowgroup').find((r) => r.find('.vg-rowgroup-value').text() === label)!

it('exposes data rows only when both levels of their group are open', async () => {
  const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', groupBy: ['region', 'status'] } })
  try {
    const api = w.vm as unknown as VGridExposed<Row>
    expect(api.getVisibleRows()).toEqual([])
    await groupRow(w, 'North').get('button.vg-expander').trigger('click')
    expect(api.getVisibleRows()).toEqual([])
    await groupRow(w, 'Paid').get('button.vg-expander').trigger('click')
    expect(api.getVisibleRows().map((row) => row.id)).toEqual([1, 6])
  } finally {
    w.unmount()
  }
})

describe('groupRows', () => {
  const opts = { columns: [columns[1]!], allColumns: columns }

  it('keeps hierarchy tokens in group values and column keys distinct from path boundaries', () => {
    const parent = { key: 'a', value: 'one' }
    const child = { key: 'b', value: 'two' }
    expect(pathKey([{ key: 'a', value: 'one\u001eb=stwo' }])).not.toBe(pathKey([parent, child]))
    expect(pathKey([{ key: 'a', value: 'one=stwo' }])).not.toBe(
      pathKey([{ key: 'a=sone', value: 'two' }]),
    )
  })

  it('groups by value in value order, blank last, keeping row order inside', () => {
    const groups = groupRows(rows, opts)
    expect(groups.map((g) => g.value)).toEqual(['North', 'South', null])
    expect(groups[0]!.rows.map((r) => r.id)).toEqual([1, 3, 6])
    expect(groups.every(isRowGroup)).toBe(true)
    expect(isRowGroup(rows[0])).toBe(false)
  })

  it('orders groups descending when sorted descending by the grouped column', () => {
    const desc = groupRows(rows, { ...opts, sort: { key: 'region', dir: 'desc' } })
    expect(desc.map((g) => g.value)).toEqual(['South', 'North', null])
    const other = groupRows(rows, { ...opts, sort: { key: 'amount', dir: 'desc' } })
    expect(other.map((g) => g.value)).toEqual(['North', 'South', null])
  })

  it('nests by several columns, with unique keys and per-group aggregates', () => {
    const groups = groupRows(rows, { columns: [columns[1]!, columns[2]!], allColumns: columns })
    const north = groups[0]!
    expect(north.aggregates).toEqual({ amount: 20 })
    const sub = north.children as RowGroup<Row>[]
    expect(sub.map((g) => [g.value, g.level, g.rows.length, g.aggregates.amount])).toEqual([
      ['Open', 1, 1, 7],
      ['Paid', 1, 2, 13],
    ])
    const keys = [...groups, ...groups.flatMap((g) => g.children as RowGroup[])].map((g) => g.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(sub[1]!.children.map((r) => (r as Row).id)).toEqual([1, 6])
  })

  it('uses groupValue, and tells numbers, strings and dates apart', () => {
    const byInitial = groupRows(rows, {
      columns: [
        { key: 'name', groupValue: (r: Row) => (r.name[0]!.toLowerCase() < 'd' ? 'A–C' : 'D–Z') },
      ],
      allColumns: [],
    })
    expect(byInitial.map((g) => [g.value, g.rows.length])).toEqual([
      ['A–C', 3],
      ['D–Z', 3],
    ])
    const mixed = groupRows([{ v: 1 }, { v: '1' }, { v: new Date(0) }, { v: new Date(0) }], {
      columns: [{ key: 'v' }],
      allColumns: [],
    })
    expect(mixed.map((g) => g.rows.length).sort()).toEqual([1, 1, 2])
  })
})

describe('row grouping in the grid', () => {
  it('shows collapsed group rows with value, count and aggregates; expanding shows the rows', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', groupBy: 'region' } })
    expect(topLevel(w)).toEqual(['Region North 3', 'Region South 2', 'Region (blank) 1'])
    expect(w.find('.vg-subgrid').exists()).toBe(false)
    const north = groupRow(w, 'North')
    expect(north.find('[data-col-key="amount"]').text()).toBe('20')
    // the label spans the columns up to the next aggregate
    expect(north.find('.vg-rowgroup-cell').attributes('aria-colspan')).toBe('3')
    expect(north.attributes('aria-expanded')).toBe('false')

    await north.find('.vg-expander').trigger('click')
    const key = north.attributes('data-row-key')!
    expect(namesIn(w, key)).toEqual(['Ana', 'Cy', 'Flo'])
    expect(groupRow(w, 'North').attributes('aria-expanded')).toBe('true')
    // clicking the label toggles too
    await groupRow(w, 'North').find('.vg-rowgroup-label').trigger('click')
    expect(w.find('.vg-subgrid').exists()).toBe(false)
  })

  it('nests several levels; groups-expanded opens them all; expandAll / collapseAll', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', groupBy: ['region', 'status'], groupsExpanded: true },
    })
    const north = groupRow(w, 'North').attributes('data-row-key')!
    const levelTwo = w.findAll(`[data-subgrid-for="${CSS.escape(north)}"] > .vg-rowgroup`)
    expect(levelTwo.map((r) => label(r))).toEqual(['Status Open 1', 'Status Paid 2'])
    expect(levelTwo[0]!.attributes('data-depth')).toBe('1')
    expect(w.findAll('.vg-row:not(.vg-rowgroup)')).toHaveLength(6)

    const api = w.vm as unknown as VGridExposed
    api.collapseAll()
    await nextTick()
    expect(w.findAll('.vg-row:not(.vg-rowgroup)')).toHaveLength(0)
    api.expandAll()
    await nextTick()
    expect(w.findAll('.vg-row:not(.vg-rowgroup)')).toHaveLength(6)
  })

  it('groups the filtered, sorted rows', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        groupBy: 'region',
        groupsExpanded: true,
        sortMode: 'client',
        sort: { key: 'amount', dir: 'desc' },
      },
    })
    const north = groupRow(w, 'North').attributes('data-row-key')!
    expect(namesIn(w, north)).toEqual(['Ana', 'Cy', 'Flo'])
    await w.setProps({
      filters: { columns: { name: { type: 'text', op: 'contains', value: 'o' } }, search: '' },
    })
    expect(topLevel(w)).toEqual(['Region North 1', 'Region South 1'])
    expect(groupRow(w, 'North').find('[data-col-key="amount"]').text()).toBe('3')
  })

  it('a group checkbox selects its rows; partly selected groups are indeterminate', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', groupBy: 'region', selectable: true, selected: [3] },
    })
    const box = () => groupRow(w, 'North').find('.vg-cell-select input').element as HTMLInputElement
    expect(box().indeterminate).toBe(true)
    await groupRow(w, 'North').find('.vg-cell-select input').trigger('change')
    expect(w.emitted('update:selected')?.at(-1)?.[0]).toEqual(expect.arrayContaining([1, 3, 6]))
    await w.setProps({ selected: [1, 3, 6] })
    expect(box().checked).toBe(true)
    await groupRow(w, 'North').find('.vg-cell-select input').trigger('change')
    expect(w.emitted('update:selected')?.at(-1)?.[0]).toEqual([])
  })

  it('pages over the top-level groups', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', groupBy: 'region', pagination: true, pageSize: 2 },
    })
    expect(topLevel(w)).toEqual(['Region North 3', 'Region South 2'])
    await vi.dynamicImportSettled() // the pager is loaded on demand
    await flushPromises()
    expect(w.find('.vg-pagination-summary').text()).toBe('1–2 of 3') // it counts groups
  })

  it('virtual mode renders and expands groups', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', groupBy: 'region', virtual: { rowHeight: 32 } },
    })
    await flushPromises()
    expect(topLevel(w)).toEqual(['Region North 3', 'Region South 2', 'Region (blank) 1'])
    await groupRow(w, 'South').find('.vg-expander').trigger('click')
    await flushPromises()
    expect(namesIn(w, groupRow(w, 'South').attributes('data-row-key')!)).toEqual(['Bo', 'Ed'])
    expect(w.find('.vg-detail-row').exists()).toBe(false)
  })

  it('the header menu groups and ungroups groupable columns', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        'onUpdate:groupBy': (v: unknown) => w.setProps({ groupBy: v }),
      },
      attachTo: document.body,
    })
    const menu = async (key: string) => {
      w.find(`[role="columnheader"][data-col-key="${key}"]`).element.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 10,
          clientY: 10,
        }),
      )
      await flushPromises()
      return w.findAll('[role="menu"] [role="menuitem"]')
    }
    expect((await menu('name')).map((b) => b.text())).not.toContain('Group by Name')
    await (await menu('status')).find((b) => b.text() === 'Group by Status')!.trigger('click')
    await flushPromises()
    expect(w.emitted('update:groupBy')?.at(-1)).toEqual([['status']])
    expect(topLevel(w)).toEqual(['Status Open 2', 'Status Paid 4'])
    const items = (await menu('status')).map((b) => b.text())
    expect(items).toEqual(expect.arrayContaining(['Ungroup', 'Ungroup all']))
    await (await menu('status')).find((b) => b.text() === 'Ungroup')!.trigger('click')
    expect(w.emitted('update:groupBy')?.at(-1)).toEqual([[]])
    w.unmount()
  })

  it('without the feature group-by is ignored, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const saved = config.global.plugins
    config.global.plugins = [createVueGrid({ renderers: allRenderers })]
    try {
      const w = mount(VGrid, {
        props: { rows, columns, rowKey: 'id', groupBy: 'region', features: [sortingFeature] },
      })
      expect(w.find('.vg-rowgroup').exists()).toBe(false)
      expect(w.findAll('.vg-row')).toHaveLength(6)
      expect(warn.mock.calls.flat().join(' ')).toMatch(/rowGroupingFeature/)
    } finally {
      config.global.plugins = saved
      warn.mockRestore()
    }
  })
})

describe('validateGridConfig: group-by', () => {
  it('flags unknown group-by keys and the missing feature', () => {
    const r = validateGridConfig({
      rowKey: 'id',
      columns,
      features: ['sortingFeature'],
      sortMode: 'client',
      groupBy: ['regoin'],
    })
    expect(r.diagnostics.find((d) => d.path === 'props.groupBy[0]')).toMatchObject({
      severity: 'error',
      fix: expect.stringMatching(/`region`/),
    })
    expect(
      r.diagnostics.find((d) => d.path === 'props.groupBy' && d.severity === 'warning')?.fix,
    ).toMatch(/rowGroupingFeature/)
    const ok = validateGridConfig({
      rowKey: 'id',
      columns,
      features: ['allFeatures'],
      renderers: ['numberRenderer'],
      sortMode: 'client',
      groupBy: 'region',
    })
    expect(ok.diagnostics).toEqual([])
  })
})
