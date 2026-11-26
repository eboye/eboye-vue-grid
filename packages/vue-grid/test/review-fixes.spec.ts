import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import {
  dayKey,
  matchesFilter,
  parseQuickFilter,
  quickFilterText,
  type NumberFilter,
} from '../src/core/filter'
import { normalizeColumnState } from '../src/core/columns'
import { sortRows } from '../src/core/sort'
import { localStorageAdapter } from '../src/core/storage'
import { formatDate, safeHref } from '../src/renderers/format'
import { lookup, resolveTone, safeTone } from '../src/renderers/options'
import { dateRenderer, multiLineRenderer, statusRenderer } from '../src/renderers'
import type { ColumnDef, VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

describe('security', () => {
  it('safeHref blocks javascript: hidden behind tabs, newlines and control characters', () => {
    for (const href of [
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      '\u0001javascript:alert(1)',
      ' \u0000JavaScript:x',
      'javascript\r:x',
    ])
      expect(safeHref(href)).toBeUndefined()
    expect(safeHref(' https://example.test/a ')).toBe('https://example.test/a')
    expect(safeHref('https://exa\tmple.test/')).toBe('https://example.test/')
    expect(safeHref('/orders/1')).toBe('/orders/1')
    expect(safeHref('\u0001')).toBeUndefined()
  })

  it('multi-line links from row data never render a javascript: href', () => {
    const w = mount(VGrid, {
      props: {
        rows: [
          {
            id: 1,
            links: [
              { text: 'Open', href: 'java\tscript:alert(1)' },
              { text: 'Ok', href: 'https://example.test' },
            ],
          },
        ],
        columns: [{ key: 'links', renderer: multiLineRenderer }],
        rowKey: 'id',
      },
    })
    const hrefs = w.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['https://example.test'])
  })

  it('tone and label maps ignore inherited keys; data tones cannot add classes', () => {
    expect(resolveTone({ Paid: 'success' }, 'constructor', {})).toBeUndefined()
    expect(lookup({ a: 1 }, '__proto__')).toBeUndefined()
    expect(safeTone('x vg-invisible')).toBeUndefined()
    expect(safeTone('success')).toBe('success')
    const w = mount(VGrid, {
      props: {
        rows: [{ id: 1, s: 'constructor', l: [{ text: 'x', tone: 'x vg-invisible' }] }],
        columns: [
          {
            key: 's',
            renderer: statusRenderer,
            rendererOptions: { label: { Paid: 'Paid!' }, tone: { Paid: 'success' } },
          },
          { key: 'l', renderer: multiLineRenderer },
        ],
        rowKey: 'id',
      },
    })
    expect(w.find('.vg-status-badge').text()).toBe('constructor')
    expect(w.find('.vg-status-badge').classes()).toContain('vg-tone-neutral')
    expect(w.find('.vg-line').classes()).not.toContain('vg-invisible')
  })

  it('the number shorthand stays fast on pathological input', () => {
    const t = performance.now()
    expect(parseQuickFilter('number', '1' + '.'.repeat(30000) + 'x')).toBeUndefined()
    expect(performance.now() - t).toBeLessThan(50)
  })
})

describe('filter edge cases', () => {
  it('parses negative ranges, open ranges and decimal commas; rejects junk', () => {
    expect(parseQuickFilter('number', '-5..-1')).toEqual({
      type: 'number',
      op: 'between',
      value: -5,
      to: -1,
    })
    expect(parseQuickFilter('number', '10-20')).toEqual({
      type: 'number',
      op: 'between',
      value: 10,
      to: 20,
    })
    expect(parseQuickFilter('number', '-5')).toEqual({ type: 'number', op: 'eq', value: -5 })
    expect(parseQuickFilter('number', '1,5')).toEqual({ type: 'number', op: 'eq', value: 1.5 })
    expect(parseQuickFilter('number', '5..')).toEqual({
      type: 'number',
      op: 'between',
      value: 5,
      to: null,
    })
    expect(parseQuickFilter('number', '..5')).toEqual({
      type: 'number',
      op: 'between',
      value: null,
      to: 5,
    })
    for (const junk of ['1.2.3..4', '1..2..3', '..', '5-', '- 5'])
      expect(parseQuickFilter('number', junk), junk).toBeUndefined()
    expect(parseQuickFilter('date', '2026-01-01..')).toEqual({
      type: 'date',
      op: 'between',
      value: '2026-01-01',
      to: undefined,
    })
  })

  it('one-sided ranges round-trip through the filter row', () => {
    const open: NumberFilter[] = [
      { type: 'number', op: 'between', value: 5, to: null },
      { type: 'number', op: 'between', value: null, to: 5 },
    ]
    for (const f of open) expect(parseQuickFilter('number', quickFilterText(f))).toEqual(f)
  })

  it('a date-only value is a calendar day in every time zone', () => {
    expect(dayKey('2026-01-05')).toBe('2026-01-05')
    expect(dayKey('2026-01-05', 'Pacific/Honolulu')).toBe('2026-01-05')
    expect(dayKey('2026-01-05', 'Pacific/Kiritimati')).toBe('2026-01-05')
    expect(dayKey('2026-13-45')).toBeNull()
    expect(
      matchesFilter(
        '2026-01-05',
        { type: 'date', op: 'on', value: '2026-01-05' },
        { timeZone: 'America/New_York' },
      ),
    ).toBe(true)
    expect(
      formatDate('2026-01-05', { locale: 'en-US', timeZone: 'America/New_York' } as never, {
        day: '2-digit',
      }),
    ).toBe('05')
    // instants still follow the time zone
    expect(dayKey('2026-01-05T02:00:00Z', 'America/New_York')).toBe('2026-01-04')
  })

  it('the set filter and text filter reuse one filter object across rows', () => {
    const set = { type: 'set', values: ['a', 'b'] } as const
    expect(
      ['a', 'c', 'b'].map((v) => matchesFilter(v, { ...set, values: [...set.values] })),
    ).toEqual([true, false, true])
    const text = { type: 'text', op: 'contains', value: 'NIS' } as const
    expect(['Niš', 'Belgrade'].map((v) => matchesFilter(v, text))).toEqual([true, false])
  })
})

describe('sorting and column state edge cases', () => {
  it('invalid dates sort last, like empty values', () => {
    const bad = new Date('x')
    const day = (d: number) => new Date(2026, 0, d)
    const rows = [day(5), bad, day(1), day(4), bad, day(2)].map((v) => ({ v }))
    const out = sortRows(rows, 'asc', (r) => r.v).map((r) =>
      Number.isNaN(r.v.getTime()) ? 'X' : r.v.getDate(),
    )
    expect(out).toEqual([1, 2, 4, 5, 'X', 'X'])
  })

  it('a column added since the state was saved keeps its hidden default', () => {
    const cols: ColumnDef[] = [{ key: 'a' }, { key: 'b' }, { key: 'c', hidden: true }]
    expect(normalizeColumnState(cols, { order: ['a', 'b'], hidden: [] }).hidden).toEqual(['c'])
    // a known column the user showed stays shown
    expect(normalizeColumnState(cols, { order: ['a', 'b', 'c'], hidden: [] }).hidden).toEqual([])
  })

  it('storage keeps a missing hidden list missing, and drops junk widths', () => {
    localStorage.setItem(
      'vg-review',
      JSON.stringify({ order: ['a'], widths: { a: '120px', b: 'x;}{' } }),
    )
    const loaded = localStorageAdapter('vg-review').load()
    expect(loaded?.hidden).toBeUndefined()
    const cols: ColumnDef[] = [{ key: 'a' }, { key: 'b', hidden: true }]
    const state = normalizeColumnState(cols, loaded)
    expect(state.hidden).toEqual(['b'])
    expect(state.widths).toEqual({ a: '120px' })
    localStorage.removeItem('vg-review')
  })
})

describe('grid edge cases', () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `Row ${i + 1}`,
    day: '2026-01-05',
  }))
  const columns = [{ key: 'name' }, { key: 'day', renderer: dateRenderer }]
  const ids = (w: ReturnType<typeof mount>) =>
    w.findAll('.vg-row').map((r) => Number(r.attributes('data-row-key')))

  it('an out-of-range page is clamped and written back', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', pagination: true, pageSize: 10, page: 5 },
    })
    await nextTick()
    expect(w.emitted('update:page')!.at(-1)).toEqual([3])
    await w.setProps({ page: 3 })
    expect(ids(w)[0]).toBe(21)
    // a bigger page size shrinks the page count
    await w.setProps({ pageSize: 25 })
    await nextTick()
    expect(w.emitted('update:page')!.at(-1)).toEqual([2])
  })

  it('a zero or invalid page size never renders an empty page', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', pagination: true, pageSize: 0, page: 1 },
    })
    expect(ids(w).length).toBe(25)
  })

  it('a date-only value renders as that day', () => {
    const w = mount(VGrid, {
      props: {
        rows: rows.slice(0, 1),
        columns,
        rowKey: 'id',
        timeZone: 'America/New_York',
        locale: 'en-CA',
      },
    })
    expect(w.find('[data-col-key="day"] .vg-date').text()).toContain('05')
  })

  it('saved filters for removed columns are ignored', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        filters: { columns: { gone: { type: 'text', op: 'contains', value: 'x' } }, search: '' },
      },
    })
    await nextTick()
    expect(ids(w).length).toBe(30)
    // not counted, and not sent to the app / a server
    const query = (w.emitted('query-change') as { filters: { columns: object } }[][]).at(-1)![0]!
    expect(query.filters.columns).toEqual({})
  })

  it('lazy children of a selected parent arrive selected (cascade)', async () => {
    const parents = [{ id: 1, name: 'P' }]
    const w = mount(VGrid, {
      props: {
        rows: parents,
        columns: [{ key: 'name' }],
        rowKey: 'id',
        selectable: true,
        selectionMode: 'cascade',
        loadSubRows: async () => [
          { id: 11, name: 'c1' },
          { id: 12, name: 'c2' },
        ],
        selected: [1],
        expanded: [1],
        'onUpdate:selected': (keys: unknown[]) => w.setProps({ selected: keys }),
      },
    })
    await flushPromises()
    await nextTick()
    expect([...(w.emitted('update:selected')!.at(-1)![0] as number[])].sort()).toEqual([1, 11, 12])
    const boxes = w.findAll('.vg-row input[type="checkbox"]')
    expect(boxes.length).toBe(3)
    for (const b of boxes) expect((b.element as HTMLInputElement).checked).toBe(true)
  })

  it('reload() and reloadSubRows() load lazy children again', async () => {
    let version = 1
    const w = mount(VGrid, {
      props: {
        rows: [{ id: 1, name: 'P' }],
        columns: [{ key: 'name' }],
        rowKey: 'id',
        expanded: [1],
        loadSubRows: async () => [{ id: 10 + version, name: `child v${version}` }],
      },
    })
    await flushPromises()
    expect(w.text()).toContain('child v1')
    version = 2
    ;(w.vm as unknown as VGridExposed).reloadSubRows(1)
    await flushPromises()
    expect(w.text()).toContain('child v2')
    version = 3
    await (w.vm as unknown as VGridExposed).reload()
    await flushPromises()
    expect(w.text()).toContain('child v3')
  })
})

it('ignores the old lazy request after reloading the same expanded parent', async () => {
  type Row = { id: number; name: string }
  const requests: ((rows: Row[]) => void)[] = []
  const w = mount(VGrid, {
    props: {
      rows: [{ id: 1, name: 'Parent' }],
      columns: [{ key: 'name' }],
      rowKey: 'id',
      expanded: [1],
      loadSubRows: () => new Promise<Row[]>((resolve) => requests.push(resolve)),
    },
  })
  await flushPromises()
  ;(w.vm as unknown as VGridExposed).reloadSubRows(1)
  await flushPromises()
  expect(requests).toHaveLength(2)
  requests[1]!([{ id: 2, name: 'Fresh' }])
  await flushPromises()
  requests[0]!([{ id: 3, name: 'Stale' }])
  await flushPromises()
  expect(w.text()).toContain('Fresh')
  w.unmount()
})
