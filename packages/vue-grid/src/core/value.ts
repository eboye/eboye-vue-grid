import type { ColumnDef, RowKey } from '../types'

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

/** Reads a dot path (`a.b.c`) from own properties only — never walks the prototype chain. */
export function getByPath(source: unknown, path: string): unknown {
  let current: unknown = source
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object' || !hasOwn(current, segment)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function getCellValue<T>(row: T, column: Pick<ColumnDef<T>, 'key' | 'field' | 'value'>): unknown {
  if (column.value) return column.value(row)
  return getByPath(row, column.field ?? column.key)
}

export type RowKeyGetter<T> = keyof T | ((row: T) => RowKey)

export function resolveRowKey<T>(row: T, rowKey: RowKeyGetter<T>): RowKey {
  if (typeof rowKey === 'function') return rowKey(row)
  return row[rowKey] as RowKey
}
