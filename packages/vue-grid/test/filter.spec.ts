import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import {
  activeFilterCount,
  filterTree,
  isFilterActive,
  localFilterStorage,
  matchesFilter,
  parseQuickFilter,
  quickFilterText,
  setKey,
  type ColumnFilter,
  type FilterState,
} from '../src/core/filter'
import { numberRenderer, statusRenderer } from '../src/renderers'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

describe('matchesFilter', () => {
  it('text: folded (case / accent-insensitive) operators', () => {
    const f = (op: string, value?: string) => ({ type: 'text', op, value }) as ColumnFilter
    expect(matchesFilter('Niš', f('contains', 'nis'))).toBe(true)
    expect(matchesFilter('Beograd', f('startsWith', 'beo'))).toBe(true)
    expect(matchesFilter('Beograd', f('endsWith', 'GRAD'))).toBe(true)
    expect(matchesFilter('Beograd', f('equals', 'beograd'))).toBe(true)
    expect(matchesFilter('Beograd', f('notContains', 'x'))).toBe(true)
    expect(matchesFilter('', f('empty'))).toBe(true)
    expect(matchesFilter(null, f('notEmpty'))).toBe(false)
    expect(matchesFilter('anything', f('contains', ''))).toBe(true) // empty value = inactive
  })

  it('number: comparisons, between (inclusive, open-ended), empty; non-numbers fail', () => {
    const f = (op: string, value?: number | null, to?: number | null) =>
      ({ type: 'number', op, value, to }) as ColumnFilter
    expect(matchesFilter(10, f('gt', 5))).toBe(true)
    expect(matchesFilter('10', f('lte', 10))).toBe(true)
    expect(matchesFilter(3, f('between', 3, 5))).toBe(true)
    expect(matchesFilter(6, f('between', 3, 5))).toBe(false)
    expect(matchesFilter(100, f('between', 50, null))).toBe(true)
    expect(matchesFilter(null, f('empty'))).toBe(true)
    expect(matchesFilter('abc', f('eq', 1))).toBe(false)
  })

  it('date: by day in the given time zone', () => {
    const f = (op: string, value?: string, to?: string) =>
      ({ type: 'date', op, value, to }) as ColumnFilter
    const late = '2026-03-05T23:30:00Z'
    expect(matchesFilter(late, f('on', '2026-03-05'), { timeZone: 'UTC' })).toBe(true)
    expect(matchesFilter(late, f('on', '2026-03-06'), { timeZone: 'Europe/Belgrade' })).toBe(true) // next day there
    expect(matchesFilter(late, f('before', '2026-03-06'), { timeZone: 'UTC' })).toBe(true)
    expect(matchesFilter(late, f('between', '2026-03-01', '2026-03-05'), { timeZone: 'UTC' })).toBe(
      true,
    )
    expect(matchesFilter('nope', f('after', '2020-01-01'))).toBe(false)
  })

  it('boolean and set (incl. blanks)', () => {
    expect(matchesFilter(true, { type: 'boolean', value: true })).toBe(true)
    expect(matchesFilter(false, { type: 'boolean', value: true })).toBe(false)
    expect(matchesFilter(null, { type: 'boolean', value: null })).toBe(true)
    expect(matchesFilter('Won', { type: 'set', values: ['Won', 'Lost'] })).toBe(true)
    expect(matchesFilter(null, { type: 'set', values: [''] })).toBe(true)
    expect(matchesFilter('Open', { type: 'set', values: [] })).toBe(false) // nothing selected → nothing passes
    expect(setKey(undefined)).toBe('')
  })

  it('activity and counts', () => {
    expect(isFilterActive({ type: 'text', op: 'contains', value: '' })).toBe(false)
    expect(isFilterActive({ type: 'number', op: 'empty' })).toBe(true)
    expect(
      activeFilterCount({
        columns: {
          a: { type: 'text', op: 'contains', value: 'x' },
          b: { type: 'text', op: 'contains' },
        },
        search: ' q ',
      }),
    ).toBe(2)
  })
})

describe('quick filter shorthand', () => {
  it('parses and prints number, date and text shorthand', () => {
    expect(parseQuickFilter('number', '>= 10')).toEqual({ type: 'number', op: 'gte', value: 10 })
    expect(parseQuickFilter('number', '5..20')).toEqual({
      type: 'number',
      op: 'between',
      value: 5,
      to: 20,
    })
    expect(parseQuickFilter('number', '-5 - -1')).toEqual({
      type: 'number',
      op: 'between',
      value: -5,
      to: -1,
    })
    expect(parseQuickFilter('number', '!=3')).toEqual({ type: 'number', op: 'ne', value: 3 })
    expect(parseQuickFilter('number', 'abc')).toBeUndefined()
    expect(parseQuickFilter('date', '>2026-01-01')).toEqual({
      type: 'date',
      op: 'after',
      value: '2026-01-01',
    })
    expect(parseQuickFilter('text', ' bel ')).toEqual({
      type: 'text',
      op: 'contains',
      value: 'bel',
    })
    expect(parseQuickFilter('text', '   ')).toBeUndefined()
    for (const s of ['>10', '5..20', '!=3', '7'])
      expect(quickFilterText(parseQuickFilter('number', s))).toBe(s)
    expect(quickFilterText({ type: 'text', op: 'notContains', value: 'x' })).toBe('') // not expressible
  })
})

describe('filterTree', () => {
  it('keeps rows that match or have a matching descendant', () => {
    interface N {
      id: string
      children?: N[]
    }
    const tree: N[] = [
      { id: 'a', children: [{ id: 'a1' }, { id: 'a2', children: [{ id: 'x' }] }] },
      { id: 'b' },
    ]
    const kept = filterTree(
      tree,
      (n) => n.id === 'x',
      (n) => n.children,
    )
    expect(kept.map((n) => n.id)).toEqual(['a'])
  })
})

interface Bet {
  id: number
  player: string
  city: string
  stake: number
  status: string
  children?: Bet[]
}
const rows: Bet[] = [
  { id: 1, player: 'Ana', city: 'Niš', stake: 10, status: 'Won' },
  { id: 2, player: 'Marko', city: 'Beograd', stake: 250, status: 'Lost' },
  { id: 3, player: 'Jelena', city: 'Novi Sad', stake: 75, status: 'Open' },
  { id: 4, player: 'Luka', city: 'Beograd', stake: 5, status: 'Won' },
]
const columns = [
  { key: 'player', filterable: true },
  { key: 'city', filterable: true },
  { key: 'stake', filterable: true, renderer: numberRenderer },
  { key: 'status', filterable: true, renderer: statusRenderer },
]
const shownIds = (w: ReturnType<typeof mount>) =>
  w
    .findAll('.vg-row')
    .map((r) => Number(r.attributes('data-row-key')))
    .filter((n) => !Number.isNaN(n))

afterEach(() => localStorage.clear())

describe('grid filtering', () => {
  it('client mode: column filters, search (accent-insensitive) and set filters combine', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', filters: null } })
    expect(shownIds(w)).toEqual([1, 2, 3, 4])
    await w.setProps({
      filters: { columns: { city: { type: 'text', op: 'equals', value: 'beograd' } }, search: '' },
    })
    expect(shownIds(w)).toEqual([2, 4])
    await w.setProps({
      filters: { columns: { stake: { type: 'number', op: 'gt', value: 20 } }, search: 'nis' },
    })
    expect(shownIds(w)).toEqual([]) // Ana (Niš) has stake 10
    await w.setProps({
      filters: { columns: { status: { type: 'set', values: ['Won'] } }, search: 'nis' },
    })
    expect(shownIds(w)).toEqual([1])
  })

  it('header funnels: one per filterable column, value list offers distinct values', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id' }, attachTo: document.body })
    expect(w.findAll('.vg-filter-button')).toHaveLength(4)
    const popover = w.find('[data-col-key="status"] [popover]')
    expect(w.find('[data-col-key="status"] .vg-filter-button').attributes('popovertarget')).toBe(
      popover.attributes('id'),
    )
    w.unmount()
  })

  it('filter row: typing shorthand filters (debounced) and emits update:filters', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', filterRow: true } })
    await vi.dynamicImportSettled() // the filter-row editor is loaded on demand
    await flushPromises()
    const input = w.find('[data-col-key="stake"] .vg-filter-input input')
    await input.setValue('>=75')
    await new Promise((r) => setTimeout(r, 260))
    await nextTick()
    expect(shownIds(w)).toEqual([2, 3])
    const emitted = w.emitted('update:filters') as FilterState[][]
    expect(emitted.at(-1)![0]!.columns.stake).toEqual({ type: 'number', op: 'gte', value: 75 })
  })

  it('controlled mode only emits; rows stay as given', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', filterMode: 'controlled' } })
    ;(w.vm as unknown as VGridExposed).setFilters({
      columns: { city: { type: 'text', op: 'contains', value: 'beo' } },
    })
    await nextTick()
    expect(shownIds(w)).toEqual([1, 2, 3, 4])
    expect((w.emitted('update:filters') as FilterState[][])[0]![0]!.columns.city).toBeTruthy()
  })

  it('custom filterFn, no-match message with Clear filters, persistence', async () => {
    const cols = [
      ...columns,
      {
        key: 'even',
        filterable: true,
        value: (r: Bet) => r.id % 2 === 0,
        filterFn: (row: Bet, f: ColumnFilter) =>
          (f as { value: unknown }).value === 'even' ? row.id % 2 === 0 : true,
      },
    ]
    const w = mount(VGrid, {
      props: { rows, columns: cols, rowKey: 'id', filterStorage: 'test-filters' },
    })
    const api = w.vm as unknown as VGridExposed
    api.setFilters({ columns: { even: { type: 'custom', value: 'even' } } })
    await nextTick()
    expect(shownIds(w)).toEqual([2, 4])
    expect(localFilterStorage('test-filters').load()?.columns.even).toEqual({
      type: 'custom',
      value: 'even',
    })

    api.setFilters({ columns: { city: { type: 'text', op: 'equals', value: 'zzz' } } })
    await nextTick()
    expect(w.find('.vg-no-match').text()).toContain('No rows match')
    await w.find('.vg-no-match button').trigger('click')
    expect(shownIds(w)).toEqual([1, 2, 3, 4])

    // a fresh grid restores the persisted filters
    api.setFilters({ columns: { status: { type: 'set', values: ['Open'] } } })
    const again = mount(VGrid, {
      props: { rows, columns: cols, rowKey: 'id', filterStorage: 'test-filters' },
    })
    expect(shownIds(again)).toEqual([3])
  })

  it('tree: parents stay when a child matches; a matching parent keeps its children; select-all only visible', async () => {
    const tree: Bet[] = [
      { id: 10, player: 'Group A', city: '', stake: 0, status: '', children: [rows[0]!, rows[1]!] },
      { id: 20, player: 'Group B', city: '', stake: 0, status: '', children: [rows[2]!, rows[3]!] },
    ]
    const w = mount(VGrid, {
      props: {
        rows: tree,
        columns,
        rowKey: 'id',
        subRows: (r: Bet) => r.children,
        expanded: [10, 20],
        selectable: true,
      },
    })
    const api = w.vm as unknown as VGridExposed
    api.setFilters({ columns: { player: { type: 'text', op: 'contains', value: 'marko' } } })
    await nextTick()
    expect(shownIds(w)).toEqual([10, 2])
    api.setFilters({ columns: { player: { type: 'text', op: 'contains', value: 'group b' } } })
    await nextTick()
    expect(shownIds(w)).toEqual([20, 3, 4])
    await w.find('.vg-header [type="checkbox"]').setValue(true)
    expect(((w.emitted('update:selected') as number[][][]).at(-1)![0]! as number[]).sort()).toEqual(
      [20, 3, 4].sort(),
    )
  })
})
