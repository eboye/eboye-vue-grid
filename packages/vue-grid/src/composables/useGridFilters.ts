import { computed, shallowRef, watch, type Ref } from 'vue'
import {
  activeFilterCount,
  emptyFilters,
  foldText,
  isFilterActive,
  localFilterStorage,
  matchesFilter,
  setKey,
  type ColumnFilter,
  type FilterState,
  type FilterStateStorage,
  type FilterType,
} from '../core/filter'
import { getCellValue } from '../core/value'
import type { CellRendererDefinition, ColumnDef, ColumnFilterOptions, FilterOption, RowKey } from '../types'

export interface DistinctValue {
  key: string
  label: string
  count: number
}

export interface GridFiltersOptions<T> {
  model: Ref<FilterState | null | undefined>
  storage: () => string | FilterStateStorage | undefined
  mode: () => 'client' | 'controlled'
  /** All column definitions (filters on hidden columns keep applying). */
  columns: () => readonly ColumnDef<T>[]
  /** Visible columns, for the quick search. */
  visibleColumns: () => readonly ColumnDef<T>[]
  definitionOf: (col: ColumnDef<T>) => CellRendererDefinition | undefined
  rows: () => readonly T[]
  childrenOf: (row: T) => readonly T[] | undefined
  getKey: (row: T) => RowKey
  timeZone: () => string | undefined
}

/** Value-list options → the panel's entries. */
export function toDistinct(options: readonly FilterOption[]): DistinctValue[] {
  return options.map((o) => ({ key: setKey(o.value), label: o.label ?? (setKey(o.value) || '(Blanks)'), count: o.count ?? 0 }))
}

/** Filter type of a column: explicit, else from its renderer, else `text`. `custom` with a filter component. */
export function filterTypeOf(col: ColumnDef, definition: CellRendererDefinition | undefined): FilterType | 'custom' {
  const explicit = typeof col.filter === 'string' ? col.filter : (col.filter as ColumnFilterOptions | undefined)?.type
  if (explicit) return explicit
  if (col.filterComponent) return 'custom'
  return definition?.filterType ?? 'text'
}

/**
 * The grid's filters: state (`v-model:filters`, else persisted, else empty), client-side matching
 * (a single pass over the row tree producing the set of visible row keys), and value lists.
 */
export function useGridFilters<T>(opts: GridFiltersOptions<T>) {
  const adapter = computed<FilterStateStorage | undefined>(() => {
    const s = opts.storage()
    return typeof s === 'string' ? localFilterStorage(s) : s
  })
  const stored = shallowRef<FilterState | null>(adapter.value?.load() ?? null)
  watch(adapter, (a) => (stored.value = a?.load() ?? null))

  const state = computed<FilterState>(() => {
    const s = opts.model.value ?? stored.value
    return s ? { columns: s.columns ?? {}, search: s.search ?? '' } : emptyFilters()
  })

  function setFilters(next: FilterState) {
    const clean: FilterState = { columns: { ...next.columns }, search: next.search ?? '' }
    opts.model.value = clean
    stored.value = clean
    adapter.value?.save(clean)
  }

  function setColumnFilter(key: string, filter: ColumnFilter | undefined) {
    const columns = { ...state.value.columns }
    if (filter && isFilterActive(filter)) columns[key] = filter
    else delete columns[key]
    setFilters({ ...state.value, columns })
  }

  const setSearch = (search: string) => setFilters({ ...state.value, search })
  const clearAll = () => setFilters(emptyFilters())

  const isActive = (key: string) => isFilterActive(state.value.columns[key])
  const activeCount = computed(() => activeFilterCount(state.value))

  const valueOf = (row: T, col: ColumnDef<T>) => (col.filterValue ? col.filterValue(row) : getCellValue(row, col))

  /** Does the row pass every column filter and the quick search? */
  const predicate = computed<((row: T) => boolean) | null>(() => {
    if (opts.mode() !== 'client') return null
    const byKey = new Map(opts.columns().map((c) => [c.key, c]))
    const active = Object.entries(state.value.columns)
      .filter(([key, f]) => byKey.has(key) && isFilterActive(f))
      .map(([key, f]) => [byKey.get(key)!, f] as const)
    const q = foldText(state.value.search?.trim())
    const searchable = q ? opts.visibleColumns().filter((c) => c.searchable !== false) : []
    if (!active.length && !q) return null
    const timeZone = opts.timeZone()
    return (row: T) => {
      for (const [col, filter] of active) {
        const value = valueOf(row, col)
        const ok = col.filterFn ? col.filterFn(row, filter, value) : matchesFilter(value, filter, { timeZone })
        if (!ok) return false
      }
      return !q || searchable.some((col) => foldText(valueOf(row, col)).includes(q))
    }
  })

  /**
   * Keys of rows to show, or null when nothing is filtered. A row shows if it matches, if an
   * ancestor matches (its whole branch stays), or if any descendant matches (the path to it stays).
   */
  const visibleKeys = computed<Set<RowKey> | null>(() => {
    const match = predicate.value
    if (!match) return null
    const keys = new Set<RowKey>()
    const visit = (rows: readonly T[], ancestorMatched: boolean): boolean => {
      let any = false
      for (const row of rows) {
        const self = ancestorMatched || match(row)
        const kids = opts.childrenOf(row)
        const kidVisible = kids?.length ? visit(kids, self) : false
        if (self || kidVisible) {
          keys.add(opts.getKey(row))
          any = true
        }
      }
      return any
    }
    visit(opts.rows(), false)
    return keys
  })

  /** Client mode: the rows of one level that pass the filters. */
  function apply(rows: readonly T[]): readonly T[] {
    const keys = visibleKeys.value
    return keys ? rows.filter((row) => keys.has(opts.getKey(row))) : rows
  }

  const isVisible = (row: T) => !visibleKeys.value || visibleKeys.value.has(opts.getKey(row))

  /** Distinct values of a column across all known rows, for the value-list (`set`) filter. */
  function distinctValues(col: ColumnDef<T>): DistinctValue[] {
    const explicit = (col.filter as ColumnFilterOptions | undefined)?.options
    if (typeof explicit === 'function') return [] // loaded by the panel (e.g. from a backend)
    if (typeof col.filter === 'object' && explicit) return toDistinct(explicit)
    const counts = new Map<string, number>()
    const visit = (rows: readonly T[]) => {
      for (const row of rows) {
        const key = setKey(valueOf(row, col))
        counts.set(key, (counts.get(key) ?? 0) + 1)
        const kids = opts.childrenOf(row)
        if (kids?.length) visit(kids)
      }
    }
    visit(opts.rows())
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
    return [...counts]
      .map(([key, count]) => ({ key, label: key || '(Blanks)', count }))
      .sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : collator.compare(a.label, b.label)))
  }

  const typeOf = (col: ColumnDef<T>) => filterTypeOf(col, opts.definitionOf(col))

  return {
    state,
    setFilters,
    setColumnFilter,
    setSearch,
    clearAll,
    isActive,
    activeCount,
    apply,
    isVisible,
    visibleKeys,
    distinctValues,
    typeOf,
  }
}
