import type { SortDir, SortState } from '../types'

/** Header click cycle: none → asc → desc → none. A different key starts at asc. */
export function nextSort(current: SortState | null | undefined, key: string): SortState | null {
  if (!current || current.key !== key) return { key, dir: 'asc' }
  return current.dir === 'asc' ? { key, dir: 'desc' } : null
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const isNil = (v: unknown) =>
  v === null ||
  v === undefined ||
  (typeof v === 'number' && Number.isNaN(v)) ||
  (v instanceof Date && Number.isNaN(v.getTime()))

/** Compares two non-nil values: numbers, bigints, dates, booleans, then numeric-aware strings. */
export function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return collator.compare(String(a), String(b))
}

/**
 * Stable sort that never mutates its input. Nil values (null/undefined/NaN/invalid Date) always go last,
 * regardless of direction. `compare`, when given, replaces value comparison entirely.
 */
export function sortRows<T>(
  rows: readonly T[],
  dir: SortDir,
  getValue: (row: T) => unknown,
  compare?: (a: T, b: T) => number,
): T[] {
  const sign = dir === 'asc' ? 1 : -1
  const decorated = rows.map((row, index) => ({
    row,
    index,
    value: compare ? undefined : getValue(row),
  }))
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

/** One key of a multi-column sort: a direction and how to read (or compare) the rows. */
export interface SortKey<T> {
  dir: SortDir
  getValue: (row: T) => unknown
  compare?: (a: T, b: T) => number
}

/**
 * Stable sort by several keys, the first one first: ties on a key go to the next. Per key, nil
 * values go last whatever the direction, and `compare` replaces value comparison. Never mutates.
 */
export function sortRowsBy<T>(rows: readonly T[], keys: readonly SortKey<T>[]): T[] {
  if (!keys.length) return [...rows]
  const decorated = rows.map((row, index) => ({
    row,
    index,
    values: keys.map((k) => (k.compare ? undefined : k.getValue(row))),
  }))
  decorated.sort((x, y) => {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]!
      const sign = k.dir === 'asc' ? 1 : -1
      let result: number
      if (k.compare) result = k.compare(x.row, y.row) * sign
      else {
        const a = x.values[i]
        const b = y.values[i]
        const aNil = isNil(a)
        const bNil = isNil(b)
        result = aNil || bNil ? (aNil === bNil ? 0 : aNil ? 1 : -1) : compareValues(a, b) * sign
      }
      if (result) return result
    }
    return x.index - y.index
  })
  return decorated.map((d) => d.row)
}

/**
 * Shift-click on a header in a multi-column sort: a new key is added ascending, an ascending one
 * turns descending, a descending one is removed.
 */
export function nextSorts(current: readonly SortState[], key: string): SortState[] {
  const i = current.findIndex((s) => s.key === key)
  if (i < 0) return [...current, { key, dir: 'asc' }]
  if (current[i]!.dir === 'asc') return current.map((s, j) => (j === i ? { key, dir: 'desc' } : s))
  return current.filter((_, j) => j !== i)
}
