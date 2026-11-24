import type { RowKey } from '../types'
import { resolveRowKey, type RowKeyGetter } from './value'

/** Field updates for rows, by row key: a `Map`, or a list of partial rows that include the key. */
export type RowPatches<T> = ReadonlyMap<RowKey, Partial<T>> | readonly Partial<T>[]

export interface PatchRowsOptions<T> {
  /** Also patch nested child rows stored in this field (the data behind `subRows`). */
  children?: keyof T
}

const SKIP_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function toMap<T>(patches: RowPatches<T>, rowKey: RowKeyGetter<T>): Map<RowKey, Partial<T>> {
  if (patches instanceof Map) return patches as Map<RowKey, Partial<T>>
  const map = new Map<RowKey, Partial<T>>()
  for (const patch of patches as readonly Partial<T>[]) {
    const key = resolveRowKey(patch as T, rowKey)
    if (key !== undefined && key !== null) map.set(key, { ...map.get(key), ...patch })
  }
  return map
}

/**
 * Applies field updates (e.g. enrichment that arrives later) to rows **immutably and minimally**:
 * a patched row becomes a new object, every other row keeps its identity — so the grid re-renders
 * only the patched rows. Patches that change nothing keep the row (and the array) as they are, and
 * unknown keys are ignored.
 *
 * ```ts
 * rows.value = patchRows(rows.value, [{ id: 3, city: 'Niš' }, { id: 7, city: 'Beograd' }], 'id')
 * ```
 *
 * For `reactive()` / `ref()` rows you can also just assign the field (`row.city = 'Niš'`): the grid
 * then re-renders only that cell. `patchRows` is for immutable data (e.g. a `shallowRef` holding a
 * large list) and for applying a batch of patches by key.
 */
export function patchRows<T>(
  rows: readonly T[],
  patches: RowPatches<T>,
  rowKey: RowKeyGetter<T>,
  options: PatchRowsOptions<T> = {},
): T[] {
  const map = toMap(patches, rowKey)
  if (!map.size) return rows as T[]
  return patchWith(rows, map, rowKey, options.children)
}

function patchWith<T>(
  rows: readonly T[],
  map: ReadonlyMap<RowKey, Partial<T>>,
  rowKey: RowKeyGetter<T>,
  children: keyof T | undefined,
): T[] {
  let changed = false
  const out = rows.map((row) => {
    let next = row
    const patch = map.get(resolveRowKey(row, rowKey))
    if (patch) {
      for (const [field, value] of Object.entries(patch)) {
        if (SKIP_PROTO_KEYS.has(field) || Object.is((row as Record<string, unknown>)[field], value))
          continue
        if (next === row) next = { ...(row as object) } as T
        ;(next as Record<string, unknown>)[field] = value
      }
    }
    if (children) {
      const kids = (next as Record<PropertyKey, unknown>)[children as PropertyKey]
      if (Array.isArray(kids) && kids.length) {
        const patchedKids = patchWith(kids as T[], map, rowKey, children)
        if (patchedKids !== kids) {
          if (next === row) next = { ...(row as object) } as T
          ;(next as Record<PropertyKey, unknown>)[children as PropertyKey] = patchedKids
        }
      }
    }
    if (next !== row) changed = true
    return next
  })
  return changed ? out : (rows as T[])
}
