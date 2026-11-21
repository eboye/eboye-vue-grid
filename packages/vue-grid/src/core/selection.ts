import type { RowKey } from '../types'

/**
 * Toggles `key`. In cascade mode the row's (known) descendants follow the new state of the row.
 * Returns a new Set; the input is not mutated.
 */
export function toggleRowSelection(
  selected: ReadonlySet<RowKey>,
  key: RowKey,
  descendants: readonly RowKey[],
  cascade: boolean,
): Set<RowKey> {
  const next = new Set(selected)
  const select = !next.has(key)
  const affected = cascade ? [key, ...descendants] : [key]
  for (const k of affected) {
    if (select) next.add(k)
    else next.delete(k)
  }
  return next
}

export type SelectionSummary = 'none' | 'some' | 'all'

export function selectionState(keys: readonly RowKey[], selected: ReadonlySet<RowKey>): SelectionSummary {
  if (!keys.length) return 'none'
  let count = 0
  for (const k of keys) if (selected.has(k)) count++
  return count === 0 ? 'none' : count === keys.length ? 'all' : 'some'
}
