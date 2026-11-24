import { computed } from 'vue'
import { aggregateRows } from '../core/aggregate'
import type { PinnedRowItem } from '../internal/context'
import type { ColumnDef } from '../types'

export interface TotalsOptions<T> {
  /** The `totals` prop. */
  totals: () => boolean | 'top' | 'bottom' | undefined
  /** The `aggregates` prop: values that win over computed ones. */
  given: () => Record<string, unknown> | undefined
  /** The rows the totals cover (top-level, filtered, every page). */
  rows: () => readonly T[]
  columns: () => readonly ColumnDef<T>[]
}

/** The aggregation feature's totals row: where it goes, its values, and its pinned-row item. */
export function useTotals<T>(opts: TotalsOptions<T>) {
  const at = computed<'top' | 'bottom' | null>(() => {
    const t = opts.totals()
    return !t ? null : t === 'top' ? 'top' : 'bottom'
  })
  const values = computed<Record<string, unknown>>(() => {
    if (!at.value) return {}
    const given = opts.given()
    const columns = given ? opts.columns().filter((c) => !(c.key in given)) : opts.columns()
    const computedValues = aggregateRows(opts.rows(), columns)
    return given ? { ...computedValues, ...given } : computedValues
  })
  const item = computed<PinnedRowItem>(() => ({
    id: 'total',
    kind: 'total',
    row: values.value,
    key: '__vg_total',
    selectable: false,
  }))
  return { at, values, item }
}
