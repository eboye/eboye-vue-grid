import { computed, type Ref } from 'vue'
import { dataAttrs } from '../internal/dataAttrs'
import { aggregateValues } from '../core/aggregate'
import { getCellValue } from '../core/value'
import { formatNumber } from '../renderers/format'
import type {
  CellRendererDefinition,
  ColumnDef,
  FormatContext,
  RowKey,
  StatusBarAggregate,
  StatusBarOptions,
  StatusBarRange,
  StatusBarScope,
  StatusBarSummary,
} from '../types'

export interface UseStatusBarOptions<T> {
  /** The `status-bar` prop. */
  options: () => boolean | StatusBarOptions | undefined
  /** Top-level rows that pass the filters, on every page (the server's total with a data source). */
  rowCount: () => number
  /** Top-level rows before filtering; undefined when unknown (server data). */
  totalRowCount: () => number | undefined
  /** Logical data rows shown on the current page, independent of the virtual viewport. */
  visibleRowCount: () => number
  scrollToTop: () => void
  /** Top-level rows, all of them, to find the selected ones in. */
  rows: () => readonly T[]
  /** The selection feature's state (its `count` includes "all matching"), if the grid has it. */
  selection: { count: Ref<number> } | undefined
  selected: Ref<RowKey[]>
  /** "Select all N matching rows" is on (server data): the loaded rows aren't all of them. */
  allMatching: Ref<boolean>
  /** Active column filters plus the quick search. */
  filterCount: Ref<number>
  /** The grid can filter, so Clear can do something. */
  canClear: boolean
  clearFilters: () => void
  /** Known child rows of a row (sync or loaded). */
  children: (row: T) => readonly T[] | undefined
  getKey: (row: T) => RowKey
  columns: () => readonly ColumnDef<T>[]
  /** The grid's renderer lookup for a column. */
  resolve: (col: ColumnDef<T>) => { definition?: CellRendererDefinition; fallback?: boolean }
  format: Ref<FormatContext>
  /** The selected cell range's rows and columns (range selection feature), if any. */
  range?: () => { rows: readonly T[]; columns: readonly { def: ColumnDef<T> }[] } | null
}

const DEFAULT_AGGREGATES: readonly StatusBarAggregate[] = ['sum', 'avg']

/**
 * The status bar (status bar feature): row, selection and filter counts, and a spreadsheet-like
 * summary (sum, average…) of chosen columns over the selected rows.
 */
export function useStatusBar<T>(opts: UseStatusBarOptions<T>) {
  const config = computed<StatusBarOptions | null>(() => {
    const o = opts.options()
    return o ? (o === true ? {} : o) : null
  })

  /** The selected rows the grid knows (nested ones included). */
  function selectedRows(): T[] {
    const picked = new Set(opts.selected.value)
    const out: T[] = []
    const walk = (rows: readonly T[]) => {
      for (const row of rows) {
        if (picked.has(opts.getKey(row))) out.push(row)
        const kids = opts.children(row)
        if (kids?.length) walk(kids)
      }
    }
    if (picked.size) walk(opts.rows())
    return out
  }

  /** As the column's cells show it: the renderer's text, else a locale number. */
  function text(value: unknown, col: ColumnDef<T>): string {
    const ctx = opts.format.value
    const { definition, fallback } = opts.resolve(col)
    if (definition?.format && !fallback) {
      try {
        const options = { ...(definition.defaults as object), ...(col.rendererOptions as object) }
        const shown = definition.format(value, options, ctx, undefined)
        if (shown) return shown
      } catch {
        // an option function that needs a row (e.g. a per-row currency): a plain number below
      }
    }
    return formatNumber(value, ctx, { maximumFractionDigits: 2 })
  }

  const summary = computed<StatusBarSummary[]>(() => {
    const keys = config.value?.summary
    // With "all matching" only the loaded rows are known: a sum of those would mislead.
    if (!keys?.length || opts.allMatching.value) return []
    const rows = selectedRows()
    if (!rows.length) return []
    const aggregates = config.value?.aggregates ?? DEFAULT_AGGREGATES
    const out: StatusBarSummary[] = []
    for (const key of keys) {
      const col = opts.columns().find((c) => c.key === key)
      if (!col) continue
      const values = rows.map((row) => getCellValue(row, col))
      const items = aggregates
        .map((name) => ({ name, value: aggregateValues(name, values, rows) }))
        .filter((item) => item.value !== null && item.value !== undefined)
        .map((item) => ({ ...item, text: text(item.value, col) }))
      if (items.length) out.push({ key, label: col.header || key, items })
    }
    return out
  })

  /** The selected cell range: its size and aggregates, like a spreadsheet's status bar. */
  const range = computed<StatusBarRange | null>(() => {
    const r = config.value && opts.range?.()
    if (!r) return null
    const values: unknown[] = []
    for (const row of r.rows) for (const col of r.columns) values.push(getCellValue(row, col.def))
    const aggregates = config.value?.aggregates ?? DEFAULT_AGGREGATES
    // one column: formatted like its cells (money stays money); several: plain numbers
    const only = r.columns.length === 1 ? r.columns[0]!.def : undefined
    const items = aggregates
      .map((name) => ({ name, value: aggregateValues(name, values, values) }))
      .filter((item) => item.value !== null && item.value !== undefined)
      .map((item) => ({
        ...item,
        text: only
          ? text(item.value, only)
          : formatNumber(item.value, opts.format.value, { maximumFractionDigits: 2 }),
      }))
    return { cells: values.length, items }
  })

  return {
    enabled: computed(() => !!config.value),
    /** Which items show (each on unless `false`). */
    show: computed(() => {
      const c = config.value ?? {}
      return {
        rows: c.rows !== false,
        selected: c.selected !== false,
        filters: c.filters !== false,
        clear: c.clear !== false,
      }
    }),
    visibleRowCount: computed(() =>
      config.value?.rows !== false && config.value?.rowCountMode === 'visible'
        ? opts.visibleRowCount()
        : undefined,
    ),
    fullyExpandedCount: computed(() => config.value?.fullyExpandedCount),
    groupCounts: computed(() => !!config.value?.groupCounts),
    attrs: computed(() => {
      const attrs = config.value?.attrs
      return (
        attrs && {
          root: dataAttrs(attrs.root),
          counts: dataAttrs(attrs.counts),
          rowCount: dataAttrs(attrs.rowCount),
          fullyExpandedCount: dataAttrs(attrs.fullyExpandedCount),
          backToTop: dataAttrs(attrs.backToTop),
        }
      )
    }),
    backToTop: computed(() => !!config.value?.backToTop),
    scrollToTop: opts.scrollToTop,
    canClear: opts.canClear,
    scope: computed<StatusBarScope>(() => ({
      rowCount: opts.rowCount(),
      totalRowCount: opts.totalRowCount(),
      selectedCount: opts.selection?.count.value ?? 0,
      allSelected: opts.allMatching.value,
      filterCount: opts.filterCount.value,
      summary: summary.value,
      range: range.value,
      clearFilters: opts.clearFilters,
    })),
  }
}

/** What the status bar component gets from the grid. */
export type StatusBarState = ReturnType<typeof useStatusBar>
