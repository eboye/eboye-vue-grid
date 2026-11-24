import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'
import { guardFormula, plainText, toCsv, toDelimited } from '../src/core/csv'
import { sortingFeature } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { ColumnDef, VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  stake: number
  status: string
  placed: string
  kids?: Row[]
}
const rows: Row[] = [
  { id: 1, name: 'Ana', stake: 1234.5, status: 'won', placed: '2026-03-01' },
  { id: 2, name: 'Bo, Jr.', stake: 10, status: 'lost', placed: '2026-01-15', kids: [{ id: 21, name: 'Bo kid', stake: 1, status: 'won', placed: '2026-01-16' }] },
  { id: 3, name: '=HYPERLINK("x")', stake: -5, status: 'open', placed: '' },
]
const columns: ColumnDef<Row>[] = [
  { key: 'name', header: 'Name', sortable: true, filterable: true },
  { key: 'stake', header: 'Stake', renderer: 'currency', aggregate: 'sum' },
  { key: 'status', header: 'Status', renderer: 'status', rendererOptions: { label: { won: 'Won', lost: 'Lost', open: 'Open' } } },
  { key: 'placed', header: 'Placed', renderer: 'date' },
  { key: 'actions', header: '', exportable: false },
]
const mountGrid = (props: Record<string, unknown> = {}) =>
  mount(VGrid, { props: { rows, columns, rowKey: 'id', locale: 'en-US', currency: 'EUR', timeZone: 'UTC', ...props }, attachTo: document.body })
/** The guarded, quoted form of `=HYPERLINK("x")`. */
const HYPER = `"'=HYPERLINK(""x"")"`
const api = (w: ReturnType<typeof mount>) => w.vm as unknown as VGridExposed

let clipboard: string[]
beforeEach(() => {
  clipboard = []
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async (t: string) => void clipboard.push(t)) },
  })
})
afterEach(() => {
  document.body.replaceChildren()
})

describe('csv core', () => {
  it('plainText: ISO dates, joined arrays, JSON objects, empty for null / NaN', () => {
    expect(plainText(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02T03:04:05.000Z')
    expect(plainText([1, 'a', { b: 2 }])).toBe('1, a, {"b":2}')
    expect(plainText({ a: 1 })).toBe('{"a":1}')
    expect([null, undefined, Number.NaN].map(plainText)).toEqual(['', '', ''])
    expect(plainText(false)).toBe('false')
  })
  it('guardFormula: prefixes formulas, leaves numbers alone', () => {
    expect(guardFormula('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(guardFormula('@cmd')).toBe("'@cmd")
    expect(guardFormula('+1 555')).toBe("'+1 555")
    expect(guardFormula('-5')).toBe('-5')
    expect(guardFormula('+3.2e4')).toBe('+3.2e4')
    expect(guardFormula('plain')).toBe('plain')
  })
  it('toDelimited quotes delimiters, quotes and line breaks (RFC 4180)', () => {
    expect(toDelimited([['a', 'b,c'], ['say "hi"', 'x\ny']])).toBe('a,"b,c"\r\n"say ""hi""","x\ny"')
    expect(toDelimited([['a,b', 'c\td']], '\t', '\n')).toBe('a,b\t"c\td"')
  })
  it('toCsv: headers, exportValue, exportable: false', () => {
    const csv = toCsv(rows.slice(0, 2), [...columns, { key: 'code', exportValue: (r: Row) => `#${r.id}` }])
    expect(csv.split('\r\n')).toEqual(['Name,Stake,Status,Placed,code', 'Ana,1234.5,won,2026-03-01,#1', '"Bo, Jr.",10,lost,2026-01-15,#2'])
  })
})

describe('export feature', () => {
  it('getCsv: filtered, sorted rows, visible exportable columns, raw values, guarded', async () => {
    const w = mountGrid({ sortMode: 'client', sort: { key: 'name', dir: 'desc' } })
    expect(api(w).getCsv().split('\r\n')).toEqual([
      'Name,Stake,Status,Placed',
      '"Bo, Jr.",10,lost,2026-01-15',
      'Ana,1234.5,won,2026-03-01',
      `${HYPER},-5,open,`, // the sort compares the text itself; the guard only changes the output
    ])
    await w.setProps({ filters: { columns: { name: { type: 'text', op: 'contains', value: 'a' } }, search: '' } })
    expect(api(w).getCsv().split('\r\n').slice(1)).toEqual(['Ana,1234.5,won,2026-03-01'])
    expect(api(w).getCsv({ rows: 'all' }).split('\r\n')).toHaveLength(4)
  })

  it('formatted values use the renderers; columns, header, delimiter and totals options', () => {
    const w = mountGrid({ totals: true })
    const lines = api(w).getCsv({ values: 'formatted', columns: ['name', 'stake', 'status', 'placed'], delimiter: ';', totals: true }).split('\r\n')
    expect(lines[1]).toBe('Ana;€1,234.50;Won;03/01/2026')
    expect(lines.at(-1)).toBe('Total;€1,239.50;;')
    expect(api(w).getCsv({ columns: ['stake', 'name'], header: false }).split('\r\n')[0]).toBe('1234.5,Ana')
    expect(api(w).getCsv({ guard: false }).split('\r\n')[3]).toBe('"=HYPERLINK(""x"")",-5,open,')
  })

  it('children, selected rows (nested too) and the current page', async () => {
    const w = mountGrid({ subRows: (r: Row) => r.kids, selectable: true, selected: [21, 1] })
    expect(api(w).getCsv({ children: true, columns: ['name'], header: false }).split('\r\n')).toEqual(['Ana', '"Bo, Jr."', 'Bo kid', HYPER])
    expect(api(w).getCsv({ rows: 'selected', columns: ['name'], header: false }).split('\r\n')).toEqual(['Ana', 'Bo kid'])
    const paged = mountGrid({ pagination: true, pageSize: 2, page: 2 })
    expect(api(paged).getCsv({ rows: 'page', columns: ['name'], header: false })).toContain('HYPERLINK')
  })

  it('grouped grids export their rows, not the groups', () => {
    const w = mountGrid({ groupBy: 'status' })
    expect(api(w).getCsv({ columns: ['name'], header: false }).split('\r\n')).toHaveLength(3)
  })

  it('copyRows copies the selected rows as TSV and emits copy', async () => {
    const w = mountGrid({ selectable: true, selected: [2] })
    expect(await api(w).copyRows()).toBe(true)
    expect(clipboard).toEqual(['Bo, Jr.\t€10.00\tLost\t01/15/2026'])
    expect(w.emitted('copy')?.[0]?.[0]).toMatchObject({ kind: 'rows', rows: [rows[1]] })
    expect(await api(w).copyRows({ rows: 'filtered', header: true, columns: ['name'] })).toBe(true)
    expect(clipboard[1]!.split('\n')).toEqual(['Name', 'Ana', 'Bo, Jr.', HYPER])
  })

  it('falls back to execCommand when the Clipboard API is missing or refused', async () => {
    const w = mountGrid({ selectable: true, selected: [1] })
    let copiedText = ''
    const exec = vi.fn(() => {
      copiedText = (document.activeElement as HTMLTextAreaElement).value
      return true
    })
    Object.assign(document, { execCommand: exec })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(() => Promise.reject(new Error('denied'))) } })
    expect(await api(w).copyRows({ columns: ['name'] })).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(copiedText).toBe('Ana')
    expect(document.querySelector('textarea')).toBeNull()
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    exec.mockReturnValue(false)
    expect(await api(w).copyRows({ columns: ['name'] })).toBe(false)
  })

  it('Ctrl+C: selected rows, else the focused cell; not in inputs or over a text selection', async () => {
    const w = mountGrid({ selectable: true })
    const cell = w.find('[data-row-key="1"] > [data-col-key="stake"]').element as HTMLElement
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true }))
    await flushPromises()
    expect(clipboard).toEqual(['€1,234.50'])
    expect(w.emitted('copy')?.[0]?.[0]).toMatchObject({ kind: 'cell', text: '€1,234.50' })

    await w.setProps({ selected: [1, 3] })
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', metaKey: true, bubbles: true, cancelable: true }))
    await flushPromises()
    expect(clipboard[1]!.split('\n')).toHaveLength(2)

    const input = document.createElement('input')
    cell.appendChild(input)
    const fromInput = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true, cancelable: true })
    input.dispatchEvent(fromInput)
    expect(fromInput.defaultPrevented).toBe(false)
  })

  it('exportCsv downloads a UTF-8 CSV with a BOM', async () => {
    const created: Blob[] = []
    const createObjectURL = vi.fn((b: Blob) => (created.push(b), 'blob:x'))
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('bets.csv')
    })
    const w = mountGrid()
    api(w).exportCsv({ filename: 'bets.csv' })
    expect(click).toHaveBeenCalledOnce()
    expect(created[0]!.type).toBe('text/csv;charset=utf-8')
    const bytes = new Uint8Array(await created[0]!.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    click.mockRestore()
  })

  it('without the feature the methods warn and do nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const saved = config.global.plugins
    config.global.plugins = [createVueGrid({ renderers: allRenderers })]
    try {
      const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', features: [sortingFeature] } })
      expect(api(w).getCsv()).toBe('')
      expect(await api(w).copyRows()).toBe(false)
      expect(warn.mock.calls.flat().join(' ')).toMatch(/exportFeature/)
    } finally {
      config.global.plugins = saved
      warn.mockRestore()
    }
  })
})
