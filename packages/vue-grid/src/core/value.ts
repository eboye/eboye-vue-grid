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

export function getCellValue<T>(
  row: T,
  column: Pick<ColumnDef<T>, 'key' | 'field' | 'value'>,
): unknown {
  if (column.value) return column.value(row)
  return getByPath(row, column.field ?? column.key)
}

const UNSAFE = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Writes a cell value into its row along the column's `field` (or `key`) path, e.g. in a
 * `cell-edit` handler: `setCellValue(e.row, e.column, e.value)`. Returns `false` when it can't: a
 * computed column (`value` without `field`), or a path through a missing object.
 */
export function setCellValue<T>(
  row: T,
  column: Pick<ColumnDef<T>, 'key' | 'field' | 'value'>,
  value: unknown,
): boolean {
  if (column.value && !column.field) return false
  const path = (column.field ?? column.key).split('.')
  if (path.some((p) => UNSAFE.has(p))) return false
  let target: unknown = row
  for (const segment of path.slice(0, -1)) {
    if (target === null || typeof target !== 'object' || !hasOwn(target, segment)) return false
    target = (target as Record<string, unknown>)[segment]
  }
  if (target === null || typeof target !== 'object') return false
  ;(target as Record<string, unknown>)[path[path.length - 1]!] = value
  return true
}

export type RowKeyGetter<T> = keyof T | ((row: T) => RowKey)

export function resolveRowKey<T>(row: T, rowKey: RowKeyGetter<T>): RowKey {
  if (typeof rowKey === 'function') return rowKey(row)
  return row[rowKey] as RowKey
}
