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
  stake: number
  status: string
  vip: boolean
  placed: string
}
const makeRows = (): Row[] =>
  reactive([
    { id: 1, name: 'Ana', stake: 10, status: 'Open', vip: false, placed: '2026-01-05' },
    { id: 2, name: 'Bo', stake: 20, status: 'Won', vip: true, placed: '2026-02-10' },
    { id: 3, name: 'Cy', stake: 30, status: 'Lost', vip: false, placed: '2026-03-15' },
    { id: 4, name: 'Di', stake: 40, status: 'Open', vip: true, placed: '2026-04-20' },
  ])
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#' }, // not editable
  { key: 'name', header: 'Name', editable: true, validate: (v) => (v ? undefined : 'Required') },
  {
    key: 'stake',
    header: 'Stake',
    renderer: 'currency',
    editable: true,
    editorOptions: { min: 0 },
  },
  {
    key: 'status',
    header: 'Status',
    renderer: 'status',
    editable: true,
    editorOptions: { options: ['Open', 'Won', 'Lost'] },
  },
  { key: 'vip', header: 'VIP', renderer: 'boolean', editable: (r) => r.id !== 4 },
  { key: 'placed', header: 'Placed', renderer: 'date', editable: true },
]

const make = (props: Record<string, unknown> = {}) => {
  const rows = makeRows()
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
  return { w, rows }
}
const api = (w: VueWrapper) => w.vm as unknown as VGridExposed
const range = (a: [number, string], b: [number, string]): CellRange => ({
  start: { rowKey: a[0], columnKey: a[1] },
  end: { rowKey: b[0], columnKey: b[1] },
})
const pasted = (w: VueWrapper) => w.emitted('cells-paste')!.at(-1)![0] as CellsPasteEvent<Row>

describe('pasting into a range', () => {
  it('a block from the top-left cell: typed values, skipped cells reported, the area selected', async () => {
    const { w, rows } = make()
    api(w).selectRange(range([3, 'stake'], [2, 'name'])) // top-left: Bo / name
    await flushPromises()
    const result = await api(w).pasteText('Zed\t€1,250.50\tlost\n\t-5\tVoid\r\n')
    await flushPromises()
    expect(rows[1]).toMatchObject({ name: 'Zed', stake: 1250.5, status: 'Lost' })
    expect(rows[2]).toMatchObject({ name: 'Cy', stake: 30, status: 'Lost' }) // all three refused
    expect(result!.edits.map((e) => `${e.rowKey}:${e.column.key}=${String(e.value)}`)).toEqual([
      '2:name=Zed',
      '2:stake=1250.5',
      '2:status=Lost',
    ])
    expect(result!.skipped.map((s) => `${s.rowKey}:${s.columnKey}:${s.reason}`)).toEqual([
      '3:name:invalid', // '' fails validate
      '3:stake:invalid', // below min 0
      '3:status:invalid', // not a choice
    ])
    expect(result!.skipped[0]!.message).toBe('Required')
    expect(w.emitted('cell-edit')).toHaveLength(3)
    expect(pasted(w)).toEqual(result)
    // the pasted area is the range now
    expect(w.emitted('update:range')!.at(-1)![0]).toEqual(range([2, 'name'], [3, 'status']))
    w.unmount()
  })

  it('one value fills the whole range; read-only cells are left alone', async () => {
    const { w, rows } = make()
    api(w).selectRange(range([1, 'id'], [4, 'vip']))
    await flushPromises()
    const result = await api(w).pasteText('yes')
    // id: read-only; name: "yes"; stake/status: invalid; vip: true except row 4 (read-only)
    expect(rows.map((r) => r.vip)).toEqual([true, true, true, true])
    expect(rows.map((r) => r.name)).toEqual(['yes', 'yes', 'yes', 'yes'])
    const reasons = result!.skipped.reduce<Record<string, number>>(
      (n, s) => ({ ...n, [s.reason]: (n[s.reason] ?? 0) + 1 }),
      {},
    )
    expect(reasons).toEqual({ 'read-only': 5, invalid: 8 })
    // row 2 was a VIP already: no change, no edit
    expect(result!.edits.filter((e) => e.column.key === 'vip').map((e) => e.rowKey)).toEqual([1, 3])
    w.unmount()
  })

  it('a block repeats over a range that fits it, and is clipped at the edges', async () => {
    const { w, rows } = make()
    api(w).selectRange(range([1, 'stake'], [4, 'stake']))
    await flushPromises()
    await api(w).pasteText('1\n2\n')
    expect(rows.map((r) => r.stake)).toEqual([1, 2, 1, 2])
    // from the last row down: only one row exists
    api(w).selectRange(range([4, 'name'], [4, 'stake']))
    await flushPromises()
    await api(w).pasteText('X\t9\nY\t8')
    expect(rows[3]).toMatchObject({ name: 'X', stake: 9 })
    w.unmount()
  })

  it('dates in the locale’s order keep the cell’s type', async () => {
    const { w, rows } = make({ locale: 'de' })
    api(w).selectRange(range([1, 'placed'], [2, 'placed']))
    await flushPromises()
    await api(w).pasteText('23.05.2026\n1.6.2026')
    expect(rows.map((r) => r.placed).slice(0, 2)).toEqual(['2026-05-23', '2026-06-01'])
    w.unmount()
  })

  it('save-cell runs for each edit; a rejection lands in `failed`', async () => {
    const saveCell = vi.fn(async (e: CellEditEvent<Row>) => {
      if (e.rowKey === 2) throw new Error('locked')
    })
    const { w } = make({ saveCell })
    api(w).selectRange(range([1, 'stake'], [3, 'stake']))
    await flushPromises()
    const result = await api(w).pasteText('5')
    expect(saveCell).toHaveBeenCalledTimes(3)
    expect(result!.failed.map((f) => [f.edit.rowKey, (f.error as Error).message])).toEqual([
      [2, 'locked'],
    ])
    w.unmount()
  })

  it('Ctrl+V: the browser’s paste is caught and focus comes back to the cell', async () => {
    const { w, rows } = make()
    await flushPromises()
    const cell = w.find('[data-row-key="1"] > .vg-cell[data-col-key="name"]').element as HTMLElement
    cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }))
    cell.focus()
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }))
    const area = document.activeElement as HTMLTextAreaElement
    expect(area.tagName).toBe('TEXTAREA')
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (type: string) => (type === 'text/plain' ? 'Neo\t77' : '') },
    })
    area.dispatchEvent(event)
    await flushPromises()
    expect(rows[0]).toMatchObject({ name: 'Neo', stake: 77 })
    expect(document.activeElement).toBe(cell)
    expect(document.querySelector('body > textarea')).toBeNull()
    // the pasted area stays selected after focus came back
    expect(w.emitted('update:range')!.at(-1)![0]).toEqual(range([1, 'name'], [1, 'stake']))
    w.unmount()
  })

  it('`parts.pasteShortcut: false` leaves Ctrl+V to the browser', async () => {
    const { w } = make({ parts: { pasteShortcut: false } })
    await flushPromises()
    const cell = w.find('[data-row-key="1"] > .vg-cell[data-col-key="name"]').element as HTMLElement
    cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }))
    cell.focus()
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }))
    expect(document.activeElement).toBe(cell)
    w.unmount()
  })
})
