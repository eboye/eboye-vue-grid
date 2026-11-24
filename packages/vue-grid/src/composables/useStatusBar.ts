import { computed, type Ref } from 'vue'
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

  return {
    enabled: computed(() => !!config.value),
    canClear: opts.canClear,
    scope: computed<StatusBarScope>(() => ({
      rowCount: opts.rowCount(),
      totalRowCount: opts.totalRowCount(),
      selectedCount: opts.selection?.count.value ?? 0,
      allSelected: opts.allMatching.value,
      filterCount: opts.filterCount.value,
      summary: summary.value,
      clearFilters: opts.clearFilters,
    })),
  }
}

/** What the status bar component gets from the grid. */
export type StatusBarState = ReturnType<typeof useStatusBar>
