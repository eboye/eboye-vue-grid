import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { setCellValue } from '../src/core/value'
import type {
  CellEditEvent,
  CellRange,
  CellsPasteEvent,
  ColumnDef,
  VGridExposed,
} from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  stake: number | null
  placed: string
}
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#' },
  { key: 'name', header: 'Name', editable: true },
  { key: 'stake', header: 'Stake', renderer: 'number', editable: true },
  { key: 'placed', header: 'Placed', renderer: 'date', editable: (r) => r.id !== 5 },
]

function make(props: Record<string, unknown> = {}) {
  const rows = reactive<Row[]>(
    [1, 2, 3, 4, 5].map((id) => ({ id, name: `R${id}`, stake: id * 10, placed: '2026-05-01' })),
  )
  const edits: CellEditEvent<Row>[] = []
  const w = mount(VGrid, {
    attachTo: document.body,
    props: {
      rows,
      columns,
      rowKey: 'id',
      rangeSelection: true,
      'onCell-edit': (e: CellEditEvent<Row>) => {
        edits.push(e)
        setCellValue(e.row, e.column, e.value)
      },
      ...props,
    },
  })
  return { w, rows, edits }
}
const api = (w: VueWrapper) => w.vm as unknown as VGridExposed
const cell = (w: VueWrapper, id: number, key: string) =>
  w.find(`[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const range = (a: [number, string], b: [number, string]): CellRange => ({
  start: { rowKey: a[0], columnKey: a[1] },
  end: { rowKey: b[0], columnKey: b[1] },
})
const pointer = (el: Element, type: string, init: MouseEventInit = {}) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init }))

/** Drags the fill handle (jsdom has no layout: every box is 0×0, so the press is on it). */
async function dragHandle(w: VueWrapper, from: [number, string], to: [number, string]) {
  pointer(cell(w, ...from).element, 'pointerdown')
  pointer(cell(w, ...to).element, 'pointermove', { buttons: 1 })
  await flushPromises()
  const preview = w.findAll('.vg-fill-preview').length
  const before = w.emitted('cells-fill')?.length ?? 0
  window.dispatchEvent(new MouseEvent('pointerup'))
  // the fill code loads on the first fill (own chunk)
  await vi.waitFor(() => expect(w.emitted('cells-fill')?.length ?? 0).toBe(before + 1))
  await flushPromises()
  return preview
}

describe('fill handle', () => {
  it('sits on the selection’s last cell; only with editing and the part on', async () => {
    const { w } = make()
    api(w).selectRange(range([1, 'name'], [2, 'stake']))
    await flushPromises()
    expect(w.findAll('.vg-range-corner').map((c) => c.attributes('data-col-key'))).toEqual([
      'stake',
    ])
    expect(cell(w, 2, 'stake').classes()).toContain('vg-range-corner')
    await w.setProps({ parts: { fillHandle: false } })
    expect(w.findAll('.vg-range-corner')).toHaveLength(0)
    w.unmount()
  })

  it('dragging down: a number copies, two numbers continue, the area is selected', async () => {
    const { w, rows, edits } = make()
    api(w).selectRange(range([1, 'stake'], [2, 'stake'])) // 10, 20
    await flushPromises()
    const preview = await dragHandle(w, [2, 'stake'], [5, 'stake'])
    expect(preview).toBe(3) // rows 3–5 previewed
    expect(rows.map((r) => r.stake)).toEqual([10, 20, 30, 40, 50]) // already 30, 40, 50: no edits
    expect(edits).toHaveLength(0)
    expect(w.findAll('.vg-in-range')).toHaveLength(5)
    // one value copies down
    api(w).selectRange(null)
    await flushPromises()
    pointer(cell(w, 1, 'name').element, 'pointerdown')
    window.dispatchEvent(new MouseEvent('pointerup'))
    await flushPromises()
    await dragHandle(w, [1, 'name'], [4, 'name'])
    expect(rows.map((r) => r.name)).toEqual(['R1', 'R1', 'R1', 'R1', 'R5'])
    const filled = w.emitted('cells-fill')!.at(-1)![0] as CellsPasteEvent<Row>
    expect(filled.edits.map((e) => [e.rowKey, e.value, e.source])).toEqual([
      [2, 'R1', 'fill'],
      [3, 'R1', 'fill'],
      [4, 'R1', 'fill'],
    ])
    w.unmount()
  })

  it('dates go on day by day; read-only cells are skipped; one Ctrl+Z undoes it', async () => {
    const { w, rows } = make()
    pointer(cell(w, 2, 'placed').element, 'pointerdown')
    window.dispatchEvent(new MouseEvent('pointerup'))
    await flushPromises()
    await dragHandle(w, [2, 'placed'], [5, 'placed'])
    expect(rows.map((r) => r.placed)).toEqual([
      '2026-05-01',
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-01', // row 5 isn't editable
    ])
    const filled = w.emitted('cells-fill')!.at(-1)![0] as CellsPasteEvent<Row>
    expect(filled.skipped.map((s) => [s.rowKey, s.reason])).toEqual([[5, 'read-only']])
    expect(await api(w).undo()).toBe(true)
    expect(rows.map((r) => r.placed)).toEqual(Array(5).fill('2026-05-01'))
    w.unmount()
  })

  it('upwards and sideways', async () => {
    const { w, rows } = make()
    api(w).selectRange(range([4, 'stake'], [5, 'stake'])) // 40, 50 → up: 30, 20, 10 (as they are)
    await flushPromises()
    rows[0]!.stake = null
    await dragHandle(w, [5, 'stake'], [1, 'stake'])
    expect(rows[0]!.stake).toBe(10)
    // sideways: Name → Stake from the name (text into a number column: invalid, skipped; a name
    // with digits would count: "R3" reads as 3, like a currency sign before a number)
    rows[2]!.name = 'Cy'
    api(w).selectRange(null)
    pointer(cell(w, 3, 'name').element, 'pointerdown')
    window.dispatchEvent(new MouseEvent('pointerup'))
    await flushPromises()
    await dragHandle(w, [3, 'name'], [3, 'stake'])
    const filled = w.emitted('cells-fill')!.at(-1)![0] as CellsPasteEvent<Row>
    expect(filled.skipped.map((s) => [s.columnKey, s.reason])).toEqual([['stake', 'invalid']])
    expect(rows[2]!.stake).toBe(30)
    w.unmount()
  })

  it('Ctrl+D fills the range down from its top row; fillDown() too', async () => {
    const { w, rows } = make()
    api(w).selectRange(range([2, 'name'], [4, 'stake']))
    await flushPromises()
    const target = cell(w, 2, 'name').element
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    await flushPromises()
    await flushPromises()
    expect(rows.slice(1, 4).map((r) => [r.name, r.stake])).toEqual([
      ['R2', 20],
      ['R2', 20],
      ['R2', 20],
    ])
    rows[3]!.name = 'X'
    api(w).selectRange(range([3, 'name'], [4, 'name']))
    await flushPromises()
    expect((await api(w).fillDown())!.edits).toHaveLength(1)
    expect(rows[3]!.name).toBe('R2')
    w.unmount()
  })
})
