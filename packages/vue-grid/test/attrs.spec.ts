import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { attributesFeature } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { CellAttrsContext, ColumnDef, RowAttrsContext } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  team: string
  children?: Row[]
}
const rows: Row[] = [
  { id: 1, name: 'Cy', team: 'B' },
  { id: 2, name: 'Ana', team: 'A', children: [{ id: 21, name: 'Kid', team: 'A' }] },
  { id: 3, name: 'Bo', team: 'B' },
]
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#', pinned: 'left' },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'team', header: 'Team' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  for (const w of mounted.splice(0)) if (w.exists()) w.unmount()
})
function make(props: Record<string, unknown> = {}) {
  const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', ...props } })
  mounted.push(w)
  return w
}
const row = (w: VueWrapper, id: number) => w.find(`.vg-row[data-row-key="${id}"]`)
const cell = (w: VueWrapper, id: number, key: string) =>
  w.find(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const attrNames = (w: VueWrapper, sel: string) =>
  w.findAll(sel).map((el) => el.element.getAttributeNames().sort().join(' '))

describe('rowAttrs and cellAttrs', () => {
  it('adds native header hooks without overriding sort and column attributes', async () => {
    const w = make({
      columnHeaderAttrs: ({ columnKey }: { columnKey: string }) => ({
        'data-test': `header-${columnKey}`,
        'data-col-key': 'wrong',
        'data-sort-dir': 'desc',
        role: 'presentation',
      }),
    })
    const header = w.get('[data-test="header-name"]')
    expect(header.attributes('data-col-key')).toBe('name')
    expect(header.attributes('role')).toBe('columnheader')
    expect(header.attributes('data-sort-dir')).toBeUndefined()
    await header.get('button.vg-sort').trigger('click')
    expect(header.attributes('aria-sort')).toBe('ascending')
    await w.setProps({ columnHeaderAttrs: undefined })
    expect(
      w.get('[role="columnheader"][data-col-key="name"]').attributes('data-test'),
    ).toBeUndefined()
  })

  it('without them, rows and cells carry only the grid’s own attributes', () => {
    const plain = make()
    const withNothing = make({ rowAttrs: () => undefined, cellAttrs: () => null })
    expect(attrNames(withNothing, '.vg-row')).toEqual(attrNames(plain, '.vg-row'))
    expect(attrNames(withNothing, '.vg-cell')).toEqual(attrNames(plain, '.vg-cell'))
  })

  it('rowAttrs: one call per data row with its position as shown; sorting moves it', async () => {
    const seen: RowAttrsContext<Row>[] = []
    const w = make({
      rowAttrs: (ctx: RowAttrsContext<Row>) => {
        seen.push(ctx)
        return { 'data-test': `row-${ctx.rowIndex}`, 'data-name': ctx.row.name }
      },
    })
    expect(row(w, 1).attributes('data-test')).toBe('row-0')
    expect(row(w, 3).attributes('data-test')).toBe('row-2')
    expect(seen.find((c) => c.rowKey === 2)).toMatchObject({ rowIndex: 1, depth: 0 })
    expect(seen.find((c) => c.rowKey === 2)?.pinned).toBeUndefined()
    await w.setProps({ sort: { key: 'name', dir: 'asc' }, sortMode: 'client' })
    await nextTick()
    // Ana, Bo, Cy
    expect(row(w, 2).attributes('data-test')).toBe('row-0')
    expect(row(w, 3).attributes('data-test')).toBe('row-1')
    expect(row(w, 1).attributes('data-test')).toBe('row-2')
  })

  it('the grid keeps its own attributes, classes and handlers; null leaves one out', () => {
    const w = make({
      rowAttrs: () => ({
        role: 'presentation',
        'aria-rowindex': 0,
        'data-row-key': 'x',
        class: 'mine',
        style: 'color: red',
        onclick: 'alert(1)',
        'data-gone': null,
        'data-flag': true,
        'bad name': 'x',
      }),
      cellAttrs: () => ({ 'data-col-key': 'x', tabindex: 5, 'data-vg-flash': 1, 'data-test': 'c' }),
    })
    const r = row(w, 1)
    expect(r.attributes('role')).toBe('row')
    expect(r.attributes('data-row-key')).toBe('1')
    expect(r.attributes()).not.toHaveProperty('aria-rowindex')
    expect(r.classes()).not.toContain('mine')
    expect(r.attributes()).not.toHaveProperty('style')
    expect(r.attributes()).not.toHaveProperty('onclick')
    expect(r.attributes()).not.toHaveProperty('data-gone')
    expect(r.attributes('data-flag')).toBe('true')
    const c = cell(w, 1, 'name')
    expect(c.attributes('data-col-key')).toBe('name')
    expect(c.attributes('tabindex')).not.toBe('5')
    expect(c.attributes()).not.toHaveProperty('data-vg-flash')
    expect(c.attributes('data-test')).toBe('c')
  })

  it('an attribute dropped by a later render is removed; a changed one is updated', async () => {
    const w = make({ rowAttrs: () => ({ 'data-a': 'one', 'data-b': 'x' }) })
    expect(row(w, 1).attributes('data-a')).toBe('one')
    await w.setProps({ rowAttrs: () => ({ 'data-a': 'two' }) })
    await nextTick()
    expect(row(w, 1).attributes('data-a')).toBe('two')
    expect(row(w, 1).attributes()).not.toHaveProperty('data-b')
  })

  it('without attributesFeature the props do nothing, with a warning naming it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const saved = config.global.plugins
    config.global.plugins = [createVueGrid({ renderers: allRenderers })]
    try {
      const detailExpanderAttrs = vi.fn(() => ({ 'aria-label': 'Custom details' }))
      const w = mount(VGrid, {
        props: {
          rows,
          columns,
          rowKey: 'id',
          rowAttrs: () => ({ 'data-test': 'r' }),
          detailExpanded: [],
          detailExpanderAttrs,
        },
        slots: { detail: 'Details' },
      })
      mounted.push(w)
      expect(row(w, 1).attributes()).not.toHaveProperty('data-test')
      expect(row(w, 1).get('.vg-detail-expander').attributes('aria-label')).toBe('Show row details')
      expect(detailExpanderAttrs).not.toHaveBeenCalled()
      expect(warn.mock.calls.flat().join(' ')).toContain('attributesFeature')
      // with it, per grid
      const w2 = mount(VGrid, {
        props: {
          rows,
          columns,
          rowKey: 'id',
          features: [attributesFeature],
          rowAttrs: () => ({ 'data-test': 'r' }),
        },
      })
      mounted.push(w2)
      expect(row(w2, 1).attributes('data-test')).toBe('r')
    } finally {
      config.global.plugins = saved
      warn.mockRestore()
    }
  })

  it('cellAttrs: column key, position (selection checkbox included), kind and pinned side', () => {
    const seen: CellAttrsContext<Row>[] = []
    const w = make({
      selectable: true,
      cellAttrs: (ctx: CellAttrsContext<Row>) => {
        seen.push(ctx)
        return { 'data-rgcol': ctx.columnIndex, 'data-test': `${ctx.columnKey}-${ctx.rowIndex}` }
      },
    })
    const forRow = seen.filter((c) => c.rowKey === 3)
    expect(forRow.map((c) => [c.kind, c.columnIndex, c.columnPinned])).toEqual([
      ['select', 0, expect.anything()],
      ['data', 1, 'left'],
      ['data', 2, undefined],
      ['data', 3, undefined],
    ])
    expect(forRow[2]).toMatchObject({ column: columns[1], rowIndex: 2, depth: 0 })
    expect(cell(w, 3, 'team').attributes('data-rgcol')).toBe('3')
    expect(cell(w, 3, 'team').attributes('data-test')).toBe('team-2')
  })

  it('tree children count from 0 under their parent, with their depth', async () => {
    const seen: RowAttrsContext<Row>[] = []
    const w = make({
      subRows: (r: Row) => r.children,
      expanded: [2],
      rowAttrs: (ctx: RowAttrsContext<Row>) => (seen.push(ctx), { 'data-depth-test': ctx.depth }),
    })
    await nextTick()
    expect(seen.find((c) => c.rowKey === 21)).toMatchObject({ rowIndex: 0, depth: 1 })
    expect(row(w, 21).attributes('data-depth-test')).toBe('1')
  })

  it('pinned rows: their section and their position in it; the totals row gets none', () => {
    const w = make({
      pinnedRows: { top: [3], bottom: [1] },
      totals: true,
      columns: columns.map((c) => (c.key === 'id' ? { ...c, aggregate: 'count' } : c)),
      rowAttrs: (ctx: RowAttrsContext<Row>) => ({
        'data-test': `${ctx.pinned ?? 'body'}-${ctx.rowIndex}`,
      }),
      cellAttrs: (ctx: CellAttrsContext<Row>) => ({ 'data-pin': ctx.pinned ?? 'body' }),
    })
    const top = w.find('.vg-pinned-top .vg-row[data-pinned-key="3"]')
    expect(top.attributes('data-test')).toBe('top-0')
    expect(top.find('.vg-cell').attributes('data-pin')).toBe('top')
    expect(w.find('.vg-pinned-bottom .vg-row[data-pinned-key="1"]').attributes('data-test')).toBe(
      'bottom-0',
    )
    const total = w.find('.vg-row-total')
    expect(total.exists()).toBe(true)
    expect(total.attributes()).not.toHaveProperty('data-test')
    expect(total.find('[data-pin]').exists()).toBe(false)
  })

  it('group rows get none; the data rows under them do', async () => {
    const w = make({
      groupBy: ['team'],
      groupsExpanded: true,
      rowAttrs: () => ({ 'data-test': 'data-row' }),
    })
    await nextTick()
    const groups = w.findAll('.vg-rowgroup')
    expect(groups.length).toBe(2)
    for (const g of groups) expect(g.attributes()).not.toHaveProperty('data-test')
    expect(row(w, 1).attributes('data-test')).toBe('data-row')
  })
})
