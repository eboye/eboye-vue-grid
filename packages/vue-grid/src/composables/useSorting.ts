import { computed, watch, type Ref } from 'vue'
import { nextSort, nextSorts, sortRows, sortRowsBy, type SortKey } from '../core/sort'
import type { ColumnDef, SortState } from '../types'

export interface SortingOptions<T> {
  /** `v-model:sort`: the (first) sort key. */
  sort: Ref<SortState | null>
  /** `v-model:sorts`: every key (multi-column sort). */
  sorts: Ref<SortState[]>
  multiSort: () => boolean
  /** The grid sorts its rows itself (`sort-mode="client"`, no data source). */
  client: () => boolean
  columns: () => readonly ColumnDef<T>[]
  /** A column's value to sort by: its `sortValue`, the renderer's, or the cell value. */
  valueOf: (col: ColumnDef<T>) => (row: T) => unknown
}

const same = (a: SortState | null | undefined, b: SortState | null | undefined) =>
  a?.key === b?.key && a?.dir === b?.dir

/**
 * The sorting feature's state: the sort keys (one, or several with `multi-sort`), kept in step
 * with `v-model:sort` / `v-model:sorts`, header clicks (Shift adds a key), and the client sorter.
 */
export function useSorting<T>(opts: SortingOptions<T>) {
  /** The keys in effect: `sorts` with `multi-sort` (else, or while empty, `sort`). */
  const list = computed<SortState[]>(() =>
    opts.multiSort() && opts.sorts.value.length
      ? opts.sorts.value
      : opts.sort.value
        ? [opts.sort.value]
        : [],
  )
  function set(next: SortState[]) {
    opts.sorts.value = next
    if (!same(opts.sort.value, next[0])) opts.sort.value = next[0] ?? null
  }
  // `sort` set from outside: it becomes the only key.
  watch(opts.sort, (value) => {
    if (!same(value, opts.sorts.value[0]) || (!value && opts.sorts.value.length))
      opts.sorts.value = value ? [value] : []
  })
  // `sorts` set from outside: `sort` follows its first key.
  watch(
    opts.sorts,
    (keys, old) => {
      if (keys.length ? !same(opts.sort.value, keys[0]) : old?.length && opts.sort.value)
        opts.sort.value = keys[0] ?? null
    },
    { immediate: true },
  )

  /** A header click: that column alone; with Shift (`multi-sort`), add it as the next key. */
  function onSort(key: string, add = false) {
    if (opts.multiSort() && add) return set(nextSorts(list.value, key))
    // Only this column: asc → desc → none. Anything else: this column alone, ascending.
    const next = nextSort(list.value.length === 1 ? list.value[0] : null, key)
    set(next ? [next] : [])
  }

  /** The client-side sort as a function, its reactive inputs read once (for many levels). */
  function sorter(): ((rows: readonly T[]) => T[]) | undefined {
    if (!opts.client() || !list.value.length) return undefined
    const columns = opts.columns()
    const keys: SortKey<T>[] = []
    for (const state of list.value) {
      const col = columns.find((c) => c.key === state.key)
      if (col) keys.push({ dir: state.dir, getValue: opts.valueOf(col), compare: col.sortFn })
    }
    if (!keys.length) return undefined
    if (keys.length === 1) {
      const k = keys[0]!
      return (rows) => sortRows(rows, k.dir, k.getValue, k.compare)
    }
    return (rows) => sortRowsBy(rows, keys)
  }

  return { list, set, onSort, sorter }
}
