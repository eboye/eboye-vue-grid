import { shallowReactive } from 'vue'
import type { RowKey } from '../types'

export type SubRowEntry =
  | { status: 'loading' }
  | { status: 'loaded'; rows: unknown[] }
  | { status: 'error'; error: unknown }

export interface SubRowsOptions<T> {
  getKey: (row: T) => RowKey
  subRows: () => ((row: T) => T[] | undefined | null) | undefined
  loadSubRows: () => ((row: T) => Promise<T[]>) | undefined
  hasSubRows: () => ((row: T) => boolean) | undefined
  onError: (row: T, error: unknown) => void
}

/**
 * Child rows for the sub-grid: synchronous via `subRows(row)`, or lazily via `loadSubRows(row)`
 * (cached per row key, with loading/error states and retry). A synchronous result wins.
 */
export function useSubRows<T>(opts: SubRowsOptions<T>) {
  const cache = shallowReactive(new Map<RowKey, SubRowEntry>())
  // Guards against a stale response landing after a retry started a newer request.
  const requestIds = new Map<RowKey, number>()

  function syncChildren(row: T): T[] | undefined {
    const result = opts.subRows()?.(row)
    return Array.isArray(result) ? result : undefined
  }

  function children(row: T): T[] | undefined {
    const sync = syncChildren(row)
    if (sync) return sync
    const entry = cache.get(opts.getKey(row))
    return entry?.status === 'loaded' ? (entry.rows as T[]) : undefined
  }

  function mayHaveChildren(row: T): boolean {
    const sync = syncChildren(row)
    if (sync) return sync.length > 0
    if (!opts.loadSubRows()) return false
    const entry = cache.get(opts.getKey(row))
    if (entry?.status === 'loaded') return entry.rows.length > 0
    const hint = opts.hasSubRows()
    return hint ? hint(row) : true
  }

  function load(row: T) {
    const loader = opts.loadSubRows()
    if (!loader) return
    const key = opts.getKey(row)
    const id = (requestIds.get(key) ?? 0) + 1
    requestIds.set(key, id)
    cache.set(key, { status: 'loading' })
    Promise.resolve()
      .then(() => loader(row))
      .then(
        (rows) => {
          if (requestIds.get(key) === id) cache.set(key, { status: 'loaded', rows: rows ?? [] })
        },
        (error: unknown) => {
          if (requestIds.get(key) !== id) return
          cache.set(key, { status: 'error', error })
          opts.onError(row, error)
        },
      )
  }

  /** Starts loading if this row needs async children and has not been requested yet. */
  function ensure(row: T) {
    if (syncChildren(row) || !opts.loadSubRows()) return
    if (!cache.has(opts.getKey(row))) load(row)
  }

  function state(row: T): SubRowEntry | undefined {
    if (syncChildren(row)) return undefined
    return cache.get(opts.getKey(row))
  }

  return { children, mayHaveChildren, ensure, retry: load, state }
}
