/**
 * A minimal Excel (.xlsx) writer: one sheet, typed cells (numbers, dates, booleans, text), a bold
 * frozen header, an optional bold totals line, number formats for money, percentages and dates,
 * column widths from the content. No dependencies: the workbook's XML parts in a ZIP container
 * (stored, not compressed). Text is written as inline strings, never as formulas.
 */
import { toDate, toNumber } from '../renderers/format'
import type { ColumnDef } from '../types'
import { plainText } from './csv'
import { parseIsoDay, wallFormatter, wallTime } from './date'
import { getCellValue } from './value'

/** How a column's values are written: Excel number formats for money, percentages and dates. */
export type XlsxFormat = 'auto' | 'number' | 'money' | 'percent' | 'date' | 'datetime'

export interface ToXlsxOptions {
  /** The sheet's name (31 characters at most; `[]:*?/\` and an apostrophe at either end are dropped). Default `Sheet1`. */
  sheetName?: string
  /** A bold header line with the column headers, frozen. Default `true`. */
  header?: boolean
  /** Time zone that date-times are written in (Excel dates have none). Default: the browser's. */
  timeZone?: string
  /** Formats by column key, instead of the ones guessed from each column's renderer. */
  formats?: Record<string, XlsxFormat>
}

/** One sheet, ready to write: values are raw (typed) or text. */
export interface XlsxSheet {
  name?: string
  header?: readonly string[]
  formats: readonly XlsxFormat[]
  rows: readonly (readonly unknown[])[]
  /** A last, bold line (the totals row). */
  footer?: readonly unknown[]
  timeZone?: string
}

/** The Excel format a column's renderer implies (`currency` → money, `date` → date, …). */
export function xlsxFormatOf(col: ColumnDef): XlsxFormat {
  const renderer = col.renderer as unknown
  const name =
    typeof renderer === 'string'
      ? renderer
      : renderer && typeof renderer === 'object' && 'name' in renderer
        ? String((renderer as { name: unknown }).name)
        : ''
  const options = (col.rendererOptions ?? {}) as {
    currency?: unknown
    format?: Intl.NumberFormatOptions
  }
  switch (name) {
    case 'currency':
      return 'money'
    case 'change':
      return options.currency ? 'money' : 'number'
    case 'number':
    case 'signed-number':
      return options.format?.style === 'percent' ? 'percent' : 'number'
    case 'date':
      return 'date'
    case 'datetime':
      return 'datetime'
    default:
      return 'auto'
  }
}

/**
 * Rows as an Excel workbook (the bytes of an .xlsx file): one row per row, one cell per column
 * (its `exportValue`, else the cell value), typed: numbers, dates and booleans stay what they are.
 * Columns with `exportable: false` are left out. For the grid's own rows, filters and sort, use
 * the export feature (`grid.exportXlsx()`).
 */
export function toXlsx<T>(
  rows: readonly T[],
  columns: readonly ColumnDef<T>[],
  options: ToXlsxOptions = {},
): Uint8Array {
  const cols = columns.filter((c) => c.exportable !== false)
  return writeXlsx({
    name: options.sheetName,
    header: options.header === false ? undefined : cols.map((c) => c.header ?? c.key),
    formats: cols.map((c) => options.formats?.[c.key] ?? xlsxFormatOf(c as ColumnDef)),
    rows: rows.map((row) =>
      cols.map((c) => (c.exportValue ? c.exportValue(row) : getCellValue(row, c))),
    ),
    timeZone: options.timeZone,
  })
}

// ── Cells ─────────────────────────────────────────────────────────────────────────────────────

// Number formats: built-in 10 is `0.00%`; 164+ are ours.
const NUM_FMTS = ['#,##0.00', 'yyyy-mm-dd', 'yyyy-mm-dd hh:mm']
const FMT_ID: Record<XlsxFormat, number> = {
  auto: 0,
  number: 0,
  money: 164,
  date: 165,
  datetime: 166,
  percent: 10,
}
const STYLE_FMTS = [0, 164, 165, 166, 10]
/** The cellXfs index: one style per number format, plain and bold. */
const styleOf = (fmt: number, bold: boolean) => STYLE_FMTS.indexOf(fmt) * 2 + (bold ? 1 : 0)
/** Text with line breaks: wrapped, so it shows on several lines (plain, bold), after the others. */
const WRAP = STYLE_FMTS.length * 2

const DAY = 86_400_000
const EPOCH = Date.UTC(1899, 11, 30)
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
/** 1900-03-01: from here on Excel's date serials match the real calendar. */
const FIRST_SERIAL = 61

/** An Excel date serial: the wall-clock time in `timeZone` (date-only strings: that day). */
function dateSerial(
  value: unknown,
  formatWall: ((date: Date) => number) | undefined,
): number | null {
  if (typeof value === 'string') {
    const day = value.trim()
    if (DATE_ONLY.test(day)) {
      const date = parseIsoDay(day)
      return date ? (date.getTime() - EPOCH) / DAY : null
    }
  }
  const d = toDate(value)
  if (!d) return null
  const wall = formatWall ? formatWall(d) : d.getTime() - d.getTimezoneOffset() * 60_000
  return (wall - EPOCH) / DAY
}

const xml = (s: string) =>
  s
    // characters XML 1.0 doesn't allow
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** A1-style column letters: 0 → A, 26 → AA. */
function columnName(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

interface Cell {
  xml: string
  /** Characters shown, for the column width. */
  width: number
  /** Lines of text, for the row height. */
  lines?: number
}

function cell(
  ref: string,
  value: unknown,
  format: XlsxFormat,
  bold: boolean,
  formatWall?: (date: Date) => number,
): Cell | null {
  if (value === null || value === undefined || value === '') return null
  const num = (n: number, fmt: number, width: number): Cell => ({
    xml: `<c r="${ref}" s="${styleOf(fmt, bold)}"><v>${n}</v></c>`,
    width,
  })
  if (format === 'date' || format === 'datetime' || value instanceof Date) {
    const serial = dateSerial(value, formatWall)
    const fmt = format === 'date' ? FMT_ID.date : FMT_ID.datetime
    if (serial !== null && serial >= FIRST_SERIAL)
      return num(serial, fmt, fmt === FMT_ID.date ? 10 : 16)
    // Excel can't show it (its 1900 has a 29 February; nothing before 1900): the date as text
    if (serial !== null)
      value = new Date(EPOCH + serial * DAY)
        .toISOString()
        .slice(0, fmt === FMT_ID.date ? 10 : 16)
        .replace('T', ' ')
  } else if (format === 'money' || format === 'number' || format === 'percent') {
    const n = toNumber(value)
    // the width of the number as shown (`#,##0.00` writes every digit of a large amount)
    const shown = (x: number) =>
      x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (n !== null)
      return num(
        n,
        FMT_ID[format],
        format === 'money'
          ? shown(n).length
          : format === 'percent'
            ? shown(n * 100).length + 1
            : String(n).length + 2,
      )
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    return num(value, 0, String(value).length)
  } else if (typeof value === 'boolean') {
    return {
      xml: `<c r="${ref}" s="${styleOf(0, bold)}" t="b"><v>${value ? 1 : 0}</v></c>`,
      width: 5,
    }
  }
  const text = plainText(value).slice(0, 32_767) // a cell's limit
  if (!text) return null
  const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : ''
  return {
    xml: `<c r="${ref}" s="${text.includes('\n') ? WRAP + (bold ? 1 : 0) : styleOf(0, bold)}" t="inlineStr"><is><t${space}>${xml(text)}</t></is></c>`,
    width: Math.max(...text.split('\n').map((l) => l.length)),
    lines: text.split('\n').length,
  }
}

// ── Workbook ──────────────────────────────────────────────────────────────────────────────────

function sheetXml(sheet: XlsxSheet): string {
  const timeZone = sheet.timeZone
  let formatter: Intl.DateTimeFormat | undefined
  const formatWall = timeZone
    ? (date: Date) => wallTime(date, (formatter ??= wallFormatter(timeZone)))
    : undefined
  const widths = sheet.formats.map(() => 8)
  const lines: string[] = []
  const addRow = (values: readonly unknown[], bold: boolean, formats: readonly XlsxFormat[]) => {
    const r = lines.length + 1
    const cells: string[] = []
    let rowLines = 1
    values.forEach((value, i) => {
      const c = cell(`${columnName(i)}${r}`, value, formats[i] ?? 'auto', bold, formatWall)
      if (!c) return
      cells.push(c.xml)
      widths[i] = Math.max(widths[i] ?? 8, c.width + 2)
      rowLines = Math.max(rowLines, c.lines ?? 1)
    })
    // wrapped text: tall enough for every line (15 pt each, Calibri 11's row height); readers
    // that don't fit rows to wrapped text themselves (Gnumeric) would show the first line only
    const height = rowLines > 1 ? ` ht="${Math.min(409, rowLines * 15)}" customHeight="1"` : ''
    lines.push(`<row r="${r}"${height}>${cells.join('')}</row>`)
  }
  const text = sheet.formats.map((): XlsxFormat => 'auto')
  if (sheet.header) addRow(sheet.header, true, text)
  for (const row of sheet.rows) addRow(row, false, sheet.formats)
  if (sheet.footer) addRow(sheet.footer, true, sheet.formats)

  const cols = widths
    .map(
      (w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.min(60, w)}" customWidth="1"/>`,
    )
    .join('')
  const pane = sheet.header
    ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
    : ''
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>` +
    (cols ? `<cols>${cols}</cols>` : '') +
    `<sheetData>${lines.join('')}</sheetData></worksheet>`
  )
}

function stylesXml(): string {
  const numFmts = NUM_FMTS.map(
    (code, i) => `<numFmt numFmtId="${164 + i}" formatCode="${xml(code)}"/>`,
  ).join('')
  const xfs = STYLE_FMTS.flatMap((fmt) =>
    [0, 1].map(
      (bold) =>
        `<xf numFmtId="${fmt}" fontId="${bold}" fillId="0" borderId="0" xfId="0"` +
        `${fmt ? ' applyNumberFormat="1"' : ''}${bold ? ' applyFont="1"' : ''}/>`,
    ),
  ).join('')
  const wrap = [0, 1]
    .map(
      (bold) =>
        `<xf numFmtId="0" fontId="${bold}" fillId="0" borderId="0" xfId="0"` +
        `${bold ? ' applyFont="1"' : ''} applyAlignment="1"><alignment wrapText="1"/></xf>`,
    )
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<numFmts count="${NUM_FMTS.length}">${numFmts}</numFmts>` +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${WRAP + 2}">${xfs}${wrap}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  )
}

/** A valid sheet name: 1–31 characters, none of `[]:*?/\`, no apostrophe at either end. */
const sheetName = (name: string | undefined) =>
  (name ?? '')
    .replace(/[[\]:*?/\\]/g, '')
    .trim()
    .slice(0, 31)
    .replace(/^['\s]+|['\s]+$/g, '') || 'Sheet1'

/** The bytes of an .xlsx file with one sheet. */
export function writeXlsx(sheet: XlsxSheet): Uint8Array {
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const files: [string, string][] = [
    [
      '[Content_Types].xml',
      head +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>',
    ],
    [
      '_rels/.rels',
      head +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/>` +
        '</Relationships>',
    ],
    [
      'xl/workbook.xml',
      head +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rel}">` +
        `<sheets><sheet name="${xml(sheetName(sheet.name))}" sheetId="1" r:id="rId1"/></sheets>` +
        '</workbook>',
    ],
    [
      'xl/_rels/workbook.xml.rels',
      head +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        `<Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${rel}/styles" Target="styles.xml"/>` +
        '</Relationships>',
    ],
    ['xl/worksheets/sheet1.xml', sheetXml(sheet)],
    ['xl/styles.xml', stylesXml()],
  ]
  return zip(files.map(([name, text]) => [name, new TextEncoder().encode(text)]))
}

// ── ZIP (stored) ──────────────────────────────────────────────────────────────────────────────

let crcTable: Uint32Array | undefined
function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** A ZIP archive of the files, stored (no compression), dated 1980-01-01. */
function zip(files: [string, Uint8Array][]): Uint8Array {
  const enc = new TextEncoder()
  const DOS_DATE = (0 << 9) | (1 << 5) | 1 // 1980-01-01
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [name, data] of files) {
    const nameBytes = enc.encode(name)
    const crc = crc32(data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // stored
    local.setUint16(10, 0, true) // time
    local.setUint16(12, DOS_DATE, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)
    parts.push(new Uint8Array(local.buffer), nameBytes, data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true) // version made by
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, 0, true)
    entry.setUint16(14, DOS_DATE, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, nameBytes.length, true)
    entry.setUint32(42, offset, true)
    central.push(new Uint8Array(entry.buffer), nameBytes)
    offset += 30 + nameBytes.length + data.length
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)
  const all = [...parts, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of all) {
    out.set(p, at)
    at += p.length
  }
  return out
}
