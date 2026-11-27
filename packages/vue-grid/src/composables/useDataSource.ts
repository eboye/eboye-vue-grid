import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { patchRows, type RowPatches } from '../core/patch'
import type { RowKey } from '../types'
import type { FilterState } from '../core/filter'
import type { SortState } from '../types'

/** Everything a backend needs to produce the rows the grid shows. */
export interface GridQuery {
  /** The sort (with `multi-sort`, its first key). */
  sort: SortState | null
  /** With `multi-sort`: every sort key, the first one first (absent without it). */
  sorts?: SortState[]
  filters: FilterState
  /** 1-based; with `pageSize: null` (no pagination) always 1. */
  page: number
  pageSize: number | null
  /**
   * Row grouping with server data: the grouped column keys, outermost first (absent when the grid
   * isn't grouped). Return `groups` for the level `groupPath` asks for, or `rows` at the last level.
   */
  groupBy?: string[]
  /**
   * Which group's contents: `[]` for the top-level groups, `[{ key: 'status', value: 'Won' }]` for
   * the groups (or, at the last level, the rows) inside the "Won" group, and so on.
   */
  groupPath?: GroupPath
}

/** A group, by the values of its grouped columns from the top: `[{ key: 'status', value: 'Won' }]`. */
export type GroupPath = { key: string; value: unknown }[]

/** A group the server returns (row grouping with server data). */
export interface ServerGroup {
  /** The value its rows share in the grouped column. */
  value: unknown
  /** How many rows it holds (sub-groups included). */
  count: number
  /** Its columns' aggregates, by column key, shown in the group row. */
  aggregates?: Record<string, unknown>
}

export interface DataSourceResult<T> {
  /** The rows; with `groupBy`, the rows of a last-level group (`groups` at the levels above). */
  rows?: T[]
  /** With `groupBy`: the groups at `groupPath`'s level, in display order. */
  groups?: ServerGroup[]
  /** Total matching rows (for pagination), or top-level groups when grouped; default the length. */
  total?: number
  /** When grouped: all matching rows, for the status bar (default: the groups' counts added up). */
  rowTotal?: number
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
  /** Grouped server data: the top-level groups of the last response (undefined: it sent rows). */
  const loadedGroups = shallowRef<ServerGroup[] | undefined>(undefined)
  const loadedGrouping = shallowRef<string>()
  const matchesGrouping = computed(
    () => loadedGrouping.value === JSON.stringify(opts.query().groupBy),
  )
  const groups = computed(() => (matchesGrouping.value ? loadedGroups.value : undefined))
  const rowTotal = ref<number | undefined>(undefined)
  const revision = ref(0)
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
      const query = opts.query()
      const grouping = JSON.stringify(query.groupBy)
      const result = await source(query, { signal })
      if (id !== seq || signal.aborted) return // superseded
      rows.value = result?.rows ?? []
      loadedGroups.value = result?.groups
      loadedGrouping.value = grouping
      total.value = result?.total ?? (result?.groups ?? rows.value).length
      rowTotal.value = result?.rowTotal
      revision.value++
    } catch (e) {
      if (id !== seq || signal.aborted) return
      error.value = e
      opts.onError(e)
    } finally {
      if (id === seq) loading.value = false
    }
  }

  // Serialised so equal queries (e.g. a re-set identical filter) don't refetch.
  watch([opts.source, () => JSON.stringify(opts.query())], () => void load(), {
    immediate: true,
    flush: 'post',
  })
  onBeforeUnmount(() => controller?.abort())

  /** Field patches for the loaded rows (same semantics as `patchRows`). Returns rows changed. */
  function patch(patches: RowPatches<T>): number {
    const next = patchRows(rows.value, patches, opts.getKey)
    if (next === rows.value) return 0
    const count = next.filter((row, i) => row !== rows.value[i]).length
    rows.value = next
    return count
  }

  return {
    rows,
    groups,
    matchesGrouping,
    total,
    rowTotal,
    revision,
    loading,
    error,
    reload: load,
    patch,
  }
}
