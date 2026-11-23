import { shallowReactive, toRaw } from 'vue'
import { patchRows, type RowPatches } from '../core/patch'
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
  /** A row's lazy children arrived. */
  onLoaded?: (row: T, rows: T[]) => void
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
          if (requestIds.get(key) !== id) return
          cache.set(key, { status: 'loaded', rows: rows ?? [] })
          opts.onLoaded?.(row, rows ?? [])
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

  /**
   * Applies field patches to lazily loaded children (they live in this cache, not in the app's
   * data). Immutable: only entries containing a patched row are replaced, so only those rows
   * re-render. Returns how many rows were patched.
   */
  function patchLoaded(patches: RowPatches<T>): number {
    let count = 0
    for (const [key, entry] of cache) {
      if (entry.status !== 'loaded') continue
      const next = patchRows(entry.rows as T[], patches, opts.getKey)
      if (next === entry.rows) continue
      count += next.filter((row, i) => row !== entry.rows[i]).length
      cache.set(key, { status: 'loaded', rows: next })
    }
    return count
  }

  /**
   * Forgets loaded children (of one row, or all), so expanded rows load them again. Requests still
   * in flight for them are ignored when they land.
   */
  function clear(key?: RowKey) {
    if (key === undefined) {
      cache.clear()
      requestIds.clear()
    } else {
      cache.delete(key)
      requestIds.delete(key)
    }
  }

  /**
   * `children` / `mayHaveChildren` / `state` over plain values, for a pass over many rows (the
   * virtual layout): the props and the cache are read once, with one dependency on the whole cache.
   */
  function snapshot(keyOf: (row: T) => RowKey = opts.getKey) {
    // Keys come from the raw row: reading them through a reactive row would track each one.
    const getKey = (row: T) => keyOf(toRaw(row))
    void cache.size // any change to the cache re-runs the caller
    const raw = toRaw(cache)
    const subRows = opts.subRows()
    const hasLoader = !!opts.loadSubRows()
    const hint = opts.hasSubRows()
    const sync = (row: T): T[] | undefined => {
      const result = subRows?.(row)
      return Array.isArray(result) ? result : undefined
    }
    return {
      children(row: T): T[] | undefined {
        const s = sync(row)
        if (s) return s
        const entry = raw.get(getKey(row))
        return entry?.status === 'loaded' ? (entry.rows as T[]) : undefined
      },
      mayHaveChildren(row: T): boolean {
        const s = sync(row)
        if (s) return s.length > 0
        if (!hasLoader) return false
        const entry = raw.get(getKey(row))
        if (entry?.status === 'loaded') return entry.rows.length > 0
        return hint ? hint(row) : true
      },
      state(row: T): SubRowEntry | undefined {
        return sync(row) ? undefined : raw.get(getKey(row))
      },
    }
  }

  return { children, mayHaveChildren, ensure, retry: load, state, patchLoaded, clear, snapshot }
}
