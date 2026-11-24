import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { patchRows, type RowPatches } from '../core/patch'
import type { RowKey } from '../types'
import type { FilterState } from '../core/filter'
import type { SortState } from '../types'

/** Everything a backend needs to produce the rows the grid shows. */
export interface GridQuery {
  sort: SortState | null
  filters: FilterState
  /** 1-based; with `pageSize: null` (no pagination) always 1. */
  page: number
  pageSize: number | null
}

export interface DataSourceResult<T> {
  rows: T[]
  /** Total matching rows (for pagination); default `rows.length`. */
  total?: number
}

/** Loads rows for a query. Honour `signal` to cancel superseded requests. */
export type DataSource<T> = (
  query: GridQuery,
  ctx: { signal: AbortSignal },
) => Promise<DataSourceResult<T>>

export interface DataSourceOptions<T> {
  source: () => DataSource<T> | undefined
  query: () => GridQuery
  getKey: (row: T) => RowKey
  onError: (error: unknown) => void
}

/**
 * Server-side rows: calls the data source whenever the query changes (coalesced per tick),
 * cancels the request it supersedes, ignores late responses, and tracks loading / error.
 */
export function useDataSource<T>(opts: DataSourceOptions<T>) {
  const rows = shallowRef<T[]>([])
  const total = ref<number | undefined>(undefined)
  const loading = ref(false)
  const error = shallowRef<unknown>(null)
  let controller: AbortController | undefined
  let seq = 0

  async function load() {
    const source = opts.source()
    controller?.abort()
    if (!source) {
      loading.value = false
      return
    }
    controller = new AbortController()
    const { signal } = controller
    const id = ++seq
    loading.value = true
    error.value = null
    try {
      const result = await source(opts.query(), { signal })
      if (id !== seq) return // superseded
      rows.value = result?.rows ?? []
      total.value = result?.total ?? rows.value.length
    } catch (e) {
      if (id !== seq || signal.aborted) return
      error.value = e
      opts.onError(e)
    } finally {
      if (id === seq) loading.value = false
    }
  }

  // Serialised so equal queries (e.g. a re-set identical filter) don't refetch.
  watch(
    () => [opts.source(), JSON.stringify(opts.query())] as const,
    () => void load(),
    { immediate: true, flush: 'post' },
  )
  onBeforeUnmount(() => controller?.abort())

  /** Field patches for the loaded rows (same semantics as `patchRows`). Returns rows changed. */
  function patch(patches: RowPatches<T>): number {
    const next = patchRows(rows.value, patches, opts.getKey)
    if (next === rows.value) return 0
    const count = next.filter((row, i) => row !== rows.value[i]).length
    rows.value = next
    return count
  }

  return { rows, total, loading, error, reload: load, patch }
}
