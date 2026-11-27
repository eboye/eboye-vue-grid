import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import type { DataSource, GridQuery } from '../src/composables/useDataSource'
import { nextSorts, sortRowsBy } from '../src/core/sort'
import type { SortState } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  city: string
  stake: number | null
}
const rows: Row[] = [
  { id: 1, city: 'Niš', stake: 20 },
  { id: 2, city: 'Beograd', stake: 10 },
  { id: 3, city: 'Niš', stake: 10 },
  { id: 4, city: 'Beograd', stake: null },
  { id: 5, city: 'Beograd', stake: 30 },
]
const columns = [
  { key: 'id', header: '#', sortable: true },
  { key: 'city', header: 'City', sortable: true, groupable: true },
  { key: 'stake', header: 'Stake', sortable: true },
]
const ids = (w: ReturnType<typeof mount>) =>
  w.findAll('.vg-row:not(.vg-rowgroup)').map((r) => Number(r.attributes('data-row-key')))
const sortButton = (w: ReturnType<typeof mount>, key: string) =>
  w.find(`[role="columnheader"][data-col-key="${key}"] .vg-sort`)
const click = async (w: ReturnType<typeof mount>, key: string, shiftKey = false) => {
  await sortButton(w, key).trigger('click', { shiftKey })
  await flushPromises()
}

describe('sortRowsBy / nextSorts', () => {
  it('sorts by several keys, ties to the next, nil last per key, stable', () => {
    const out = sortRowsBy(rows, [
      { dir: 'asc', getValue: (r) => r.city },
      { dir: 'desc', getValue: (r) => r.stake },
    ])
    expect(out.map((r) => r.id)).toEqual([5, 2, 4, 1, 3])
    expect(sortRowsBy(rows, []).map((r) => r.id)).toEqual([1, 2, 3, 4, 5])
    // a compare function replaces the value
    const byLength = sortRowsBy(rows, [
      { dir: 'asc', getValue: () => 0, compare: (a, b) => a.city.length - b.city.length },
    ])
    expect(byLength.map((r) => r.id)).toEqual([1, 3, 2, 4, 5])
  })

  it('Shift-click cycle: add ascending → descending → removed', () => {
    let s: SortState[] = [{ key: 'city', dir: 'asc' }]
    s = nextSorts(s, 'stake')
    expect(s).toEqual([
      { key: 'city', dir: 'asc' },
      { key: 'stake', dir: 'asc' },
    ])
    s = nextSorts(s, 'stake')
    expect(s[1]).toEqual({ key: 'stake', dir: 'desc' })
    expect(nextSorts(s, 'stake')).toEqual([{ key: 'city', dir: 'asc' }])
  })
})

describe('multi-column sort in the grid', () => {
  /** A grid whose v-models write back to it (like an app's `v-model`). */
  const mountGrid = (props: Record<string, unknown> = {}) => {
    const self: { w?: ReturnType<typeof mount> } = {}
    self.w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        sortMode: 'client',
        multiSort: true,
        'onUpdate:sorts': (v: unknown) => self.w?.setProps({ sorts: v }),
        'onUpdate:sort': (v: unknown) => self.w?.setProps({ sort: v }),
        ...props,
      },
    })
    return self.w
  }
  let w: ReturnType<typeof mount>

  it('clears the legacy sort when the controlled sort array is emptied in place', async () => {
    const sorts = reactive<SortState[]>([{ key: 'stake', dir: 'asc' }])
    w = mountGrid({ sorts })
    await flushPromises()
    expect(ids(w)).toEqual([2, 3, 1, 5, 4])
    sorts.splice(0)
    await flushPromises()
    expect(w.props('sort' as never)).toBeNull()
    expect(ids(w)).toEqual([1, 2, 3, 4, 5])
    w.unmount()
  })

  it('Shift-click adds keys; the rows sort by all of them; sort stays the first key', async () => {
    w = mountGrid()
    await click(w, 'city')
    await click(w, 'stake', true)
    expect(w.props('sorts' as never)).toEqual([
      { key: 'city', dir: 'asc' },
      { key: 'stake', dir: 'asc' },
    ])
    expect(w.props('sort' as never)).toEqual({ key: 'city', dir: 'asc' })
    expect(ids(w)).toEqual([2, 5, 4, 3, 1])
    await click(w, 'stake', true) // descending
    expect(ids(w)).toEqual([5, 2, 4, 1, 3])
    await click(w, 'stake', true) // removed
    expect(w.props('sorts' as never)).toEqual([{ key: 'city', dir: 'asc' }])
    // a plain click: that column alone
    await click(w, 'city', true)
    await click(w, 'id')
    expect(w.props('sorts' as never)).toEqual([{ key: 'id', dir: 'asc' }])
  })

  it('headers: 1, 2 markers, direction on each, aria-sort on the first only', async () => {
    w = mountGrid({
      sorts: [
        { key: 'city', dir: 'asc' },
        { key: 'stake', dir: 'desc' },
      ],
    })
    await flushPromises()
    const head = (key: string) => w.find(`[role="columnheader"][data-col-key="${key}"]`)
    expect(head('city').find('.vg-sort-index').text()).toBe('1')
    expect(head('stake').find('.vg-sort-index').text()).toBe('2')
    expect(head('city').attributes('aria-sort')).toBe('ascending')
    expect(head('stake').attributes('aria-sort')).toBe('none')
    expect(head('stake').attributes('data-sort-dir')).toBe('desc')
    expect(head('stake').find('.vg-sr-only').text()).toBe(', sorted 2 of 2, descending')
    expect(head('id').find('.vg-sort-index').exists()).toBe(false)
  })

  it('setting sort from outside makes it the only key', async () => {
    w = mountGrid({
      sorts: [
        { key: 'city', dir: 'asc' },
        { key: 'stake', dir: 'desc' },
      ],
    })
    await flushPromises()
    await w.setProps({ sort: { key: 'id', dir: 'desc' } })
    await flushPromises()
    expect(w.emitted('update:sorts')!.at(-1)).toEqual([[{ key: 'id', dir: 'desc' }]])
  })

  it('without multi-sort, Shift-click is a plain click', async () => {
    w = mountGrid({ multiSort: false })
    await click(w, 'city')
    await click(w, 'stake', true)
    expect(w.props('sort' as never)).toEqual({ key: 'stake', dir: 'asc' })
    expect(w.emitted('update:sorts')!.at(-1)).toEqual([[{ key: 'stake', dir: 'asc' }]])
  })

  it('server data gets every key in query.sorts (only with multi-sort)', async () => {
    const queries: GridQuery[] = []
    const source: DataSource<Row> = async (q) => {
      queries.push(JSON.parse(JSON.stringify(q)))
      return { rows }
    }
    w = mountGrid({
      rows: undefined,
      dataSource: source,
      sorts: [
        { key: 'city', dir: 'asc' },
        { key: 'stake', dir: 'desc' },
      ],
    })
    await flushPromises()
    expect(queries.at(-1)).toMatchObject({
      sort: { key: 'city', dir: 'asc' },
      sorts: [
        { key: 'city', dir: 'asc' },
        { key: 'stake', dir: 'desc' },
      ],
    })
    const plain = mount(VGrid, { props: { dataSource: source, columns, rowKey: 'id' } })
    await flushPromises()
    expect(queries.at(-1)).not.toHaveProperty('sorts')
    plain.unmount()
  })

  it('header menu: Then sort …, and Clear sort removes only that key', async () => {
    w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows,
        columns,
        rowKey: 'id',
        sortMode: 'client',
        multiSort: true,
        sorts: [{ key: 'city', dir: 'asc' }],
        'onUpdate:sorts': (v: unknown) => w.setProps({ sorts: v }),
      },
    })
    await flushPromises()
    const open = async (key: string) => {
      w.find(`[role="columnheader"][data-col-key="${key}"]`).element.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
      )
      await flushPromises()
    }
    const item = (label: string) =>
      w.findAll('[role="menu"] [role="menuitem"]').find((b) => b.text() === label)
    await open('stake')
    await item('Then sort descending')!.trigger('click')
    await flushPromises()
    expect(w.props('sorts' as never)).toEqual([
      { key: 'city', dir: 'asc' },
      { key: 'stake', dir: 'desc' },
    ])
    await open('city')
    await item('Clear sort')!.trigger('click')
    await flushPromises()
    expect(w.props('sorts' as never)).toEqual([{ key: 'stake', dir: 'desc' }])
    w.unmount()
  })

  it('row grouping: groups follow their column’s key, wherever it is in the sort', async () => {
    w = mountGrid({
      groupBy: ['city'],
      groupsExpanded: true,
      sorts: [
        { key: 'stake', dir: 'asc' },
        { key: 'city', dir: 'desc' },
      ],
    })
    await flushPromises()
    const groups = w.findAll('.vg-rowgroup .vg-rowgroup-value').map((g) => g.text())
    expect(groups).toEqual(['Niš', 'Beograd'])
    expect(ids(w)).toEqual([3, 1, 2, 5, 4]) // inside each group, by stake
  })
})
