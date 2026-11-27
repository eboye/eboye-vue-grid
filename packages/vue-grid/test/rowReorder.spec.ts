import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { moveRow } from '../src/core/rowMove'
import { rowReorderFeature } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { ColumnDef, RowMoveEvent } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

describe('moveRow', () => {
  const [a, b, c, d] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  const rows = [a, b, c, d]
  it('puts the row before or after the target, in a new array', () => {
    expect(moveRow(rows, { row: a, target: c, position: 'after' })).toEqual([b, c, a, d])
    expect(moveRow(rows, { row: d, target: b, position: 'before' })).toEqual([a, d, b, c])
    expect(moveRow(rows, { row: b, target: d, position: 'after' })).toEqual([a, c, d, b])
    expect(rows).toEqual([a, b, c, d])
  })
  it('a row or target not in the array, or the row onto itself: the same array', () => {
    expect(moveRow(rows, { row: { id: 'x' }, target: a, position: 'after' })).toBe(rows)
    expect(moveRow(rows, { row: a, target: { id: 'x' }, position: 'after' })).toBe(rows)
    expect(moveRow(rows, { row: a, target: a, position: 'before' })).toBe(rows)
  })
})

interface Row {
  id: number
  name: string
  children?: Row[]
}
const columns: ColumnDef<Row>[] = [{ key: 'name', header: 'Name', sortable: true }]
const rows = (): Row[] => [
  {
    id: 1,
    name: 'One',
    children: [
      { id: 11, name: 'One.1' },
      { id: 12, name: 'One.2' },
    ],
  },
  { id: 2, name: 'Two' },
  { id: 3, name: 'Three' },
]

const mounted: VueWrapper[] = []
afterEach(() => {
  for (const w of mounted.splice(0)) if (w.exists()) w.unmount()
})
function make(props: Record<string, unknown> = {}) {
  const w = mount(VGrid, {
    attachTo: document.body,
    props: { rows: rows(), columns, rowKey: 'id', rowReorder: true, ...props },
  })
  mounted.push(w)
  return w
}
const altKey = (w: VueWrapper, id: number, key: 'ArrowUp' | 'ArrowDown') =>
  w
    .find(`.vg-row[data-row-key="${id}"] > [data-col-key="name"]`)
    .element.dispatchEvent(new KeyboardEvent('keydown', { key, altKey: true, bubbles: true }))

describe('row-reorder', () => {
  it('a handle column first, a handle per row; none without the prop', () => {
    const w = make()
    const first = w.find('.vg-row[data-row-key="2"] > .vg-cell')
    expect(first.attributes('data-col-key')).toBe('__vg_drag')
    expect(first.find('.vg-row-handle').attributes('aria-label')).toBe('Move row')
    expect(w.find('.vg-header > [data-col-key="__vg_drag"]').exists()).toBe(true)
    expect(make({ rowReorder: false }).find('.vg-row-handle').exists()).toBe(false)
  })

  it('Alt+↓ / Alt+↑ emit row-move with the neighbour, at the top level', async () => {
    const w = make()
    await nextTick()
    altKey(w, 2, 'ArrowDown')
    const e = w.emitted('row-move')![0]![0] as RowMoveEvent<Row>
    expect(e).toMatchObject({
      rowKey: 2,
      targetKey: 3,
      position: 'after',
      parent: null,
      parentKey: null,
      source: 'keyboard',
    })
    expect(e.row.name).toBe('Two')
    altKey(w, 2, 'ArrowUp')
    expect(w.emitted('row-move')![1]![0]).toMatchObject({ targetKey: 1, position: 'before' })
    // the first row going up, the last going down: nothing
    altKey(w, 1, 'ArrowUp')
    altKey(w, 3, 'ArrowDown')
    expect(w.emitted('row-move')).toHaveLength(2)
  })

  it('a nested row moves among its siblings, with its parent in the event', async () => {
    const w = make({ subRows: (r: Row) => r.children, expanded: [1] })
    await nextTick()
    altKey(w, 11, 'ArrowDown')
    expect(w.emitted('row-move')![0]![0]).toMatchObject({
      rowKey: 11,
      targetKey: 12,
      position: 'after',
      parentKey: 1,
    })
    altKey(w, 12, 'ArrowDown') // last child: not onto the next top-level row
    expect(w.emitted('row-move')).toHaveLength(1)
  })

  it('keeps the types of sibling and parent keys from the DOM', async () => {
    const w = make({
      rows: [
        { id: 1, name: 'Other parent' },
        {
          id: '1',
          name: 'Parent',
          children: [
            { id: 2, name: 'First' },
            { id: '2', name: 'Second' },
          ],
        },
      ],
      subRows: (r: Row) => r.children,
      expanded: ['1'],
    })
    await nextTick()
    await w
      .find('.vg-row[data-row-key="2"][data-vg-row-key-type="string"] > [data-col-key="name"]')
      .trigger('keydown', { key: 'ArrowUp', altKey: true })
    expect(w.emitted('row-move')?.[0]?.[0]).toMatchObject({
      rowKey: '2',
      targetKey: 2,
      parentKey: '1',
      position: 'before',
    })
  })

  it('while sorted: handles off, no row-move', async () => {
    const w = make({ sort: { key: 'name', dir: 'asc' }, sortMode: 'client' })
    await nextTick()
    expect(w.find('.vg-row-handle').attributes()).toHaveProperty('disabled')
    altKey(w, 2, 'ArrowDown')
    expect(w.emitted('row-move')).toBeUndefined()
  })

  it('pinned rows and the totals row get no handle', () => {
    const w = make({ pinnedRows: { top: [3] }, totals: true })
    expect(w.find('.vg-pinned-top .vg-row-handle').exists()).toBe(false)
    expect(w.find('.vg-row-total .vg-row-handle').exists()).toBe(false)
    expect(w.findAll('.vg > .vg-row .vg-row-handle').length).toBeGreaterThan(0)
  })

  it('without the feature: no handle column, with a warning naming it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const saved = config.global.plugins
    config.global.plugins = [createVueGrid({ renderers: allRenderers })]
    try {
      const w = make()
      expect(w.find('[data-col-key="__vg_drag"]').exists()).toBe(false)
      expect(warn.mock.calls.flat().join(' ')).toContain('rowReorderFeature')
      const w2 = make({ features: [rowReorderFeature] })
      expect(w2.find('.vg-row-handle').exists()).toBe(true)
    } finally {
      config.global.plugins = saved
      warn.mockRestore()
    }
  })
})
