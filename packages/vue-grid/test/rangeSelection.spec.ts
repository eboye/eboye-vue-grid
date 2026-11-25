import { beforeEach, describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { CellRange, ColumnDef, CopyEvent, VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  stake: number
  city: string
  kids?: Row[]
}
const rows: Row[] = [
  { id: 1, name: 'Ana', stake: 10, city: 'Niš' },
  { id: 2, name: 'Bo', stake: 20, city: 'Beograd' },
  { id: 3, name: 'Cy', stake: 30, city: 'Niš' },
  { id: 4, name: 'Di', stake: 40, city: 'Novi Sad' },
]
const columns: ColumnDef<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'stake', header: 'Stake', renderer: 'currency', rendererOptions: { currency: 'EUR' } },
  { key: 'city', header: 'City' },
]

let clipboard: string[]
beforeEach(() => {
  clipboard = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async (t: string) => void clipboard.push(t)) },
  })
})

const make = (props: Record<string, unknown> = {}) =>
  mount(VGrid, {
    attachTo: document.body,
    props: { rows, columns, rowKey: 'id', rangeSelection: true, locale: 'en-US', ...props },
  })
const api = (w: VueWrapper) => w.vm as unknown as VGridExposed
const cell = (w: VueWrapper, id: number, key: string) =>
  w.find(`[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const inRange = (w: VueWrapper) =>
  w
    .findAll('.vg-cell.vg-in-range')
    .map((c) => `${c.element.parentElement!.dataset.rowKey}:${c.attributes('data-col-key')}`)
const key = (w: VueWrapper, target: Element, init: KeyboardEventInit) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
const range = (a: [number, string], b: [number, string]): CellRange => ({
  start: { rowKey: a[0], columnKey: a[1] },
  end: { rowKey: b[0], columnKey: b[1] },
})

describe('cell-range selection', () => {
  it('v-model:range marks the block, outlined on its edges', async () => {
    const w = make({ range: range([3, 'city'], [2, 'stake']) })
    await flushPromises()
    expect(inRange(w)).toEqual(['2:stake', '2:city', '3:stake', '3:city'])
    const corner = cell(w, 2, 'stake').classes()
    expect(corner).toEqual(expect.arrayContaining(['vg-range-top', 'vg-range-left']))
    expect(corner).not.toContain('vg-range-bottom')
    expect(cell(w, 3, 'city').classes()).toEqual(
      expect.arrayContaining(['vg-range-bottom', 'vg-range-right']),
    )
    // in the grid's order: values and copied text follow it
    expect(api(w).getRangeValues()).toEqual([
      [20, 'Beograd'],
      [30, 'Niš'],
    ])
    expect(await api(w).copyRange()).toBe(true)
    expect(clipboard).toEqual(['€20.00\tBeograd\n€30.00\tNiš'])
    const copied = w.emitted('copy')![0]![0] as CopyEvent<Row>
    expect(copied.kind).toBe('range')
    expect(copied.rows.map((r) => r.id)).toEqual([2, 3])
    expect(copied.columns.map((c) => c.key)).toEqual(['stake', 'city'])
    w.unmount()
  })

  it('follows sorting: the same corner cells, the rows between them now', async () => {
    const w = make({
      range: range([1, 'name'], [2, 'name']),
      sortMode: 'client',
      sort: { key: 'name', dir: 'desc' },
    })
    await flushPromises()
    // desc: Di, Cy, Bo, Ana → from Bo (2) to Ana (1): just those two
    expect(inRange(w)).toEqual(['2:name', '1:name'])
    await w.setProps({ sort: { key: 'name', dir: 'asc' } })
    expect(inRange(w)).toEqual(['1:name', '2:name'])
    w.unmount()
  })

  it('the mouse: press and drag across cells; Shift+click extends from the anchor', async () => {
    const w = make()
    await flushPromises()
    const down = (el: Element, init: MouseEventInit = {}) =>
      el.dispatchEvent(
        new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, ...init }),
      )
    const move = (el: Element) =>
      el.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, buttons: 1 }))
    down(cell(w, 1, 'name').element)
    move(cell(w, 1, 'stake').element)
    move(cell(w, 3, 'stake').element)
    await flushPromises()
    expect(inRange(w)).toHaveLength(6)
    expect(w.emitted('update:range')!.at(-1)![0]).toEqual(range([1, 'name'], [3, 'stake']))
    window.dispatchEvent(new MouseEvent('pointerup'))
    // moving without the button: no change
    move(cell(w, 4, 'city').element)
    await flushPromises()
    expect(inRange(w)).toHaveLength(6)
    // Shift+click: from the anchor (Ana / name) to Di / city
    down(cell(w, 4, 'city').element, { shiftKey: true })
    await flushPromises()
    expect(inRange(w)).toHaveLength(12)
    // a plain click: one cell, no range
    down(cell(w, 2, 'city').element)
    await flushPromises()
    expect(inRange(w)).toEqual([])
    expect(w.emitted('update:range')!.at(-1)![0]).toBe(null)
    w.unmount()
  })

  it('keys: Shift+arrows extend, Ctrl+A takes every cell, Esc clears, Ctrl+C copies', async () => {
    const w = make()
    await flushPromises()
    const start = cell(w, 2, 'name').element as HTMLElement
    start.focus()
    start.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    key(w, start, { key: 'ArrowDown', shiftKey: true })
    key(w, start, { key: 'ArrowRight', shiftKey: true })
    await flushPromises()
    expect(inRange(w)).toEqual(['2:name', '2:stake', '3:name', '3:stake'])
    key(w, start, { key: 'c', ctrlKey: true })
    await flushPromises()
    expect(clipboard).toEqual(['Bo\t€20.00\nCy\t€30.00'])
    // clamped at the edges
    for (let i = 0; i < 5; i++) key(w, start, { key: 'ArrowRight', shiftKey: true })
    await flushPromises()
    expect(inRange(w)).toHaveLength(6)
    key(w, start, { key: 'Escape' })
    await flushPromises()
    expect(inRange(w)).toEqual([])
    key(w, start, { key: 'a', ctrlKey: true })
    await flushPromises()
    expect(inRange(w)).toHaveLength(12)
    w.unmount()
  })

  it('spans expanded child rows, in the order they show', async () => {
    const tree: Row[] = [
      { ...rows[0]!, kids: [{ id: 11, name: 'Ana Jr', stake: 1, city: 'Niš' }] },
      rows[1]!,
    ]
    const w = make({
      rows: tree,
      subRows: (r: Row) => r.kids,
      expanded: [1],
      range: range([1, 'stake'], [2, 'stake']),
    })
    await flushPromises()
    expect(inRange(w)).toEqual(['1:stake', '11:stake', '2:stake'])
    expect(api(w).getRangeValues()).toEqual([[10], [1], [20]])
    w.unmount()
  })

  it('the status bar counts and adds up the range', async () => {
    const w = make({ statusBar: true, range: range([1, 'stake'], [3, 'stake']) })
    await vi.waitFor(() => expect(w.find('.vg-status-range').exists()).toBe(true))
    // one column: formatted like its cells
    expect(w.find('.vg-status-range').text()).toBe('3 cells:Sum €60.00Average €20.00')
    await w.setProps({ range: range([1, 'name'], [2, 'city']) })
    expect(w.find('.vg-status-range').text()).toBe('6 cells:Sum 30Average 15')
    await w.setProps({
      range: range([1, 'name'], [1, 'city']),
      messages: { cellCount: (n: number) => `${n} ćelije` },
    })
    expect(w.find('.vg-status-range').text()).toBe('3 ćelije:Sum 10Average 10')
    await w.setProps({ range: null })
    expect(w.find('.vg-status-range').exists()).toBe(false)
    w.unmount()
  })

  it('off unless `range-selection`; warns without the feature', async () => {
    const w = make({ rangeSelection: false, range: range([1, 'name'], [2, 'name']) })
    await flushPromises()
    expect(inRange(w)).toEqual([])
    w.unmount()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const saved = config.global.plugins
    config.global.plugins = [createVueGrid({ renderers: allRenderers })]
    const bare = make({ rangeSelection: true })
    config.global.plugins = saved
    await flushPromises()
    expect(warn.mock.calls.some((c) => String(c[0]).includes('rangeSelection'))).toBe(true)
    expect(await api(bare).copyRange()).toBe(false)
    warn.mockRestore()
    bare.unmount()
  })
})
