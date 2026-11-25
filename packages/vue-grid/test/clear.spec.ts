import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { setCellValue } from '../src/core/value'
import type {
  CellEditEvent,
  CellRange,
  CellsPasteEvent,
  ColumnDef,
  CopyEvent,
  VGridExposed,
} from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  note: string
  stake: number | null
  vip: boolean
  placed: string | null
}
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#' }, // read-only
  { key: 'name', header: 'Name', editable: true, validate: (v) => (v ? undefined : 'Required') },
  { key: 'note', header: 'Note', editable: true },
  { key: 'stake', header: 'Stake', renderer: 'number', editable: true },
  { key: 'vip', header: 'VIP', renderer: 'boolean', editable: true },
  { key: 'placed', header: 'Placed', renderer: 'date', editable: true },
]

let clipboard: string[]
beforeEach(() => {
  clipboard = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async (t: string) => void clipboard.push(t)) },
  })
})
const mounted: VueWrapper[] = []
afterEach(() => {
  for (const w of mounted.splice(0)) if (w.exists()) w.unmount()
})

function make(props: Record<string, unknown> = {}) {
  const rows = reactive<Row[]>([
    { id: 1, name: 'Ana', note: 'a', stake: 10, vip: true, placed: '2026-01-05' },
    { id: 2, name: 'Bo', note: 'b', stake: 20, vip: true, placed: '2026-02-10' },
    { id: 3, name: 'Cy', note: 'c', stake: 30, vip: false, placed: '2026-03-15' },
  ])
  const w = mount(VGrid, {
    attachTo: document.body,
    props: {
      rows,
      columns,
      rowKey: 'id',
      rangeSelection: true,
      locale: 'en-US',
      'onCell-edit': (e: CellEditEvent<Row>) => setCellValue(e.row, e.column, e.value),
      ...props,
    },
  })
  mounted.push(w)
  return { w, rows }
}
const api = (w: VueWrapper) => w.vm as unknown as VGridExposed
const cell = (w: VueWrapper, id: number, key: string) =>
  w.find(`[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const range = (a: [number, string], b: [number, string]): CellRange => ({
  start: { rowKey: a[0], columnKey: a[1] },
  end: { rowKey: b[0], columnKey: b[1] },
})
async function press(w: VueWrapper, init: KeyboardEventInit) {
  cell(w, 1, 'id').element.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }),
  )
  await vi.waitFor(() => expect(w.emitted('cells-clear')?.length ?? 0).toBeGreaterThan(0))
  await flushPromises()
  return w.emitted('cells-clear')!.at(-1)![0] as CellsPasteEvent<Row>
}

describe('Delete / Backspace', () => {
  it('empties each editable cell its own way; read-only and required cells stay', async () => {
    const { w, rows } = make()
    api(w).selectRange(range([1, 'id'], [2, 'placed']))
    await flushPromises()
    const result = await press(w, { key: 'Delete' })
    expect(rows.slice(0, 2)).toEqual([
      { id: 1, name: 'Ana', note: '', stake: null, vip: false, placed: null },
      { id: 2, name: 'Bo', note: '', stake: null, vip: false, placed: null },
    ])
    expect(rows[2]!.note).toBe('c') // outside the range
    expect(result.edits.every((e) => e.source === 'clear')).toBe(true)
    expect(result.skipped.map((s) => [s.rowKey, s.columnKey, s.reason])).toEqual([
      [1, 'id', 'read-only'],
      [1, 'name', 'invalid'],
      [2, 'id', 'read-only'],
      [2, 'name', 'invalid'],
    ])
    // one Ctrl+Z brings it all back
    expect(await api(w).undo()).toBe(true)
    expect(rows[0]).toEqual({
      id: 1,
      name: 'Ana',
      note: 'a',
      stake: 10,
      vip: true,
      placed: '2026-01-05',
    })
  })

  it('Backspace on the selected cell alone clears it', async () => {
    const { w, rows } = make()
    cell(w, 3, 'stake').element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('pointerup'))
    await flushPromises()
    const result = await press(w, { key: 'Backspace' })
    expect(rows[2]!.stake).toBeNull()
    expect(result.edits).toHaveLength(1)
  })

  it('parts.clearShortcut: false leaves the keys alone; clearRange() still works', async () => {
    const { w, rows } = make({ parts: { clearShortcut: false } })
    api(w).selectRange(range([1, 'note'], [3, 'note']))
    await flushPromises()
    cell(w, 1, 'id').element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
    )
    await flushPromises()
    await flushPromises()
    expect(rows.map((r) => r.note)).toEqual(['a', 'b', 'c'])
    expect((await api(w).clearRange())!.edits).toHaveLength(3)
    expect(rows.map((r) => r.note)).toEqual(['', '', ''])
  })
})

describe('Ctrl/⌘+X', () => {
  it('copies the cells as shown, then clears them; one undo restores them', async () => {
    const { w, rows } = make()
    api(w).selectRange(range([1, 'note'], [2, 'stake']))
    await flushPromises()
    const result = await press(w, { key: 'x', ctrlKey: true })
    expect(clipboard).toEqual(['a\t10\nb\t20'])
    const copied = w.emitted('copy')!.at(-1)![0] as CopyEvent<Row>
    expect(copied.kind).toBe('range')
    expect(rows.slice(0, 2).map((r) => [r.note, r.stake])).toEqual([
      ['', null],
      ['', null],
    ])
    expect(result.edits.every((e) => e.source === 'cut')).toBe(true)
    await api(w).undo()
    expect(rows.slice(0, 2).map((r) => [r.note, r.stake])).toEqual([
      ['a', 10],
      ['b', 20],
    ])
  })

  it('nothing is cleared when the copy fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
    })
    document.execCommand = vi.fn(() => false)
    const { w, rows } = make()
    api(w).selectRange(range([1, 'note'], [2, 'note']))
    await flushPromises()
    expect(await api(w).cutRange()).toBeNull()
    expect(rows.map((r) => r.note)).toEqual(['a', 'b', 'c'])
  })
})
