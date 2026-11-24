import type { Ref } from 'vue'
import { guardFormula, plainText, toDelimited } from '../core/csv'
import { getCellValue } from '../core/value'
import { copyText } from '../internal/clipboard'
import type { ResolvedColumn } from '../internal/context'
import type {
  CellRendererDefinition,
  ColumnDef,
  CopyEvent,
  ExportOptions,
  FormatContext,
  RowKey,
} from '../types'

export interface GridExportOptions<T> {
  /** The visible columns, resolved (renderer definition and options). */
  columns: () => readonly ResolvedColumn[]
  /** Every column (the `columns` option may name hidden ones). */
  allColumns: () => readonly ColumnDef<T>[]
  /** Resolves a column's renderer (hidden columns). */
  resolve: (col: ColumnDef<T>) => { definition?: CellRendererDefinition; fallback?: boolean }
  format: () => FormatContext
  getKey: (row: T) => RowKey
  /** A group row (row grouping feature): its rows are exported instead. */
  isGroup: (row: T) => boolean
  /**
   * Top-level rows, sorted: `filtered` (every page, pinned rows included), `all` (filters
   * ignored), or `page` (the rows in the body, groups included).
   */
  rows: (which: 'filtered' | 'all' | 'page') => readonly T[]
  /** Known child rows of a row (sync or loaded), or undefined. */
  children: (row: T) => readonly T[] | undefined
  /** Filters (if `filtered`) and sorts a level of child rows. */
  prepare: (rows: readonly T[], filtered: boolean) => readonly T[]
  selected: Ref<RowKey[]>
  /** Rows shown but not in the data (pinned extra rows): a focused cell may be in one. */
  extraRows: () => readonly T[]
  /** The totals row, when there is one: its values by column key and its label. */
  totals: () => { values: Record<string, unknown>; label: string } | undefined | false
  onCopy: (event: CopyEvent<T>) => void
}

/**
 * The export feature: the grid's rows as CSV / TSV (`getCsv`, `exportCsv`), copying rows or the
 * focused cell to the clipboard (`copyRows`, Ctrl/⌘+C), with raw or displayed values.
 */
export function useGridExport<T>(opts: GridExportOptions<T>) {
  /** Pre-order: each row, then (with `children`) its known children, prepared like the grid's. */
  function flatten(rows: readonly T[], children: boolean, filtered: boolean, out: T[] = []): T[] {
    for (const row of rows) {
      if (opts.isGroup(row)) {
        flatten((row as unknown as { rows: T[] }).rows, children, filtered, out)
        continue
      }
      out.push(row)
      const kids = children ? opts.children(row) : undefined
      if (kids?.length) flatten(opts.prepare(kids, filtered), children, filtered, out)
    }
    return out
  }

  function rowsFor(o: ExportOptions): T[] {
    const which = o.rows ?? 'filtered'
    if (which === 'selected') {
      const picked = new Set(opts.selected.value)
      // nested selected rows count even when `children` is off
      return flatten(opts.rows('all'), true, false).filter((r) => picked.has(opts.getKey(r)))
    }
    if (which === 'all') return flatten(opts.rows('all'), !!o.children, false)
    if (which === 'page') return flatten(opts.rows('page'), !!o.children, true)
    return flatten(opts.rows('filtered'), !!o.children, true)
  }

  function columnsFor(o: ExportOptions): ColumnDef<T>[] {
    if (o.columns) {
      const all = opts.allColumns()
      return o.columns
        .map((k) => all.find((c) => c.key === k))
        .filter((c): c is ColumnDef<T> => !!c)
    }
    return opts
      .columns()
      .filter((c) => c.kind === 'data' && c.def.exportable !== false)
      .map((c) => c.def as ColumnDef<T>)
  }

  /** A column's renderer definition and options: from the visible columns, else resolved. */
  function renderer(col: ColumnDef<T>): {
    definition?: CellRendererDefinition
    options: Record<string, unknown>
  } {
    const shown = opts.columns().find((c) => c.key === col.key)
    if (shown) return { definition: shown.definition, options: shown.options }
    const { definition, fallback } = opts.resolve(col)
    return {
      definition,
      options: fallback
        ? {}
        : { ...(definition?.defaults as object), ...(col.rendererOptions as object) },
    }
  }

  /** A cell as text: `exportValue`, else the renderer's text (formatted) or the plain value. */
  function cellText(
    row: T,
    col: ColumnDef<T>,
    ctx: FormatContext | null,
    r = ctx && renderer(col),
  ): string {
    if (col.exportValue) return plainText(col.exportValue(row))
    const value = getCellValue(row, col)
    return ctx && r?.definition?.format
      ? r.definition.format(value, r.options, ctx, row)
      : plainText(value)
  }

  function table(o: ExportOptions, defaults: { values: 'raw' | 'formatted'; header: boolean }) {
    const cols = columnsFor(o)
    // formatted: the format context, and each column's renderer, looked up once
    const ctx = (o.values ?? defaults.values) === 'formatted' ? opts.format() : null
    const renderers = cols.map((c) => (ctx ? renderer(c) : null))
    const guard = o.guard === false ? (s: string) => s : guardFormula
    const rows = rowsFor(o)
    const lines: string[][] = []
    if (o.header ?? defaults.header) lines.push(cols.map((c) => guard(c.header ?? c.key)))
    for (const row of rows)
      lines.push(cols.map((c, i) => guard(cellText(row, c, ctx, renderers[i]))))
    const total = o.totals ? opts.totals() : undefined
    if (total) {
      lines.push(
        cols.map((c, i) => {
          if (!(c.key in total.values)) return i === 0 ? guard(total.label) : ''
          const value = total.values[c.key]
          const r = renderers[i]
          return guard(
            ctx && c.aggregate !== 'count' && r?.definition?.format
              ? r.definition.format(value, r.options, ctx, total.values)
              : plainText(value),
          )
        }),
      )
    }
    return { rows, cols, lines }
  }

  /** The rows as CSV text (raw values, a header line, `,`). */
  function getCsv(o: ExportOptions = {}): string {
    return toDelimited(table(o, { values: 'raw', header: true }).lines, o.delimiter ?? ',')
  }

  /** Downloads the rows as a CSV file (UTF-8 with a BOM, so Excel reads accents right). */
  function exportCsv(o: ExportOptions & { filename?: string; bom?: boolean } = {}) {
    const text = getCsv(o)
    const blob = new Blob([o.bom === false ? '' : '﻿', text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = o.filename ?? 'export.csv'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  /**
   * Copies rows as tab-separated text (pastes as cells into spreadsheets): the selected rows by
   * default, as displayed, without a header. Resolves `false` when nothing was copied.
   */
  async function copyRows(o: ExportOptions = {}): Promise<boolean> {
    const { rows, cols, lines } = table(
      { rows: 'selected', ...o },
      { values: 'formatted', header: false },
    )
    if (!lines.length) return false
    const text = toDelimited(lines, o.delimiter ?? '\t', '\n')
    if (!(await copyText(text))) return false
    opts.onCopy({ kind: 'rows', text, rows, columns: cols })
    return true
  }

  /** The row a body cell belongs to (by its `data-row-key` / `data-pinned-key`). */
  function rowOf(key: string): T | undefined {
    const match = (rows: readonly T[]): T | undefined => {
      for (const row of rows) {
        if (String(opts.getKey(row)) === key) return row
        const kids = opts.children(row)
        const found = kids && match(kids)
        if (found) return found
      }
      return undefined
    }
    return match(opts.rows('all')) ?? opts.extraRows().find((r) => String(opts.getKey(r)) === key)
  }

  /** Ctrl/⌘+C in the grid: the selected rows, else the focused cell. A text selection wins. */
  function onKeyDown(event: KeyboardEvent) {
    if (
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      event.shiftKey ||
      event.key.toLowerCase() !== 'c'
    )
      return
    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return
    const selection = globalThis.getSelection?.()
    if (selection && !selection.isCollapsed && selection.toString()) return
    if (opts.selected.value.length) {
      event.preventDefault()
      void copyRows()
      return
    }
    const cell = target.closest<HTMLElement>('[data-col-key]')
    const rowEl = cell?.parentElement
    const key = rowEl?.dataset.rowKey ?? rowEl?.dataset.pinnedKey
    const col = cell && opts.allColumns().find((c) => c.key === cell.dataset.colKey)
    const row = key !== undefined ? rowOf(key) : undefined
    if (!col || row === undefined) return
    event.preventDefault()
    const text = cellText(row, col, opts.format())
    void copyText(text).then(
      (ok) => ok && opts.onCopy({ kind: 'cell', text, rows: [row], columns: [col] }),
    )
  }

  return { getCsv, exportCsv, copyRows, onKeyDown }
}
