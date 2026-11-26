/* eslint-disable @typescript-eslint/no-explicit-any -- rows are an opaque, type-erased T inside the grid internals. */
import { computed, onScopeDispose, shallowReactive, toRaw, watch, watchEffect, type Ref } from 'vue'
import { groupedLevels, isRowGroup, pathKey, serverGroups, type RowGroup } from '../core/grouping'
import type { ColumnDef, RowKey } from '../types'
import type { DataSourceResult, GroupPath, ServerGroup } from './useDataSource'
import type { SubRowEntry } from './useSubRows'

export interface ServerGroupsOptions<T> {
  /** The top-level groups the data source returned for a grouped query; undefined: it sent rows. */
  top: () => readonly ServerGroup[] | undefined
  /** Changes on a successful fetch, even when its group metadata is reused. */
  revision?: () => number | undefined
  /** A group's contents: its sub-groups or (at the last level) its rows. */
  load: (path: GroupPath, signal: AbortSignal) => Promise<DataSourceResult<T>>
  /** Groups selected by query (`v-model:selected-groups`). */
  selectedGroups: Ref<GroupPath[]>
  selected: Ref<RowKey[]>
  getKey: (row: T) => RowKey
  onError: (error: unknown) => void
}

/** `key` is the group `of` or inside it. */
const within = (key: string, of: string) => key === of || key.startsWith(`${of}\u001e`)

/**
 * The server grouping feature: groups from the data source, each one's contents loaded when it
 * expands (cached, with loading / error states), and groups selected by query, without their rows.
 * The row grouping feature calls in here for groups that came from the server.
 */
export function useServerGroups<T>(opts: ServerGroupsOptions<T>) {
  const cache = shallowReactive(new Map<string, SubRowEntry>())
  const requests = new Map<string, AbortController>()
  /** Loaded rows → the key of the group they were loaded in. */
  const rowGroup = new WeakMap<object, string>()
  // A new answer to the top-level query (sort, filters, page, grouping): load contents again.
  function clear() {
    for (const c of requests.values()) c.abort()
    requests.clear()
    cache.clear()
  }
  watch([opts.top, () => opts.revision?.()], clear)
  onScopeDispose(clear)

  /** The top-level groups, as group rows (undefined: the server sent rows). */
  const groups = (by: readonly ColumnDef<T>[]) => {
    opts.revision?.()
    const top = opts.top()
    return top && by[0] ? serverGroups(top, by[0]) : undefined
  }

  function load(group: RowGroup<T>, by: readonly ColumnDef<T>[]) {
    requests.get(group.key)?.abort()
    const controller = new AbortController()
    requests.set(group.key, controller)
    cache.set(group.key, { status: 'loading' })
    const next = by[group.level + 1]
    Promise.resolve()
      .then(() => opts.load(group.path as GroupPath, controller.signal))
      .then(
        (result) => {
          if (requests.get(group.key) !== controller) return
          requests.delete(group.key)
          const rows: unknown[] =
            next && result?.groups
              ? serverGroups(result.groups, next, group)
              : ((result?.rows ?? []) as unknown[])
          for (const row of rows)
            if (!isRowGroup(row)) rowGroup.set(toRaw(row as object), group.key)
          groupedLevels.add(rows) // already filtered and sorted by the server
          cache.set(group.key, { status: 'loaded', rows })
        },
        (error: unknown) => {
          if (requests.get(group.key) !== controller || controller.signal.aborted) return
          requests.delete(group.key)
          cache.set(group.key, { status: 'error', error })
          opts.onError(error)
        },
      )
  }
  const children = (group: RowGroup<T>): T[] | undefined => {
    const entry = cache.get(group.key)
    return entry?.status === 'loaded' ? (entry.rows as T[]) : undefined
  }
  const state = (group: RowGroup<T>) => cache.get(group.key)
  function ensure(group: RowGroup<T>, by: readonly ColumnDef<T>[]) {
    if (group.count > 0 && !cache.has(group.key)) load(group, by)
  }
  /** Re-reads the cache (any level loaded or failed): for computeds over the tree. */
  const track = () => void cache.size

  // ── Selection by query ──────────────────────────────────────────────────────────────────
  const selectedKeys = computed(() => new Set(opts.selectedGroups.value.map((p) => pathKey(p))))
  /** The selected group a group (by key) is, or is inside. */
  function selecting(key: string | undefined): string | undefined {
    if (!key) return undefined
    for (const k of selectedKeys.value) if (within(key, k)) return k
    return undefined
  }
  /** Inside a selected group: ticked and locked, untick the group to change it. */
  const locked = (row: any) =>
    isRowGroup(row)
      ? !!selecting(row.key) && !selectedKeys.value.has(row.key)
      : !!selecting(rowGroup.get(toRaw(row as object)))
  /** Loaded rows inside a group (its sub-groups' included). */
  function loadedRows(group: RowGroup<T>, visit: (row: T) => void) {
    for (const [key, entry] of cache)
      if (within(key, group.key) && entry.status === 'loaded')
        for (const r of entry.rows) if (!isRowGroup(r)) visit(r as T)
  }
  function checkState(group: RowGroup<T>): 'all' | 'some' | 'none' {
    if (selecting(group.key)) return 'all'
    for (const k of selectedKeys.value) if (within(k, group.key)) return 'some'
    const picked = new Set(opts.selected.value)
    let some = false
    loadedRows(group, (r) => {
      if (picked.has(opts.getKey(r))) some = true
    })
    return some ? 'some' : 'none'
  }
  /** Ticks or unticks a group, by its path; what it holds counts through it from then on. */
  function toggle(group: RowGroup<T>) {
    const checked = checkState(group) !== 'all'
    const paths = opts.selectedGroups.value.filter((p) => !within(pathKey(p), group.key))
    opts.selectedGroups.value = checked ? [...paths, group.path as GroupPath] : paths
    if (checked && opts.selected.value.length) {
      const inside = new Set<RowKey>()
      loadedRows(group, (r) => inside.add(opts.getKey(r)))
      opts.selected.value = opts.selected.value.filter((k) => !inside.has(k))
    }
  }
  /** Rows of the selected groups (they aren't loaded: the server's counts). */
  function selectedCount(each: (visit: (g: RowGroup<T>) => void) => void) {
    const counts = computed<Map<string, number>>((previous) => {
      const next = new Map<string, number>()
      for (const key of selectedKeys.value) {
        const count = previous?.get(key)
        if (count !== undefined) next.set(key, count)
      }
      if (selectedKeys.value.size)
        each((group) => {
          if (selectedKeys.value.has(group.key)) next.set(group.key, group.count)
        })
      return next
    })
    // Record counts as pages arrive, even when no toolbar or status bar is reading them.
    watchEffect(() => void counts.value, { flush: 'post' })
    return computed(() => [...counts.value.values()].reduce((total, count) => total + count, 0))
  }
  /** The header checkbox: every top-level group, or none. */
  function allState(top: readonly RowGroup<T>[]): 'all' | 'some' | 'none' {
    if (!top.length) return 'none'
    const n = top.filter((g) => selectedKeys.value.has(g.key)).length
    if (n === top.length) return 'all'
    return n || opts.selectedGroups.value.length || opts.selected.value.length ? 'some' : 'none'
  }
  function toggleAll(top: readonly RowGroup<T>[]) {
    opts.selectedGroups.value = allState(top) === 'all' ? [] : top.map((g) => g.path as GroupPath)
    opts.selected.value = []
  }
  /** A group's loaded rows (export, print). */
  function rowsIn(group: RowGroup<T>): T[] {
    const out: T[] = []
    const add = (g: RowGroup<T>) => {
      for (const r of children(g) ?? []) {
        if (isRowGroup(r)) add(r as RowGroup<T>)
        else out.push(r)
      }
    }
    add(group)
    return out
  }

  return {
    groups,
    children,
    state,
    ensure,
    retry: load,
    track,
    locked,
    checkState,
    toggle,
    selectedCount,
    allState,
    toggleAll,
    rowsIn,
  }
}

export type ServerGroups<T> = ReturnType<typeof useServerGroups<T>>
