import { describe, expect, it, vi } from 'vitest'
import { config, mount } from '@vue/test-utils'
import { h, nextTick, reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { aggregateRows, aggregateValues } from '../src/core/aggregate'
import {
  aggregationFeature,
  rowPinningFeature,
  selectionFeature,
  sortingFeature,
  virtualScrollingFeature,
} from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { ColumnDef, VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  amount: number | null
  when?: string
}
const rows: Row[] = [
  { id: 1, name: 'Bravo', amount: 20, when: '2024-03-01' },
  { id: 2, name: 'Alpha', amount: null, when: '2024-01-15' },
  { id: 3, name: 'Charlie', amount: 5.5 },
  { id: 4, name: 'Delta', amount: 10 },
]
const columns: ColumnDef<Row>[] = [
  { key: 'name', sortable: true, filterable: true },
  { key: 'amount', renderer: 'number', aggregate: 'sum' },
  { key: 'when' },
]

/** Mounts with only the grid's own `features` (test/setup.ts registers every feature app-wide). */
function mountBare(props: Record<string, unknown>) {
  const saved = config.global.plugins
  config.global.plugins = [createVueGrid({ renderers: allRenderers })]
  try {
    return mount(VGrid, { props })
  } finally {
    config.global.plugins = saved
  }
}

const bodyNames = (w: ReturnType<typeof mount>) =>
  w.findAll('.vg > .vg-row > [data-col-key="name"]').map((c) => c.text())
const pinnedNames = (w: ReturnType<typeof mount>, side: 'top' | 'bottom') =>
  w.findAll(`.vg-pinned-${side} > .vg-row > [data-col-key="name"]`).map((c) => c.text())

describe('aggregates', () => {
  const values = [3, '4', null, undefined, '', Number.NaN, 'x', 1]
  it('sum / avg skip empty and non-numeric values', () => {
    expect(aggregateValues('sum', values, values)).toBe(8)
    expect(aggregateValues('avg', values, values)).toBeCloseTo(8 / 3)
    expect(aggregateValues('sum', [null, ''], [1, 2])).toBeNull()
    expect(aggregateValues('avg', [], [])).toBeNull()
  })
  it('min / max compare numbers, dates and strings; empty gives null', () => {
    expect(aggregateValues('min', [5, null, 2, 9], [])).toBe(2)
    expect(aggregateValues('max', [5, null, 2, 9], [])).toBe(9)
    const d1 = new Date('2024-01-01')
    const d2 = new Date('2024-06-01')
    expect(aggregateValues('max', [d1, d2, new Date('nope')], [])).toBe(d2)
    expect(aggregateValues('min', ['b10', 'b9', 'a'], [])).toBe('a')
    expect(aggregateValues('max', ['b10', 'b9'], [])).toBe('b10')
    expect(aggregateValues('max', [null, undefined], [])).toBeNull()
  })
  it('count is the number of rows; functions get values and rows', () => {
    expect(aggregateValues('count', [], [1, 2, 3])).toBe(3)
    const fn = vi.fn((vals: unknown[], rs: readonly Row[]) => `${vals.length}/${rs.length}`)
    expect(aggregateValues(fn, [1, 2], rows.slice(0, 2))).toBe('2/2')
  })
  it('aggregateRows covers only columns with an aggregate', () => {
    expect(
      aggregateRows(rows, [
        { key: 'name', aggregate: 'count' },
        { key: 'amount', aggregate: 'max' },
        { key: 'when' },
      ]),
    ).toEqual({ name: 4, amount: 20 })
  })
})

describe('totals row (aggregation feature)', () => {
  it('shows a sticky totals row over the filtered rows, with the column renderer and a label', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', totals: true } })
    const total = w.find('.vg-pinned-bottom > .vg-row-total')
    expect(total.exists()).toBe(true)
    expect(total.find('[data-col-key="name"]').text()).toBe('Total')
    expect(total.find('[data-col-key="amount"] .vg-number').text()).toBe('35.5')
    expect(total.find('[data-col-key="when"]').text()).toBe('')
    expect(total.attributes('aria-label')).toBe('Total')

    // filters narrow the totals
    await w.setProps({
      filters: { columns: { name: { type: 'text', op: 'contains', value: 'a' } }, search: '' },
    })
    expect(bodyNames(w)).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta'])
    await w.setProps({
      filters: { columns: { name: { type: 'text', op: 'contains', value: 'ar' } }, search: '' },
    })
    expect(bodyNames(w)).toEqual(['Charlie'])
    expect(w.find('.vg-row-total [data-col-key="amount"]').text()).toBe('5.5')
  })

  it("'top' puts it under the header; count renders as a number; label and slots", async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns: [
          { key: 'name', aggregate: 'count' },
          { key: 'amount', aggregate: 'avg' },
          { key: 'when' },
        ],
        rowKey: 'id',
        totals: 'top',
        totalsLabel: 'Sum',
      },
      slots: {
        'total-amount': ({ value }: { value: number }) => h('i', `avg ${value.toFixed(2)}`),
      },
    })
    const total = w.find('.vg-pinned-top > .vg-row-total')
    expect(total.find('[data-col-key="name"]').text()).toBe('4')
    expect(total.find('[data-col-key="amount"] i').text()).toBe('avg 11.83')
    expect(w.find('.vg-pinned-bottom').exists()).toBe(false)
    expect(total.attributes('aria-label')).toBe('Sum')
  })

  it('`aggregates` supplies values (server totals); totals follow live data', async () => {
    const live = reactive(rows.map((r) => ({ ...r })))
    const w = mount(VGrid, { props: { rows: live, columns, rowKey: 'id', totals: true } })
    live[0]!.amount = 120
    await nextTick()
    expect(w.find('.vg-row-total [data-col-key="amount"]').text()).toBe('135.5')
    await w.setProps({ aggregates: { amount: 9999 } })
    expect(w.find('.vg-row-total [data-col-key="amount"]').text()).toBe('9,999')
  })

  it('totals rows take no clicks or menus, and a selection column shows no checkbox', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', totals: true, selectable: true, rowClickable: true },
    })
    await w.find('.vg-row-total [data-col-key="amount"]').trigger('click')
    expect(w.emitted('row-click')).toBeUndefined()
    expect(w.find('.vg-row-total .vg-checkbox').exists()).toBe(false)
  })

  it('without the feature, totals are ignored (and a dev warning names it)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = mountBare({ rows, columns, rowKey: 'id', totals: true, features: [] })
    expect(w.find('.vg-pinned-rows').exists()).toBe(false)
    expect(warn.mock.calls.some(([m]) => String(m).includes('aggregation'))).toBe(true)
    warn.mockRestore()
  })
})

describe('pinned rows (row pinning feature)', () => {
  it('pins rows by key above and below the body, in model order, out of the body', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', pinnedRows: { top: [3, 1], bottom: [2] } },
    })
    expect(pinnedNames(w, 'top')).toEqual(['Charlie', 'Bravo'])
    expect(pinnedNames(w, 'bottom')).toEqual(['Alpha'])
    expect(bodyNames(w)).toEqual(['Delta'])
    expect(w.find('.vg').classes()).toContain('vg-has-pinned-rows')
    // pinned rows aren't body rows: no data-row-key (scrollToRow, anchoring)
    expect(w.find('.vg-pinned-top > .vg-row').attributes('data-row-key')).toBeUndefined()
    expect(w.find('.vg-pinned-top > .vg-row').attributes('data-pinned-key')).toBe('3')
  })

  it('pinned rows ignore filters and sorting; the body is sorted without them', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        sortMode: 'client',
        sort: { key: 'name', dir: 'asc' },
        pinnedRows: { top: [4] },
        filters: { columns: { name: { type: 'text', op: 'contains', value: 'r' } }, search: '' },
      },
    })
    expect(pinnedNames(w, 'top')).toEqual(['Delta'])
    expect(bodyNames(w)).toEqual(['Bravo', 'Charlie'])
  })

  it('pinRow() pins, moves and unpins, updating v-model:pinned-rows', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id' } })
    const grid = w.vm as unknown as VGridExposed
    grid.pinRow(2, 'top')
    await nextTick()
    expect(w.emitted('update:pinnedRows')!.at(-1)).toEqual([{ top: [2], bottom: [] }])
    await w.setProps({ pinnedRows: { top: [2], bottom: [] } })
    grid.pinRow(2, 'bottom')
    expect(w.emitted('update:pinnedRows')!.at(-1)).toEqual([{ top: [], bottom: [2] }])
    grid.pinRow(2, null)
    expect(w.emitted('update:pinnedRows')!.at(-1)).toEqual([{ top: [], bottom: [] }])
  })

  it('extra pinned rows sit outside the data; totals go last at the bottom', () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        pinnedTopRows: [{ id: 'goal', name: 'Goal', amount: 100 }],
        pinnedBottomRows: [{ id: 'prev', name: 'Last year', amount: 30 }],
        pinnedRows: { bottom: [1] },
        totals: 'bottom',
      },
    })
    expect(pinnedNames(w, 'top')).toEqual(['Goal'])
    expect(pinnedNames(w, 'bottom')).toEqual(['Bravo', 'Last year', 'Total'])
    // totals cover the data (pinned data rows included), not the extra rows
    expect(w.find('.vg-row-total [data-col-key="amount"]').text()).toBe('35.5')
  })

  it('pinned data rows keep their checkbox and row clicks; extra rows have no checkbox', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        selectable: true,
        rowClickable: true,
        pinnedRows: { top: [1] },
        pinnedTopRows: [{ id: 'goal', name: 'Goal', amount: 100 }],
      },
    })
    const [extra, keyed] = w.findAll('.vg-pinned-top > .vg-row')
    expect(extra!.find('.vg-checkbox').exists()).toBe(false)
    await keyed!.find('.vg-checkbox input').trigger('change')
    expect(w.emitted('update:selected')!.at(-1)).toEqual([[1]])
    await keyed!.find('[data-col-key="name"]').trigger('click')
    expect((w.emitted('row-click')![0]![0] as Row).id).toBe(1)
    expect(keyed!.find('.vg-expander').exists()).toBe(false)
  })

  it('virtual mode: aria-rowindex counts the pinned rows around the body', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Row ${i + 1}`,
      amount: i,
    }))
    const w = mount(VGrid, {
      props: {
        rows: many,
        columns,
        rowKey: 'id',
        virtual: { rowHeight: 30 },
        pinnedRows: { top: [5] },
        totals: true,
      },
    })
    const root = w.find('.vg')
    expect(root.attributes('aria-rowcount')).toBe(String(1 + 1 + 49 + 1))
    expect(w.find('.vg-pinned-top > .vg-row').attributes('aria-rowindex')).toBe('2')
    expect(w.find('.vg > .vg-row').attributes('aria-rowindex')).toBe('3')
    expect(w.find('.vg-pinned-bottom > .vg-row').attributes('aria-rowindex')).toBe('52')
  })

  it('without the feature, pinned rows are ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = mountBare({
      rows,
      columns,
      rowKey: 'id',
      pinnedRows: { top: [1] },
      features: [sortingFeature],
    })
    expect(w.find('.vg-pinned-rows').exists()).toBe(false)
    expect(bodyNames(w)).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta'])
    expect(warn.mock.calls.some(([m]) => String(m).includes('rowPinning'))).toBe(true)
    warn.mockRestore()
  })

  it('each feature is enough on its own', () => {
    const a = mountBare({
      rows,
      columns,
      rowKey: 'id',
      totals: true,
      features: [aggregationFeature],
    })
    expect(a.find('.vg-row-total').exists()).toBe(true)
    const b = mountBare({
      rows,
      columns,
      rowKey: 'id',
      pinnedRows: { top: [1] },
      features: [rowPinningFeature, selectionFeature, virtualScrollingFeature],
    })
    expect(pinnedNames(b, 'top')).toEqual(['Bravo'])
  })
})
