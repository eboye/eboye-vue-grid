import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'
import { toXlsx } from '../src/core/xlsx'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

/** The files of a stored (uncompressed) ZIP, by name, as text. */
function unzip(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const files: Record<string, string> = {}
  let at = 0
  while (view.getUint32(at, true) === 0x04034b50) {
    expect(view.getUint16(at + 8, true)).toBe(0) // stored
    const size = view.getUint32(at + 18, true)
    const nameLength = view.getUint16(at + 26, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLength))
    const start = at + 30 + nameLength
    files[name] = new TextDecoder().decode(bytes.subarray(start, start + size))
    at = start + size
  }
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50) // end of central directory
  return files
}
const sheetOf = (bytes: Uint8Array) => unzip(bytes)['xl/worksheets/sheet1.xml']!
/** The cells of a row as `[ref, style, type, value]`. */
function cells(sheet: string, row: number) {
  const xml = new RegExp(`<row r="${row}"[^>]*>(.*?)</row>`, 's').exec(sheet)?.[1] ?? ''
  return [...xml.matchAll(/<c r="([A-Z]+\d+)" s="(\d+)"(?: t="(\w+)")?>(.*?)<\/c>/gs)].map(
    ([, ref, style, type, body]) => [
      ref,
      Number(style),
      type ?? 'n',
      body!.replace(/<[^>]+>/g, ''),
    ],
  )
}
// styles: index = format * 2 + bold; formats 0 general, 1 money, 2 date, 3 datetime, 4 percent
const S = { text: 0, bold: 1, money: 2, date: 4, datetime: 6, percent: 8, boldMoney: 3 }

describe('toXlsx', () => {
  const rows = [
    {
      id: 1,
      name: 'Ana & <co>',
      stake: 1234.5,
      day: '2026-01-05',
      at: '2026-11-21T14:30:00Z',
      ok: true,
      note: '=1+1',
    },
    { id: 2, name: ' padded ', stake: '99.9', day: 'nope', at: null, ok: false, note: '' },
  ]
  const columns = [
    { key: 'id', header: '#' },
    { key: 'name', header: 'Name' },
    { key: 'stake', header: 'Stake', renderer: 'currency' },
    { key: 'day', header: 'Day', renderer: 'date' },
    { key: 'at', header: 'At', renderer: 'datetime' },
    { key: 'ok', header: 'OK' },
    { key: 'note', header: 'Note' },
    { key: 'secret', header: 'Secret', exportable: false },
  ]

  it('is a workbook: content types, workbook, sheet, styles', () => {
    const files = unzip(toXlsx(rows, columns, { sheetName: 'Bets: 2026/[Q4]' }))
    expect(Object.keys(files)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/worksheets/sheet1.xml',
      'xl/styles.xml',
    ])
    expect(files['xl/workbook.xml']).toContain('<sheet name="Bets 2026Q4"')
    expect(files['xl/styles.xml']).toContain('formatCode="#,##0.00"')
  })

  it('a bold, frozen header; typed cells; number formats from the renderers', () => {
    const sheet = sheetOf(toXlsx(rows, columns, { timeZone: 'UTC' }))
    expect(sheet).toContain('state="frozen"')
    expect(cells(sheet, 1).map((c) => [c[1], c[3]])).toEqual(
      ['#', 'Name', 'Stake', 'Day', 'At', 'OK', 'Note'].map((h) => [S.bold, h]),
    )
    expect(cells(sheet, 2)).toEqual([
      ['A2', S.text, 'n', '1'],
      ['B2', S.text, 'inlineStr', 'Ana &amp; &lt;co&gt;'],
      ['C2', S.money, 'n', '1234.5'],
      ['D2', S.date, 'n', '46027'], // 2026-01-05
      ['E2', S.datetime, 'n', String(46347 + 14.5 / 24)], // 2026-11-21 14:30
      ['F2', S.text, 'b', '1'],
      ['G2', S.text, 'inlineStr', '=1+1'], // text, never a formula
    ])
    // a numeric string in a money column is a number; a bad date stays text; empty cells are left out
    expect(cells(sheet, 3)).toEqual([
      ['A3', S.text, 'n', '2'],
      ['B3', S.text, 'inlineStr', ' padded '],
      ['C3', S.money, 'n', '99.9'],
      ['D3', S.text, 'inlineStr', 'nope'],
      ['F3', S.text, 'b', '0'],
    ])
    expect(sheet).toContain('<t xml:space="preserve"> padded </t>')
    expect(sheet).not.toContain('Secret')
  })

  it('date-times in the given time zone; date-only values stay that day', () => {
    const sheet = sheetOf(toXlsx(rows, columns, { timeZone: 'America/New_York' }))
    expect(cells(sheet, 2)[3]![3]).toBe('46027') // still 2026-01-05
    expect(Number(cells(sheet, 2)[4]![3])).toBeCloseTo(46347 + 9.5 / 24, 9) // 09:30 in New York
  })

  it('formats override the guess; header: false', () => {
    const sheet = sheetOf(
      toXlsx([{ rate: 0.125 }], [{ key: 'rate', header: 'Rate' }], {
        header: false,
        formats: { rate: 'percent' },
      }),
    )
    expect(sheet).not.toContain('frozen')
    expect(cells(sheet, 1)).toEqual([['A1', S.percent, 'n', '0.125']])
  })

  it('a sheet name Excel would reject: no apostrophe at either end', () => {
    const name = (sheetName: string) =>
      /<sheet name="([^"]*)"/.exec(
        unzip(toXlsx([], [{ key: 'a' }], { sheetName }))['xl/workbook.xml']!,
      )?.[1]
    expect(name("'Q4'")).toBe('Q4')
    expect(name("Bob's bets")).toBe("Bob's bets")
    expect(name(`${'a'.repeat(30)}'tail`)).toBe('a'.repeat(30)) // cut at 31, then trimmed again
    expect(name("''")).toBe('Sheet1')
  })

  it('dates Excel cannot show (before 1900-03-01) are written as text', () => {
    const sheet = sheetOf(
      toXlsx(
        [
          { d: '1900-03-01', t: '1900-03-01T06:00:00Z' },
          { d: '1900-02-28', t: '1899-12-31T06:00:00Z' },
          { d: '1850-06-15', t: new Date(Date.UTC(1850, 5, 15, 12, 5)) },
        ],
        [
          { key: 'd', renderer: 'date' },
          { key: 't', renderer: 'datetime' },
        ],
        { header: false, timeZone: 'UTC' },
      ),
    )
    expect(cells(sheet, 1)).toEqual([
      ['A1', S.date, 'n', '61'],
      ['B1', S.datetime, 'n', '61.25'],
    ])
    expect(cells(sheet, 2)).toEqual([
      ['A2', S.text, 'inlineStr', '1900-02-28'],
      ['B2', S.text, 'inlineStr', '1899-12-31 06:00'],
    ])
    expect(cells(sheet, 3)).toEqual([
      ['A3', S.text, 'inlineStr', '1850-06-15'],
      ['B3', S.text, 'inlineStr', '1850-06-15 12:05'],
    ])
  })

  it('columns are wide enough for numbers as Excel shows them', () => {
    const widths = (v: number, renderer?: string) =>
      [
        ...sheetOf(toXlsx([{ v }], [{ key: 'v', header: 'V', renderer }])).matchAll(
          /width="([\d.]+)"/g,
        ),
      ].map((m) => Number(m[1]))[0]!
    // shown as 1,000,000,000,000,000,000,000.00 (32 characters)
    expect(widths(1e21, 'currency')).toBeGreaterThanOrEqual(34)
    expect(widths(1234.5, 'currency')).toBe(10) // 1,234.50 and 2 to spare
  })

  it('text with line breaks is wrapped; one-line text is not', () => {
    const files = unzip(
      toXlsx([{ a: 'Line one\nLine two', b: 'one line' }], [{ key: 'a' }, { key: 'b' }], {
        header: false,
      }),
    )
    const [wrapped, plain] = cells(files['xl/worksheets/sheet1.xml']!, 1)
    const [wrapStyle, plainStyle] = [wrapped?.[1], plain?.[1]]
    expect(plainStyle).toBe(S.text)
    // the wrap styles come after the 10 number-format styles: 10 plain, 11 bold
    expect(wrapStyle).toBe(10)
    const xfs = [...files['xl/styles.xml']!.matchAll(/<xf [^>]*?(?:\/>|>.*?<\/xf>)/g)].map(
      (m) => m[0],
    )
    const cellXfs = xfs.slice(1) // the first is the cellStyleXfs entry
    expect(cellXfs).toHaveLength(12)
    expect(cellXfs[10]).toContain('<alignment wrapText="1"/>')
    expect(cellXfs[11]).toContain('fontId="1"')
    expect(files['xl/styles.xml']).toContain('<cellXfs count="12">')
    // its row is two lines tall (15 pt each), for readers that don't fit rows themselves
    expect(files['xl/worksheets/sheet1.xml']).toContain('<row r="1" ht="30" customHeight="1">')
    // its column is as wide as its longest line, not the whole text
    expect(files['xl/worksheets/sheet1.xml']).toMatch(/<col min="1" max="1" width="10"/)
  })

  it('drops characters XML does not allow', () => {
    const sheet = sheetOf(toXlsx([{ t: 'a\u0001b\u0007c' }], [{ key: 't' }]))
    expect(cells(sheet, 2)[0]![3]).toBe('abc')
  })
})

describe('grid.getXlsx / exportXlsx (export feature)', () => {
  const data = [
    { id: 1, name: 'Ana', city: 'Niš', stake: 10 },
    { id: 2, name: 'Marko', city: 'Beograd', stake: 20.5 },
    { id: 3, name: 'Jelena', city: 'Niš', stake: 30 },
  ]
  const columns = [
    { key: 'name', header: 'Player', aggregate: 'count' },
    { key: 'city', header: 'City' },
    { key: 'stake', header: 'Stake', renderer: 'currency', aggregate: 'sum' },
    { key: 'actions', header: '', exportable: false, value: () => '⋯' },
  ]
  const mountGrid = async (props: Record<string, unknown> = {}) => {
    const w = mount(VGrid, {
      props: { rows: data, columns, rowKey: 'id', locale: 'en-US', currency: 'EUR', ...props },
    })
    await flushPromises()
    return w.vm as unknown as VGridExposed
  }
  const read = async (blob: Blob) => sheetOf(new Uint8Array(await blob.arrayBuffer()))

  it('the filtered rows, typed, with the totals in bold', async () => {
    const grid = await mountGrid({
      totals: true,
      filters: { columns: { city: { type: 'text', op: 'equals', value: 'Niš' } }, search: '' },
    })
    const blob = await grid.getXlsx({ totals: true, sheetName: 'Bets' })
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const sheet = await read(blob)
    expect(cells(sheet, 1).map((c) => c[3])).toEqual(['Player', 'City', 'Stake'])
    expect(cells(sheet, 2).map((c) => c[3])).toEqual(['Ana', 'Niš', '10'])
    expect(cells(sheet, 3).map((c) => c[3])).toEqual(['Jelena', 'Niš', '30'])
    expect(cells(sheet, 4)).toEqual([
      ['A4', S.bold, 'n', '2'], // count
      ['C4', S.boldMoney, 'n', '40'], // sum, bold money
    ])
  })

  it('values: formatted writes the text the cells show; columns picks them', async () => {
    const grid = await mountGrid()
    const sheet = await read(
      await grid.getXlsx({ values: 'formatted', columns: ['stake', 'name'] }),
    )
    expect(cells(sheet, 1).map((c) => c[3])).toEqual(['Stake', 'Player'])
    expect(cells(sheet, 3)).toEqual([
      ['A3', S.text, 'inlineStr', '€20.50'],
      ['B3', S.text, 'inlineStr', 'Marko'],
    ])
  })

  it('exportXlsx downloads export.xlsx (or filename)', async () => {
    const grid = await mountGrid()
    const clicked: string[] = []
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      clicked.push(this.download)
    }
    const create = URL.createObjectURL
    URL.createObjectURL = () => 'blob:x'
    try {
      await grid.exportXlsx()
      await grid.exportXlsx({ filename: 'bets.xlsx' })
    } finally {
      HTMLAnchorElement.prototype.click = click
      URL.createObjectURL = create
    }
    expect(clicked).toEqual(['export.xlsx', 'bets.xlsx'])
  })
})
