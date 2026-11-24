/* eslint-disable @typescript-eslint/no-explicit-any -- rows are an opaque, type-erased T inside the grid internals. */
import { computed, shallowRef, toRaw, watch, type Component, type Ref } from 'vue'
import { GROUP_KEY_PREFIX, groupKeys, groupRows, groupedLevels, isRowGroup, walkGroups, type RowGroup } from '../core/grouping'
import type { GridContext } from '../internal/context'
import type { ColumnDef, RowKey, SortState } from '../types'
import type { SubRowsSnapshot } from './useVirtualRows'

export interface RowGroupingOptions<T> {
  /** The `group-by` model: column keys, outermost first. */
  groupBy: () => readonly string[] | string | null | undefined
  setGroupBy: (keys: string[]) => void
  columns: () => readonly ColumnDef<T>[]
  /** The rows to group: filtered and sorted. */
  rows: () => readonly T[]
  sort: () => SortState | null
  /** The `groups-expanded` prop: groups start expanded. */
  expandedByDefault: () => boolean
  /** The selected row keys (a group's checkbox selects its rows). */
  selected: Ref<RowKey[]>
  /** Cascading selection: a group selects its rows' descendants too, through `walk`. */
  cascade: () => boolean
  walk: (rows: readonly T[], visit: (row: T) => void) => void
}

const isGroupKey = (key: RowKey) => typeof key === 'string' && key.startsWith(GROUP_KEY_PREFIX)

/**
 * The row grouping feature: groups the rows by the `group-by` columns, keeps which groups are
 * expanded (relative to `groups-expanded`, so new groups follow the default; changing the grouped
 * columns starts over), and teaches the grid's context, virtual layout and header menu about
 * group rows. Without the feature none of this is bundled.
 */
export function useRowGrouping<T>(opts: RowGroupingOptions<T>) {
  /** The grouped columns that exist, in `group-by` order. */
  const by = computed<ColumnDef<T>[]>((prev) => {
    const raw = opts.groupBy()
    const keys = raw == null ? [] : typeof raw === 'string' ? [raw] : raw
    const columns = opts.columns()
    const next = [...new Set(keys)].map((k) => columns.find((c) => c.key === k)).filter((c): c is ColumnDef<T> => !!c)
    return prev && prev.length === next.length && prev.every((c, i) => c === next[i]) ? prev : next
  })
  const active = computed(() => by.value.length > 0)
  const groups = computed<RowGroup<T>[]>(() =>
    active.value ? groupRows(opts.rows(), { columns: by.value, allColumns: opts.columns(), sort: opts.sort() }) : [],
  )

  // ── Expansion ───────────────────────────────────────────────────────────────────────────
  /** Groups toggled away from the default. */
  const toggled = shallowRef<ReadonlySet<RowKey>>(new Set())
  watch([() => by.value.map((c) => c.key).join('\u001e'), opts.expandedByDefault], () => (toggled.value = new Set()))

  const isExpanded = (key: RowKey) => opts.expandedByDefault() !== toggled.value.has(key)
  function toggle(key: RowKey) {
    const next = new Set(toggled.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    toggled.value = next
  }
  /** Expands (or collapses) every group. */
  function setAll(expand: boolean) {
    toggled.value = expand === opts.expandedByDefault() ? new Set() : new Set(groupKeys(groups.value))
  }
  /** Keys of the expanded groups. */
  const expandedKeys = computed<ReadonlySet<RowKey>>(() => {
    const out = new Set<RowKey>()
    walkGroups(groups.value, (g) => {
      if (isExpanded(g.key)) out.add(g.key)
    })
    return out
  })

  // ── Virtual layout: group rows nest like sub-grids ─────────────────────────────────────────
  const keyOf = (base: (row: T) => RowKey) => (row: T) => (isRowGroup(row) ? row.key : base(row))
  /** The expanded rows plus the expanded groups. */
  const expanded = (base: ReadonlySet<RowKey>): ReadonlySet<RowKey> =>
    !active.value ? base : base.size ? new Set([...base, ...expandedKeys.value]) : expandedKeys.value
  /** A sub-row snapshot that knows group children (and keeps the sub-grids' own). */
  const tree = (base: ((keyOf: (row: T) => RowKey) => SubRowsSnapshot<T>) | null) =>
    !active.value
      ? base
      : (key: (row: T) => RowKey): SubRowsSnapshot<T> => {
          const s = base?.(key)
          return {
            children: (row) => (isRowGroup(row) ? (row.children as T[]) : s?.children(row)),
            mayHaveChildren: (row) => isRowGroup(row) || !!s?.mayHaveChildren(row),
            state: (row) => (isRowGroup(row) ? undefined : s?.state(row)),
          }
        }
  /** A group's sub-groups and rows are already filtered and sorted. */
  const preparer = (base: (rows: readonly T[]) => readonly T[]) =>
    !active.value ? base : (rows: readonly T[]) => (groupedLevels.has(toRaw(rows)) ? rows : base(rows))

  // ── The grid's context: group rows expand, nest, and select their rows ───────────────────────
  function extend(ctx: GridContext, GroupCells: Component) {
    const base = { ...ctx }
    /** Keys of the selectable rows in a group (cascading: their descendants too). */
    const selectableKeys = (group: RowGroup<T>) => {
      const keys: RowKey[] = []
      const add = (row: T) => {
        if (base.isRowSelectable(row)) keys.push(base.getKey(row))
      }
      if (opts.cascade()) opts.walk(group.rows, add)
      else group.rows.forEach(add)
      return keys
    }
    const checkState = (group: RowGroup<T>) => {
      const keys = selectableKeys(group)
      const picked = new Set(opts.selected.value)
      const n = keys.filter((k) => picked.has(k)).length
      return n === 0 ? 'none' : n === keys.length ? 'all' : 'some'
    }
    Object.assign(ctx, {
      grouping: { GroupCells, isGroup: isRowGroup },
      treeMode: computed(() => base.treeMode.value || active.value),
      getKey: keyOf(base.getKey),
      canExpand: (row: any) => isRowGroup(row) || base.canExpand(row),
      isExpanded: (key: RowKey) => (isGroupKey(key) ? isExpanded(key) : base.isExpanded(key)),
      toggleExpanded: (row: any) => (isRowGroup(row) ? toggle(row.key) : base.toggleExpanded(row)),
      children: (row: any) => (isRowGroup(row) ? (row.children as any[]) : base.children(row)),
      subRowState: (row: any) => (isRowGroup(row) ? undefined : base.subRowState(row)),
      ensureSubRows: (row: any) => {
        if (!isRowGroup(row)) base.ensureSubRows(row)
      },
      isRowSelectable: (row: any) =>
        isRowGroup(row) ? base.selectMode.value === 'multi' && selectableKeys(row).length > 0 : base.isRowSelectable(row),
      rowCheckState: (row: any) => (isRowGroup(row) ? checkState(row) : base.rowCheckState(row)),
      toggleRow: (row: any) => {
        if (!isRowGroup(row)) return base.toggleRow(row)
        if (base.selectMode.value !== 'multi') return
        const keys = selectableKeys(row)
        const next = new Set(opts.selected.value)
        if (checkState(row) === 'all') for (const k of keys) next.delete(k)
        else for (const k of keys) next.add(k)
        opts.selected.value = [...next]
      },
    } satisfies Partial<GridContext>)
  }

  // ── Header menu ─────────────────────────────────────────────────────────────────────────
  const isGrouped = (key: string) => by.value.some((c) => c.key === key)
  const menu = {
    can: (col: ColumnDef<T>) => !!col.groupable,
    isGrouped,
    toggle: (key: string) => {
      const current = by.value.map((c) => c.key)
      opts.setGroupBy(current.includes(key) ? current.filter((k) => k !== key) : [...current, key])
    },
    clear: () => opts.setGroupBy([]),
    any: () => active.value,
  }

  return { by, active, groups, isExpanded, toggle, setAll, expandedKeys, isGrouped, keyOf, expanded, tree, preparer, extend, menu }
}
