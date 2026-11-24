import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import type { ColumnDef, VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  kids?: Row[]
}
const rows: Row[] = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `R${i + 1}` }))
const columns: ColumnDef<Row>[] = [{ key: 'name', filterable: true }]
type W = ReturnType<typeof mount>
/** Promises, Vue updates and on-demand chunks (the banner) all settled. */
const settle = async () => {
  await flushPromises()
  await vi.dynamicImportSettled()
  await flushPromises()
}

const box = (w: W, key: number) => w.find(`[data-row-key="${key}"] .vg-cell-select input`)
/** Clicks a row's checkbox, as a mouse click (optionally with Shift). */
const click = (w: W, key: number, shiftKey = false) => box(w, key).trigger('click', { shiftKey })
const lastSelected = (w: W) => [...((w.emitted('update:selected')?.at(-1)?.[0] as number[]) ?? [])].sort((a, b) => a - b)
/** Mounts with `v-model:selected` wired back, like an app. */
function mountGrid(props: Record<string, unknown> = {}) {
  const w: W = mount(VGrid, {
    props: { rows, columns, rowKey: 'id', selectable: true, selected: [], 'onUpdate:selected': (v: unknown) => w.setProps({ selected: v }), ...props },
    attachTo: document.body,
  })
  return w
}

describe('shift ranges', () => {
  it('shift-click selects every row from the last toggled one, in display order', async () => {
    const w = mountGrid({ sortMode: 'client', sort: { key: 'name', dir: 'desc' } }) // R8 … R1
    await click(w, 7)
    await click(w, 3, true)
    expect(lastSelected(w)).toEqual([3, 4, 5, 6, 7])
    // a shift-click on a selected row clears the range from the new anchor
    await click(w, 5, true)
    expect(lastSelected(w)).toEqual([6, 7])
  })

  it('skips rows that cannot be selected, and rows hidden by filters', async () => {
    const w = mountGrid({ isRowSelectable: (r: Row) => r.id !== 3 })
    await w.setProps({ filters: { columns: { name: { type: 'text', op: 'notContains', value: '5' } }, search: '' } })
    await click(w, 2)
    await click(w, 7, true)
    expect(lastSelected(w)).toEqual([2, 4, 6, 7])
  })

  it('covers expanded children (cascading) and works with Shift+Space', async () => {
    const tree: Row[] = [
      { id: 1, name: 'A', kids: [{ id: 11, name: 'A1' }, { id: 12, name: 'A2' }] },
      { id: 2, name: 'B', kids: [{ id: 21, name: 'B1' }] },
      { id: 3, name: 'C' },
    ]
    const w = mountGrid({ rows: tree, subRows: (r: Row) => r.kids, expanded: [1] })
    await click(w, 12)
    await click(w, 2, true) // A2 … B, and B's child by cascade
    expect(lastSelected(w)).toEqual([2, 12, 21])

    const k = mountGrid({ features: undefined })
    await click(k, 1)
    const cell = k.find('[data-row-key="4"] .vg-cell-select').element as HTMLElement
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', shiftKey: true, bubbles: true, cancelable: true }))
    await flushPromises()
    expect(lastSelected(k)).toEqual([1, 2, 3, 4])
  })
})

describe('batch actions', () => {
  it('the toolbar gets the selection, its count and clearSelection', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', selectable: true, selected: [2, 5] },
      slots: {
        toolbar: (s: { selected: number[]; selectedCount: number; clearSelection: () => void }) =>
          h('div', { class: 'bar' }, [`${s.selectedCount}: ${s.selected.join(',')}`, h('button', { onClick: s.clearSelection }, 'clear')]),
      },
    })
    expect(w.find('.bar').text()).toContain('2: 2,5')
    await w.find('.bar button').trigger('click')
    expect(w.emitted('update:selected')?.at(-1)).toEqual([[]])
    ;(w.vm as unknown as VGridExposed).clearSelection()
  })

  it('prune-selection drops keys whose rows are gone; by default they stay', async () => {
    const keep = mountGrid({ selected: [1, 8] })
    await keep.setProps({ rows: rows.slice(0, 4) })
    expect(keep.emitted('update:selected')).toBeUndefined()
    const prune = mountGrid({ selected: [1, 8], pruneSelection: true })
    await prune.setProps({ rows: rows.slice(0, 4) })
    expect(lastSelected(prune)).toEqual([1])
  })
})

describe('select all matching (server data)', () => {
  const page = rows.slice(0, 3)
  const dataSource = async () => ({ rows: page, total: 120 })
  async function mountServer(props: Record<string, unknown> = {}) {
    const w: W = mount(VGrid, {
      props: {
        dataSource,
        columns,
        rowKey: 'id',
        selectable: true,
        selected: [],
        'onUpdate:selected': (v: unknown) => w.setProps({ selected: v }),
        'onUpdate:selectAllMatching': (v: unknown) => w.setProps({ selectAllMatching: v }),
        ...props,
      },
      slots: { toolbar: (s: { selectedCount: number }) => h('span', { class: 'count' }, String(s.selectedCount)) },
      attachTo: document.body, // jsdom only toggles checkboxes in the document
    })
    await settle()
    return w
  }

  it('offers all matching rows once the page is selected; unticking a row goes back to the page', async () => {
    const w = await mountServer()
    expect(w.find('.vg-selection-banner').exists()).toBe(false)
    await w.find('.vg-header input[type="checkbox"]').trigger('click')
    await settle()
    expect(w.find('.vg-selection-banner').text()).toContain('All 3 rows on this page are selected.')
    await w.find('.vg-selection-banner button').trigger('click')
    expect(w.emitted('update:selectAllMatching')?.at(-1)).toEqual([true])
    expect(w.find('.vg-selection-banner').text()).toContain('All 120 rows are selected.')
    expect(w.find('.count').text()).toBe('120')

    await click(w, 2)
    expect(w.emitted('update:selectAllMatching')?.at(-1)).toEqual([false])
    expect(lastSelected(w)).toEqual([1, 3])
    expect(w.find('.vg-selection-banner').exists()).toBe(false)
  })

  it('unticking a row on a page whose keys were never in `selected` keeps the rest of that page', async () => {
    // "all matching" chosen, then another page loaded: its keys aren't in `selected` yet
    const w = await mountServer({ selected: [], selectAllMatching: true })
    await click(w, 2)
    await settle()
    expect(w.emitted('update:selectAllMatching')?.at(-1)).toEqual([false])
    expect(lastSelected(w)).toEqual([1, 3])
    expect(w.emitted('update:selected')).toHaveLength(1) // one write: a v-model parent can't miss half
  })

  it('ends when the filters change; Clear selection clears both', async () => {
    const w = await mountServer({ selected: [1, 2, 3], selectAllMatching: true })
    expect(w.findAll('.vg-cell-select input:checked').length).toBeGreaterThanOrEqual(3)
    await w.find('.vg-selection-banner button').trigger('click') // Clear selection
    expect(w.emitted('update:selectAllMatching')?.at(-1)).toEqual([false])
    expect(w.emitted('update:selected')?.at(-1)).toEqual([[]])

    const f = await mountServer({ selected: [1, 2, 3], selectAllMatching: true })
    await f.setProps({ filters: { columns: {}, search: 'R1' } })
    await settle()
    expect(f.emitted('update:selectAllMatching')?.at(-1)).toEqual([false])
  })
})
