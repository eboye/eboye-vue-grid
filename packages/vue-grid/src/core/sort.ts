import type { SortDir, SortState } from '../types'

/** Header click cycle: none → asc → desc → none. A different key starts at asc. */
export function nextSort(current: SortState | null | undefined, key: string): SortState | null {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  return current.dir === 'asc' ? { key, dir: 'desc' } : null
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const isNil = (v: unknown) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v))

/** Compares two non-nil values: numbers, bigints, dates, booleans, then numeric-aware strings. */
export function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return collator.compare(String(a), String(b))
}

/**
 * Stable sort that never mutates its input. Nil values (null/undefined/NaN) always go last,
 * regardless of direction. `compare`, when given, replaces value comparison entirely.
 */
export function sortRows<T>(
  rows: readonly T[],
  dir: SortDir,
  getValue: (row: T) => unknown,
  compare?: (a: T, b: T) => number,
): T[] {
  const sign = dir === 'asc' ? 1 : -1
  const decorated = rows.map((row, index) => ({ row, index, value: compare ? undefined : getValue(row) }))
  decorated.sort((x, y) => {
    let result: number
    if (compare) {
      result = compare(x.row, y.row) * sign
    } else {
      const xNil = isNil(x.value)
      const yNil = isNil(y.value)
      if (xNil || yNil) result = xNil === yNil ? 0 : xNil ? 1 : -1
      else result = compareValues(x.value, y.value) * sign
    }
    return result || x.index - y.index
  })
  return decorated.map((d) => d.row)
}
