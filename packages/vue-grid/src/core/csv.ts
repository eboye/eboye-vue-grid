import type { ColumnDef } from '../types'
import { getCellValue } from './value'

/** A value as plain text: dates as ISO 8601, arrays joined with `, `, objects as JSON, empty as ''. */
export function plainText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isNaN(value) ? '' : String(value)
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  if (Array.isArray(value)) return value.map((v) => (v !== null && typeof v === 'object' && !(v instanceof Date) ? safeJson(v) : plainText(v))).join(', ')
  if (typeof value === 'object') return safeJson(value)
  return String(value)
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ''
  } catch {
    return String(value)
  }
}

/**
 * Spreadsheet formula injection guard: text starting with `=`, `+`, `-`, `@`, tab or CR is run as
 * a formula by Excel / Sheets / LibreOffice, so it gets a leading `'`. Numbers (`-5`, `+3.2`) are
 * left alone.
 */
export function guardFormula(text: string): string {
  if (!/^[=+\-@\t\r]/.test(text)) return text
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(text.trim())) return text
  return `'${text}`
}

/** Joins a table of text into delimited lines, quoting fields that need it (RFC 4180). */
export function toDelimited(table: readonly (readonly string[])[], delimiter = ',', newline = '\r\n'): string {
  const needsQuotes = (s: string) => s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')
  return table
    .map((line) => line.map((field) => (needsQuotes(field) ? `"${field.replace(/"/g, '""')}"` : field)).join(delimiter))
    .join(newline)
}

export interface ToCsvOptions {
  /** Field separator. Default `,`. */
  delimiter?: string
  /** A first line with the column headers. Default `true`. */
  header?: boolean
  /** Prefix text that a spreadsheet would run as a formula with `'`. Default `true`. */
  guard?: boolean
}

/**
 * Rows as CSV: one line per row, one field per column (its `exportValue`, else the cell value,
 * as plain text). Columns with `exportable: false` are left out. For the grid's own rows, filters,
 * sort and formatting, use the export feature (`grid.getCsv()`).
 */
export function toCsv<T>(rows: readonly T[], columns: readonly ColumnDef<T>[], options: ToCsvOptions = {}): string {
  const cols = columns.filter((c) => c.exportable !== false)
  const guard = options.guard !== false ? guardFormula : (s: string) => s
  const table: string[][] = []
  if (options.header !== false) table.push(cols.map((c) => guard(c.header ?? c.key)))
  for (const row of rows) table.push(cols.map((c) => guard(plainText(c.exportValue ? c.exportValue(row) : getCellValue(row, c)))))
  return toDelimited(table, options.delimiter ?? ',')
}
