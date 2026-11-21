import { describe, expect, it, vi } from 'vitest'
import { getByPath, getCellValue, resolveRowKey } from '../src/core/value'
import { cssPinOffsets, isFixedTrack } from '../src/composables/usePinnedOffsets'
import {
  effectivePin,
  gridTemplate,
  moveColumn,
  moveColumnRelative,
  normalizeColumnState,
  setColumnHidden,
  setColumnPinned,
  visibleColumns,
} from '../src/core/columns'
import { compareValues, nextSort, sortRows } from '../src/core/sort'
import { selectionState, toggleRowSelection } from '../src/core/selection'
import { computeVirtualWindow } from '../src/core/virtual'
import { pageItems } from '../src/core/pagination'
import { localStorageAdapter } from '../src/core/storage'
import type { ColumnDef } from '../src/types'

describe('value', () => {
  it('reads dot paths and tolerates missing segments', () => {
    const row = { user: { address: { city: 'Novi Sad' } }, n: 0 }
    expect(getByPath(row, 'user.address.city')).toBe('Novi Sad')
    expect(getByPath(row, 'user.missing.city')).toBeUndefined()
    expect(getByPath(row, 'n')).toBe(0)
    expect(getByPath(null, 'a')).toBeUndefined()
  })

  it('does not walk the prototype chain', () => {
    expect(getByPath({}, 'constructor')).toBeUndefined()
    expect(getByPath({ a: {} }, 'a.__proto__')).toBeUndefined()
  })

  it('value() wins over field, field defaults to key', () => {
    const row = { a: 1, b: 2 }
    expect(getCellValue(row, { key: 'a' })).toBe(1)
    expect(getCellValue(row, { key: 'x', field: 'b' })).toBe(2)
    expect(getCellValue(row, { key: 'a', field: 'b', value: (r) => r.a * 10 })).toBe(10)
  })

  it('resolves row keys from field or function', () => {
    expect(resolveRowKey({ id: 7 }, 'id')).toBe(7)
    expect(resolveRowKey({ id: 7 }, (r) => `r${r.id}`)).toBe('r7')
  })
})

const cols: ColumnDef[] = [
  { key: 'a' },
  { key: 'b', pinned: 'right' },
  { key: 'c', hidden: true },
  { key: 'd', pinned: 'left' },
  { key: 'e', reorderable: false },
]

describe('columns', () => {
  it('normalizes state: defaults from defs, drops unknown, appends new', () => {
    expect(normalizeColumnState(cols, null)).toEqual({
      order: ['a', 'b', 'c', 'd', 'e'],
      hidden: ['c'],
      pinned: {},
    })
    expect(
      normalizeColumnState(cols, {
        order: ['zz', 'e', 'a'],
        hidden: ['zz', 'a'],
        pinned: { zz: 'left', a: 'right', b: null, e: 'sideways' as never },
      }),
    ).toEqual({
      order: ['e', 'a', 'b', 'c', 'd'],
      hidden: ['a'],
      pinned: { a: 'right', b: null },
    })
  })

  it('pin overrides in state win over column defaults', () => {
    const state = normalizeColumnState(cols, { pinned: { a: 'left', d: null } })
    expect(effectivePin(cols[0]!, state)).toBe('left')
    expect(effectivePin(cols[3]!, state)).toBeUndefined()
    expect(effectivePin(cols[1]!, state)).toBe('right')
    expect(visibleColumns(cols, state).map((c) => c.key)).toEqual(['a', 'd', 'e', 'b'])
  })

  it('pins at the inner edge of the pin group and unpins', () => {
    const c: ColumnDef[] = [{ key: 'a', pinned: 'left' }, { key: 'b' }, { key: 'c' }, { key: 'd', pinned: 'right' }]
    const s = normalizeColumnState(c, null)
    const left = setColumnPinned(c, s, 'c', 'left')
    expect(left.pinned).toEqual({ c: 'left' })
    expect(visibleColumns(c, left).map((x) => x.key)).toEqual(['a', 'c', 'b', 'd'])
    const right = setColumnPinned(c, s, 'b', 'right')
    expect(visibleColumns(c, right).map((x) => x.key)).toEqual(['a', 'c', 'b', 'd'])
    const unpinned = setColumnPinned(c, s, 'a', null)
    expect(unpinned.pinned).toEqual({ a: null })
    expect(visibleColumns(c, unpinned).map((x) => x.key)).toEqual(['a', 'b', 'c', 'd'])
    // back to the definition default removes the override
    expect(setColumnPinned(c, unpinned, 'a', 'left').pinned).toEqual({})
    // pinnable: false is respected
    const locked: ColumnDef[] = [{ key: 'x', pinnable: false }]
    const ls = normalizeColumnState(locked, null)
    expect(setColumnPinned(locked, ls, 'x', 'left')).toBe(ls)
  })

  it('reorder honours runtime pins', () => {
    const state = normalizeColumnState(cols, { pinned: { a: 'left' } })
    expect(moveColumn(cols, state, 'a', 'd').order).toEqual(['b', 'c', 'd', 'a', 'e'])
    expect(moveColumn(cols, state, 'a', 'c')).toBe(state)
  })

  it('visible columns: hidden removed, left pins first, right pins last', () => {
    const state = normalizeColumnState(cols, null)
    expect(visibleColumns(cols, state).map((c) => c.key)).toEqual(['d', 'a', 'e', 'b'])
  })

  it('moves columns within a pin group only and respects reorderable', () => {
    const state = normalizeColumnState(cols, null)
    expect(moveColumn(cols, state, 'a', 'c').order).toEqual(['b', 'c', 'a', 'd', 'e'])
    expect(moveColumn(cols, state, 'c', 'a').order).toEqual(['c', 'a', 'b', 'd', 'e'])
    expect(moveColumn(cols, state, 'a', 'd')).toBe(state) // into left pin group
    expect(moveColumn(cols, state, 'e', 'a')).toBe(state) // not reorderable
    expect(moveColumn(cols, state, 'a', 'e')).toBe(state) // target not reorderable
  })

  it('drops columns before/after a target regardless of drag direction', () => {
    const c = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }]
    const s = normalizeColumnState(c, null)
    expect(moveColumnRelative(c, s, 'a', 'c', 'before').order).toEqual(['b', 'a', 'c', 'd'])
    expect(moveColumnRelative(c, s, 'a', 'c', 'after').order).toEqual(['b', 'c', 'a', 'd'])
    expect(moveColumnRelative(c, s, 'd', 'b', 'before').order).toEqual(['a', 'd', 'b', 'c'])
    expect(moveColumnRelative(c, s, 'd', 'b', 'after').order).toEqual(['a', 'b', 'd', 'c'])
    expect(moveColumnRelative(c, s, 'a', 'b', 'before')).toBe(s) // no-op
  })

  it('toggles hidden keeping order', () => {
    const s = normalizeColumnState(cols, null)
    expect(setColumnHidden(s, 'a', true).hidden).toEqual(['a', 'c'])
    expect(setColumnHidden(s, 'c', false).hidden).toEqual([])
  })

  it('builds a grid template', () => {
    expect(gridTemplate([{}, { width: '1fr' }, { width: '2fr', minWidth: '10rem' }])).toBe(
      'auto 1fr minmax(10rem, 2fr)',
    )
  })
})

describe('sort', () => {
  it('cycles asc → desc → none, and restarts on a new key', () => {
    expect(nextSort(null, 'a')).toEqual({ key: 'a', dir: 'asc' })
    expect(nextSort({ key: 'a', dir: 'asc' }, 'a')).toEqual({ key: 'a', dir: 'desc' })
    expect(nextSort({ key: 'a', dir: 'desc' }, 'a')).toBeNull()
    expect(nextSort({ key: 'a', dir: 'desc' }, 'b')).toEqual({ key: 'b', dir: 'asc' })
  })

  it('compares numbers, dates, booleans and strings (numeric aware)', () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
    expect(compareValues('item 2', 'item 10')).toBeLessThan(0)
    expect(compareValues(new Date(2020, 1), new Date(2019, 1))).toBeGreaterThan(0)
    expect(compareValues(false, true)).toBeLessThan(0)
  })

  it('sorts stably with nulls last in both directions', () => {
    const rows = [
      { id: 1, v: 3 },
      { id: 2, v: null },
      { id: 3, v: 1 },
      { id: 4, v: 3 },
    ]
    const get = (r: (typeof rows)[number]) => r.v
    expect(sortRows(rows, 'asc', get).map((r) => r.id)).toEqual([3, 1, 4, 2])
    expect(sortRows(rows, 'desc', get).map((r) => r.id)).toEqual([1, 4, 3, 2])
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3, 4]) // input untouched
  })

  it('uses a custom comparator when given', () => {
    const rows = [{ v: 'b' }, { v: 'a' }]
    const cmp = (a: { v: string }, b: { v: string }) => b.v.localeCompare(a.v)
    expect(sortRows(rows, 'asc', (r) => r.v, cmp).map((r) => r.v)).toEqual(['b', 'a'])
  })
})

describe('selection', () => {
  it('cascade toggles descendants, independent does not', () => {
    const s1 = toggleRowSelection(new Set(), 'p', ['c1', 'c2'], true)
    expect([...s1].sort()).toEqual(['c1', 'c2', 'p'])
    const s2 = toggleRowSelection(s1, 'p', ['c1', 'c2'], true)
    expect(s2.size).toBe(0)
    const s3 = toggleRowSelection(new Set(), 'p', ['c1'], false)
    expect([...s3]).toEqual(['p'])
  })

  it('reports none / some / all', () => {
    expect(selectionState([], new Set())).toBe('none')
    expect(selectionState([1, 2], new Set())).toBe('none')
    expect(selectionState([1, 2], new Set([1]))).toBe('some')
    expect(selectionState([1, 2], new Set([1, 2, 3]))).toBe('all')
  })
})

describe('virtual', () => {
  it('computes a window with overscan, clamped to bounds', () => {
    expect(
      computeVirtualWindow({ scrollTop: 0, viewportHeight: 100, rowHeight: 20, rowCount: 1000, overscan: 2 }),
    ).toEqual({ start: 0, end: 7, padTop: 0, padBottom: (1000 - 7) * 20 })
    expect(
      computeVirtualWindow({ scrollTop: 1000, viewportHeight: 100, rowHeight: 20, rowCount: 1000, overscan: 2 }),
    ).toEqual({ start: 48, end: 57, padTop: 48 * 20, padBottom: (1000 - 57) * 20 })
    expect(
      computeVirtualWindow({ scrollTop: 99999, viewportHeight: 100, rowHeight: 20, rowCount: 10, overscan: 2 }),
    ).toEqual({ start: 3, end: 10, padTop: 60, padBottom: 0 })
    expect(
      computeVirtualWindow({ scrollTop: 0, viewportHeight: 100, rowHeight: 20, rowCount: 0, overscan: 2 }),
    ).toEqual({ start: 0, end: 0, padTop: 0, padBottom: 0 })
  })
})

describe('pagination', () => {
  it('builds page items with ellipses', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5])
    expect(pageItems(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
    expect(pageItems(1, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10])
    expect(pageItems(10, 10)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10])
  })
})

describe('storage', () => {
  it('round-trips and tolerates bad JSON / unavailable storage', () => {
    localStorage.clear()
    const a = localStorageAdapter('grid')
    expect(a.load()).toBeNull()
    a.save({ order: ['a'], hidden: [], pinned: {} })
    expect(a.load()).toEqual({ order: ['a'], hidden: [], pinned: {} })
    localStorage.setItem('grid', '{nope')
    expect(a.load()).toBeNull()
    localStorage.setItem('grid', '{"order":"x"}')
    expect(a.load()).toBeNull()
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(a.load()).toBeNull()
    spy.mockRestore()
  })
})

describe('pinned offsets in CSS', () => {
  const col = (key: string, pinned: 'left' | 'right' | undefined, width?: string, minWidth?: string) => ({ key, pinned, def: { width, minWidth } })

  it('sums definite widths into calc() per side; the outermost width is never needed', () => {
    expect(
      cssPinOffsets([
        col('sel', 'left', 'var(--vg-select-column-width)'),
        col('id', 'left', '4rem'),
        col('name', 'left', 'auto'), // innermost left: its own width does not matter
        col('mid', undefined, '1fr'),
        col('a', 'right', 'min-content'), // innermost right
        col('b', 'right', '120px'),
      ]),
    ).toEqual({ sel: '0px', id: 'calc(var(--vg-select-column-width))', name: 'calc(var(--vg-select-column-width) + 4rem)', b: '0px', a: 'calc(120px)' })
  })

  it('falls back (null) when an inner pinned column is content-sized', () => {
    expect(cssPinOffsets([col('a', 'left', 'auto'), col('b', 'left', '4rem')])).toBeNull()
    expect(cssPinOffsets([col('a', 'left', '1fr'), col('b', 'left')])).toBeNull()
    expect(cssPinOffsets([col('a', 'left', '8rem', '4rem'), col('b', 'left')])).toBeNull() // minmax()
    expect(isFixedTrack({ width: '12.5rem' })).toBe(true)
    expect(isFixedTrack({ width: '50%' })).toBe(false)
    expect(isFixedTrack({})).toBe(false)
  })
})
