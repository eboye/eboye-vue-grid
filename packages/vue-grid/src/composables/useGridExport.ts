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
  PrintOptions,
  RowKey,
  XlsxExportOptions,
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
  /** A group row's rows (server groups: the loaded ones). */
  groupRows?: (group: T) => readonly T[]
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
  /** Rows the server query or a selected group makes selected without listing the row key. */
  isImplicitlySelected?: (row: T) => boolean
  hasImplicitSelection?: () => boolean
  /** Rows shown but not in the data (pinned extra rows): a focused cell may be in one. */
  extraRows: () => readonly T[]
  /** Keyed pinned rows, including those cached from previous server pages. */
  pinnedRows?: () => readonly T[]
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
        flatten(
          opts.groupRows?.(row) ?? (row as unknown as { rows: T[] }).rows,
          children,
          filtered,
          out,
        )
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
      const included = new Set<RowKey>()
      const select = (rows: readonly T[], implicit: boolean) =>
        rows.filter((row) => {
          const key = opts.getKey(row)
          if (
            included.has(key) ||
            !(picked.has(key) || (implicit && opts.isImplicitlySelected?.(row)))
          )
            return false
          included.add(key)
          return true
        })
      // nested selected rows count even when `children` is off
      return [
        ...select(flatten(opts.rows('all'), true, false), true),
        ...select(opts.pinnedRows?.() ?? [], false),
      ]
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

  /** A cell for export: `exportValue`, else the value or (with `ctx`) the renderer's text. */
  function cellValue(
    row: T,
    col: ColumnDef<T>,
    ctx: FormatContext | null,
    r = ctx && renderer(col),
  ): unknown {
    if (col.exportValue) return col.exportValue(row)
    const value = getCellValue(row, col)
    return ctx && r?.definition?.format ? r.definition.format(value, r.options, ctx, row) : value
  }
  const cellText = (row: T, col: ColumnDef<T>, ctx: FormatContext | null) =>
    plainText(cellValue(row, col, ctx))

  /** The rows to export as a table of values: raw, or (`formatted`) as the cells show them. */
  function table(o: XlsxExportOptions, defaults: { values: 'raw' | 'formatted'; header: boolean }) {
    const cols = columnsFor(o)
    // formatted: the format context, and each column's renderer, looked up once
    const ctx = (o.values ?? defaults.values) === 'formatted' ? opts.format() : null
    const renderers = cols.map((c) => (ctx ? renderer(c) : null))
    const rows = rowsFor(o)
    const header = (o.header ?? defaults.header) ? cols.map((c) => c.header ?? c.key) : undefined
    const body = rows.map((row) => cols.map((c, i) => cellValue(row, c, ctx, renderers[i])))
    const total = o.totals ? opts.totals() : undefined
    const footer =
      total &&
      cols.map((c, i) => {
        if (!(c.key in total.values)) return i === 0 ? total.label : null
        const value = total.values[c.key]
        const r = renderers[i]
        return ctx && c.aggregate !== 'count' && r?.definition?.format
          ? r.definition.format(value, r.options, ctx, total.values)
          : value
      })
    return { rows, cols, ctx, header, body, footer: footer || undefined }
  }

  /** A table as lines of text, formula-like text guarded unless `guard: false`. */
  function lines(t: ReturnType<typeof table>, o: ExportOptions): string[][] {
    const guard = o.guard === false ? (s: string) => s : guardFormula
    return [...(t.header ? [t.header] : []), ...t.body, ...(t.footer ? [t.footer] : [])].map(
      (line) => line.map((v) => guard(plainText(v))),
    )
  }

  /** The rows as CSV text (raw values, a header line, `,`). */
  function getCsv(o: ExportOptions = {}): string {
    return toDelimited(lines(table(o, { values: 'raw', header: true }), o), o.delimiter ?? ',')
  }

  /** Downloads the rows as a CSV file (UTF-8 with a BOM, so Excel reads accents right). */
  function exportCsv(o: ExportOptions & { filename?: string; bom?: boolean } = {}) {
    const text = getCsv(o)
    download(
      new Blob([o.bom === false ? '' : '\uFEFF', text], { type: 'text/csv;charset=utf-8' }),
      o.filename ?? 'export.csv',
    )
  }

  /**
   * The rows as an Excel workbook: typed cells (numbers, dates, booleans), number formats from the
   * columns' renderers, a bold frozen header, the totals in bold. The writer loads on demand.
   */
  async function getXlsx(o: XlsxExportOptions = {}): Promise<Blob> {
    const t = table(o, { values: 'raw', header: true })
    const { writeXlsx, xlsxFormatOf } = await import('../core/xlsx')
    const bytes = writeXlsx({
      ...t,
      name: o.sheetName,
      rows: t.body,
      formats: t.cols.map((c) => (t.ctx ? 'auto' : xlsxFormatOf(c as ColumnDef))),
      timeZone: opts.format().timeZone,
    })
    return new Blob([bytes as BlobPart], { type: XLSX_TYPE })
  }

  /** Downloads the rows as an Excel file (.xlsx). */
  async function exportXlsx(o: XlsxExportOptions & { filename?: string } = {}) {
    download(await getXlsx(o), o.filename ?? 'export.xlsx')
  }

  /**
   * Prints the rows as a table (the browser's print dialog): every row that passes the filters,
   * not just the ones in view, as the cells show them, with the header on each page. The printing
   * code loads on demand. Resolves when printing is over.
   */
  async function print(o: PrintOptions = {}) {
    const t = table(o, { values: 'formatted', header: true })
    const text = (line: readonly unknown[]) => line.map((v) => plainText(v))
    const { printTable } = await import('../internal/print')
    await printTable({
      title: o.title,
      landscape: o.landscape,
      header: t.header,
      body: t.body.map(text),
      footer: t.footer && text(t.footer),
      align: t.cols.map(
        (c) =>
          opts.columns().find((r) => r.key === c.key)?.align ??
          c.align ??
          renderer(c).definition?.align ??
          'start',
      ),
    })
  }

  /**
   * Copies rows as tab-separated text (pastes as cells into spreadsheets): the selected rows by
   * default, as displayed, without a header. Resolves `false` when nothing was copied.
   */
  async function copyRows(o: ExportOptions = {}): Promise<boolean> {
    const t = table({ rows: 'selected', ...o }, { values: 'formatted', header: false })
    const { rows, cols } = t
    const copied = lines(t, o)
    if (!copied.length) return false
    const text = toDelimited(copied, o.delimiter ?? '\t', '\n')
    if (!(await copyText(text))) return false
    opts.onCopy({ kind: 'rows', text, rows, columns: cols })
    return true
  }

  /** The row a body cell belongs to (by its `data-row-key` / `data-pinned-key`). */
  function rowOf(key: RowKey): T | undefined {
    const match = (rows: readonly T[]): T | undefined => {
      for (const row of rows) {
        const group = opts.isGroup(row)
        if (!group && opts.getKey(row) === key) return row
        const kids = group ? opts.groupRows?.(row) : opts.children(row)
        const found = kids && match(kids)
        if (found) return found
      }
      return undefined
    }
    return (
      match(opts.rows('all')) ??
      opts.pinnedRows?.().find((row) => opts.getKey(row) === key) ??
      opts.extraRows().find((row) => opts.getKey(row) === key)
    )
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
    if (opts.selected.value.length || opts.hasImplicitSelection?.()) {
      event.preventDefault()
      void copyRows()
      return
    }
    const cell = target.closest<HTMLElement>('[data-col-key]')
    const rowEl = cell?.parentElement
    const key = rowEl?.dataset.rowKey ?? rowEl?.dataset.pinnedKey
    const col = cell && opts.allColumns().find((c) => c.key === cell.dataset.colKey)
    const row =
      key !== undefined
        ? rowOf(rowEl?.dataset.vgRowKeyType === 'number' ? Number(key) : key)
        : undefined
    if (!col || row === undefined) return
    event.preventDefault()
    const text = cellText(row, col, opts.format())
    void copyText(text).then(
      (ok) => ok && opts.onCopy({ kind: 'cell', text, rows: [row], columns: [col] }),
    )
  }

  return { getCsv, exportCsv, getXlsx, exportXlsx, print, copyRows, onKeyDown }
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Saves a file: a temporary link to it, clicked. */
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
