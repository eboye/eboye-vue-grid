import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import type { DataSource } from '../src/composables/useDataSource'
import type { StatusBarOptions, StatusBarScope } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  city: string
  stake: number
  children?: Row[]
}
const rows: Row[] = [
  { id: 1, name: 'Ana', city: 'Niš', stake: 10 },
  { id: 2, name: 'Marko', city: 'Beograd', stake: 20.5 },
  { id: 3, name: 'Jelena', city: 'Niš', stake: 1000 },
  { id: 4, name: 'Luka', city: 'Novi Sad', stake: 4 },
]
const columns = [
  { key: 'name', header: 'Player', filterable: true },
  { key: 'city', header: 'City', filterable: true },
  { key: 'stake', header: 'Stake', renderer: 'currency' },
]
const bar = (w: ReturnType<typeof mount>) => w.find('.vg-status-bar')
const mountGrid = async (props: Record<string, unknown>, slots?: Record<string, () => string>) => {
  const w = mount(VGrid, {
    props: { rows, columns, rowKey: 'id', locale: 'en-US', currency: 'EUR', ...props },
    slots,
  })
  await flushPromises()
  // The default content is its own chunk: wait for the first load.
  if (props.statusBar) await vi.waitFor(() => expect(bar(w).text()).not.toBe(''))
  return w
}

describe('status bar', () => {
  it('is off by default', async () => {
    const w = await mountGrid({})
    expect(bar(w).exists()).toBe(false)
  })

  it('counts the rows; with filters, "N of M rows" and Clear', async () => {
    const w = await mountGrid({ statusBar: true })
    expect(bar(w).attributes('role')).toBe('group')
    expect(bar(w).text()).toBe('4 rows')

    await w.setProps({
      filters: { columns: { city: { type: 'text', op: 'equals', value: 'Niš' } }, search: '' },
    })
    await flushPromises()
    expect(bar(w).text()).toContain('2 of 4 rows')
    expect(bar(w).text()).toContain('1 filter')

    await bar(w).find('button').trigger('click')
    await flushPromises()
    expect(bar(w).text()).toBe('4 rows')
    expect(w.emitted('update:filters')!.at(-1)![0]).toEqual({ columns: {}, search: '' })
  })

  it('counts shown tree rows beyond the virtual viewport and leaves detail panels out', async () => {
    const w = await mountGrid(
      {
        rows: [{ ...rows[0]!, children: rows.slice(1) }],
        subRows: (row: Row) => row.children,
        virtual: { rowHeight: 40, overscan: 0 },
        detailExpanded: [],
        statusBar: { rowCountMode: 'visible', fullyExpandedCount: 4 },
      },
      { detail: () => 'Row details' },
    )
    expect(bar(w).text()).toContain('1 row shown')
    expect(bar(w).text()).toContain('4 fully expanded')

    await w.get('.vg-tree-gutter button').trigger('click')
    expect(bar(w).text()).toContain('4 rows shown')
    await w.setProps({ detailExpanded: [1] })
    expect(w.text()).toContain('Row details')
    expect(bar(w).text()).toContain('4 rows shown')
    await w.get('.vg-tree-gutter button').trigger('click')
    expect(bar(w).text()).toContain('1 row shown')
  })

  it('localizes the opt-in footer and scrolls the grid back to the first row', async () => {
    const w = await mountGrid({
      rows: [],
      statusBar: {
        rowCountMode: 'visible',
        fullyExpandedCount: 0,
        backToTop: true,
        attrs: {
          root: { 'data-test': 'footer', role: 'presentation' },
          rowCount: { 'data-test': 'visible-count' },
          fullyExpandedCount: { 'data-test': 'expanded-count' },
          backToTop: { 'data-test': 'back-to-top', type: 'submit' },
        },
      },
      messages: {
        visibleRowCount: (formatted: string) => `Shown: ${formatted}`,
        fullyExpandedCount: (formatted: string) => `Expanded: ${formatted}`,
        backToTop: 'First row',
      },
    })
    const scrollTo = vi.fn()
    expect(w.get('[data-test="footer"]').attributes('role')).toBe('group')
    expect(w.get('[data-test="visible-count"]').attributes('role')).toBe('status')
    expect(w.get('[data-test="expanded-count"]').text()).toBe('Expanded: 0')
    expect(w.get('[data-test="back-to-top"]').attributes('type')).toBe('button')
    Object.defineProperty(w.get('[role="grid"]').element, 'scrollTo', { value: scrollTo })
    expect(bar(w).text()).toContain('Shown: 0')
    expect(bar(w).text()).toContain('Expanded: 0')
    expect(bar(w).get('button').text()).toBe('First row')
    await bar(w).get('button').trigger('click')
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 })

    await w.setProps({ statusBar: true })
    expect(bar(w).text()).toBe('0 rows')
    expect(bar(w).find('button').exists()).toBe(false)
  })

  it('announces changes to both native counts in one opt-in status region', async () => {
    const statusBar: StatusBarOptions = {
      groupCounts: true,
      rowCountMode: 'visible',
      fullyExpandedCount: 4,
      backToTop: true,
      attrs: {
        counts: { 'data-test': 'counts' },
        rowCount: { 'data-test': 'visible-count' },
        fullyExpandedCount: { 'data-test': 'expanded-count' },
        backToTop: { 'data-test': 'back-to-top' },
      },
    }
    const w = await mountGrid({
      rows: [{ ...rows[0]!, children: rows.slice(1) }],
      subRows: (row: Row) => row.children,
      statusBar,
    })
    const counts = bar(w).get('[data-test="counts"]')
    expect(
      bar(w)
        .findAll('[role="status"]')
        .map((region) => region.element),
    ).toEqual([counts.element])
    expect(counts.attributes('aria-atomic')).toBe('true')
    expect(counts.get('[data-test="visible-count"]').text()).toBe('1 row shown')
    expect(counts.get('[data-test="expanded-count"]').text()).toBe('4 fully expanded')
    expect(counts.find('button').exists()).toBe(false)
    expect(bar(w).get('button[data-test="back-to-top"]').text()).toBe('Back to top')

    await w.get('.vg-tree-gutter button').trigger('click')
    expect(counts.get('[data-test="visible-count"]').text()).toBe('4 rows shown')
    await w.setProps({ statusBar: { ...statusBar, fullyExpandedCount: 6 } })
    expect(counts.get('[data-test="expanded-count"]').text()).toBe('6 fully expanded')
    expect(bar(w).get('[data-test="counts"]').element).toBe(counts.element)

    await w.setProps({ statusBar: { ...statusBar, rows: false } })
    expect(counts.find('[data-test="visible-count"]').exists()).toBe(false)
    expect(counts.text()).toBe('4 fully expanded')
    await w.setProps({ statusBar: { ...statusBar, fullyExpandedCount: undefined } })
    expect(counts.text()).toBe('4 rows shown')

    await w.setProps({ statusBar: { ...statusBar, groupCounts: false } })
    expect(bar(w).find('[data-test="counts"]').exists()).toBe(false)
    expect(bar(w).get('[data-test="visible-count"]').attributes('role')).toBe('status')
  })

  it('counts the selection and summarises chosen columns over the selected rows', async () => {
    const w = await mountGrid({
      selectable: true,
      selected: [1, 2],
      statusBar: { summary: ['stake'] },
    })
    const text = bar(w).text()
    expect(text).toContain('2 selected')
    // formatted like the column's cells (currency renderer, EUR)
    expect(text).toContain('Stake:')
    expect(text).toContain('Sum €30.50')
    expect(text).toContain('Average €15.25')

    await w.setProps({ selected: [] })
    await nextTick()
    expect(bar(w).text()).not.toContain('Stake:')
  })

  it('aggregates picks what the summary shows; unknown columns are skipped', async () => {
    const w = await mountGrid({
      selectable: true,
      selected: [1, 3, 4],
      statusBar: { summary: ['stake', 'nope'], aggregates: ['min', 'max'] },
    })
    const text = bar(w).text()
    expect(text).toContain('Min €4.00')
    expect(text).toContain('Max €1,000.00')
    expect(text).not.toContain('Sum')
    expect(text).not.toContain('nope')
  })

  it('selected rows in a sub-grid count in the summary', async () => {
    const tree: Row[] = [
      { ...rows[0]!, children: [{ id: 11, name: 'Child', city: 'Niš', stake: 5 }] },
      rows[1]!,
    ]
    const w = await mountGrid({
      rows: tree,
      subRows: (r: Row) => r.children,
      selectable: true,
      selectionMode: 'independent',
      selected: [11, 2],
      statusBar: { summary: ['stake'], aggregates: ['sum'] },
    })
    expect(bar(w).text()).toContain('Sum €25.50')
  })

  it('the #status-bar slot replaces the content and gets the counts', async () => {
    let scope: StatusBarScope | undefined
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', statusBar: true, selectable: true, selected: [2] },
      slots: {
        'status-bar': (s: StatusBarScope) => {
          scope = s
          return `custom ${s.rowCount}/${s.selectedCount}`
        },
      },
    })
    await flushPromises()
    expect(bar(w).text()).toBe('custom 4/1')
    expect(scope).toMatchObject({ rowCount: 4, totalRowCount: 4, filterCount: 0, summary: [] })
    expect(typeof scope!.clearFilters).toBe('function')
  })

  it('server data: the server total, no "of M"; no summary while all matching rows are selected', async () => {
    const source: DataSource<Row> = async (q) => ({
      rows: rows.slice(0, q.pageSize ?? rows.length),
      total: 240,
    })
    const w = mount(VGrid, {
      props: {
        dataSource: source,
        columns,
        rowKey: 'id',
        locale: 'en-US',
        currency: 'EUR',
        pagination: true,
        pageSize: 2,
        selectable: true,
        selected: [1, 2],
        statusBar: { summary: ['stake'] },
      },
    })
    await flushPromises()
    expect(bar(w).text()).toContain('240 rows')
    expect(bar(w).text()).not.toContain(' of ')
    expect(bar(w).text()).toContain('Sum €30.50')

    await w.setProps({ selectAllMatching: true })
    await nextTick()
    expect(bar(w).text()).toContain('All 240 selected')
    expect(bar(w).text()).not.toContain('Sum')
  })
})

describe('status bar without the feature', () => {
  const saved = config.global.plugins
  afterEach(() => {
    config.global.plugins = saved
  })

  it('renders nothing and says which feature it needs', async () => {
    config.global.plugins = []
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', statusBar: true } })
    await flushPromises()
    expect(w.find('.vg-status-bar').exists()).toBe(false)
    expect(warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain(
      'needs the statusBar feature',
    )
    warn.mockRestore()
  })
})
