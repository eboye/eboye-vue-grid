/* eslint-disable @typescript-eslint/no-explicit-any -- rows are type-erased here; ColumnDef<T> keeps the public API typed. */
import { toNumber } from '../renderers/format'
import type { ColumnDef } from '../types'
import { compareValues } from './sort'
import { getCellValue } from './value'

/** Built-in aggregates. `count` is the number of rows; the others skip empty values. */
export type AggregateName = 'sum' | 'avg' | 'min' | 'max' | 'count'

/** A custom aggregate: the column's cell values (one per row, in row order) and the rows. */
export type AggregateFn<T = any> = (values: unknown[], rows: readonly T[]) => unknown

const isEmpty = (v: unknown) =>
  v === null ||
  v === undefined ||
  v === '' ||
  (typeof v === 'number' && Number.isNaN(v)) ||
  (v instanceof Date && Number.isNaN(v.getTime()))

/** Applies one aggregate to a column's values. Empty input gives `null` (`0` for `count`). */
export function aggregateValues<T>(
  aggregate: AggregateName | AggregateFn<T>,
  values: readonly unknown[],
  rows: readonly T[],
): unknown {
  if (typeof aggregate === 'function') return aggregate(values as unknown[], rows)
  switch (aggregate) {
    case 'count':
      return rows.length
    case 'sum':
    case 'avg': {
      let total = 0
      let n = 0
      for (const v of values) {
        const num = toNumber(v)
        if (num === null) continue
        total += num
        n++
      }
      if (!n) return null
      return aggregate === 'sum' ? total : total / n
    }
    case 'min':
    case 'max': {
      const sign = aggregate === 'min' ? 1 : -1
      let best: unknown = undefined
      let found = false
      for (const v of values) {
        if (isEmpty(v)) continue
        if (!found || compareValues(v, best) * sign < 0) best = v
        found = true
      }
      return found ? best : null
    }
    default:
      return null
  }
}

/** The aggregates of every column that has one (`column.aggregate`), by column key. */
export function aggregateRows<T>(
  rows: readonly T[],
  columns: readonly ColumnDef<T>[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const col of columns) {
    if (!col.aggregate) continue
    // `count` needs no values: skip reading every cell.
    const values = col.aggregate === 'count' ? [] : rows.map((row) => getCellValue(row, col))
    out[col.key] = aggregateValues(col.aggregate, values, rows)
  }
  return out
}
