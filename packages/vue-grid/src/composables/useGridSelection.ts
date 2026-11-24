import { computed, watch, type Ref } from 'vue'
import { selectionState, toggleRowSelection, type SelectionSummary } from '../core/selection'
import type { GridContext } from '../internal/context'
import type { RowKey } from '../types'

export interface GridSelectionOptions<T> {
  selected: Ref<RowKey[]>
  mode: () => false | 'multi' | 'single'
  /** Selecting a parent selects its descendants (multi mode with sub-grids). */
  cascade: () => boolean
  isRowSelectable: () => ((row: T) => boolean) | undefined
  getKey: (row: T) => RowKey
  /** All rows of the grid (top level). */
  rows: () => readonly T[]
  children: (row: T) => readonly T[] | undefined
  /** Known children that pass the filters. */
  visibleChildren: (row: T) => readonly T[]
  /** Pre-order walk over the visible rows and their known children. */
  walk: (rows: readonly T[], visit: (row: T) => void) => void
  /** The body's top level (this page), and the grid's context: the rows on screen, for shift ranges. */
  view: () => { rows: readonly T[]; ctx: GridContext }
  /** The `prune-selection` prop: drop selected keys whose rows are gone from the data. */
  prune: () => boolean
  /** `v-model:select-all-matching`: every row matching the query counts as selected (server data). */
  allMatching: Ref<boolean>
  /** Server data: how many rows match the query (the pager's total); undefined with client rows. */
  matchingTotal: () => number | undefined
  /** Changes when the set of matching rows does (filters, search): "all matching" ends. */
  matchKey: () => string
}

/**
 * Row selection: single or multi, optionally cascading through sub-grids, shift-click ranges,
 * pruning keys whose rows are gone, and (server data) "all matching rows". Only visible rows count.
 */
export function useGridSelection<T>(opts: GridSelectionOptions<T>) {
  const selectedSet = computed(() => new Set(opts.selected.value))
  const isRowSelectable = (row: T) => opts.isRowSelectable()?.(row) ?? true
  /** The last row toggled: a shift-click selects from it to the clicked row. */
  let anchor: RowKey | null = null

  /** The rows on screen, in display order: expanded children and open groups' rows included. */
  function displayed(): T[] {
    const { rows, ctx } = opts.view()
    const out: T[] = []
    const visit = (level: readonly T[]) => {
      for (const row of level) {
        const group = ctx.grouping?.isGroup(row)
        if (!group) out.push(row)
        if (!ctx.isExpanded(ctx.getKey(row))) continue
        const kids = ctx.children(row)
        // a group's rows are prepared already; children are filtered and sorted like on screen
        if (kids?.length) visit(group ? kids : ctx.sortRows(kids))
      }
    }
    visit(rows)
    return out
  }

  function descendantKeys(row: T): RowKey[] {
    const keys: RowKey[] = []
    opts.walk(opts.children(row) ?? [], (r) => {
      if (isRowSelectable(r)) keys.push(opts.getKey(r))
    })
    return keys
  }

  /**
   * Cascade mode: every row's check state in one bottom-up pass over the tree, instead of walking
   * each row's subtree for each checkbox on every render.
   */
  const cascadeStates = computed(() => {
    if (!opts.mode() || !opts.cascade()) return null
    const sel = selectedSet.value
    const states = new Map<RowKey, SelectionSummary>()
    /** [selected, total] selectable descendants of `row`. */
    const visit = (row: T): [number, number] => {
      let picked = 0
      let total = 0
      for (const kid of opts.visibleChildren(row)) {
        const [kidPicked, kidTotal] = visit(kid)
        picked += kidPicked
        total += kidTotal
        if (isRowSelectable(kid)) {
          total++
          if (sel.has(opts.getKey(kid))) picked++
        }
      }
      const key = opts.getKey(row)
      if (!total) states.set(key, sel.has(key) ? 'all' : 'none')
      else {
        const count = picked + (sel.has(key) ? 1 : 0)
        states.set(key, count === 0 ? 'none' : count === total + 1 ? 'all' : 'some')
      }
      return [picked, total]
    }
    for (const row of opts.rows()) visit(row)
    return states
  })

  function rowCheckState(row: T): SelectionSummary {
    if (opts.allMatching.value && isRowSelectable(row)) return 'all'
    const key = opts.getKey(row)
    const known = cascadeStates.value?.get(key)
    if (known) return known
    if (opts.cascade()) {
      const desc = descendantKeys(row)
      if (desc.length) return selectionState([key, ...desc], selectedSet.value)
    }
    return selectedSet.value.has(key) ? 'all' : 'none'
  }

  /**
   * Toggles a row (and, cascading, its descendants). `range`: a shift-click — every row on screen
   * from the last toggled one to this one takes this row's new state. Writes `selected` once: with
   * a parent's `v-model`, a second write in the same tick would start from the old value.
   */
  function toggleRow(row: T, range = false) {
    const mode = opts.mode()
    if (!mode || !isRowSelectable(row)) return
    const key = opts.getKey(row)
    if (mode === 'single') {
      opts.selected.value = selectedSet.value.has(key) ? [] : [key]
      return
    }
    let current: ReadonlySet<RowKey> = selectedSet.value
    let select: boolean
    if (opts.allMatching.value) {
      // leaving "all matching" for an explicit selection: the loaded rows, minus this one
      opts.allMatching.value = false
      current = new Set([...current, ...selectableKeys.value])
      select = false
    } else select = rowCheckState(row) !== 'all'
    const cascade = opts.cascade()
    if (range && anchor !== null && anchor !== key) {
      const shown = displayed()
      const keys = shown.map(opts.getKey)
      const from = keys.indexOf(anchor)
      const to = keys.indexOf(key)
      if (from >= 0 && to >= 0) {
        const next = new Set(current)
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
          const r = shown[i]!
          if (!isRowSelectable(r)) continue
          for (const k of [keys[i]!, ...(cascade ? descendantKeys(r) : [])]) {
            if (select) next.add(k)
            else next.delete(k)
          }
        }
        opts.selected.value = [...next]
        anchor = key
        return
      }
    }
    anchor = key
    const desc = cascade ? descendantKeys(row) : []
    // A partially selected parent becomes fully selected on click.
    const base = new Set(current)
    if (select) base.delete(key)
    else base.add(key)
    opts.selected.value = [...toggleRowSelection(base, key, desc, cascade)]
  }

  const selectableKeys = computed(() => {
    if (!opts.mode()) return []
    const keys: RowKey[] = []
    opts.walk(opts.rows(), (row) => {
      if (isRowSelectable(row)) keys.push(opts.getKey(row))
    })
    return keys
  })
  const allState = computed<SelectionSummary>(() =>
    opts.allMatching.value ? 'all' : selectionState(selectableKeys.value, selectedSet.value),
  )

  function toggleAll() {
    const next = new Set(selectedSet.value)
    if (allState.value === 'all') {
      opts.allMatching.value = false
      for (const k of selectableKeys.value) next.delete(k)
    } else for (const k of selectableKeys.value) next.add(k)
    opts.selected.value = [...next]
  }

  function clear() {
    opts.allMatching.value = false
    if (opts.selected.value.length) opts.selected.value = []
  }

  // ── Server data: "all matching rows" ─────────────────────────────────────────────────────
  /** The rows matching the query, when more of them exist than are loaded (else null). */
  const moreMatching = computed(() => {
    const total = opts.matchingTotal()
    return opts.mode() === 'multi' && total !== undefined && total > selectableKeys.value.length
      ? total
      : null
  })
  /** Offer "select all N" (every loaded row is selected), or show that all N are. */
  const banner = computed<{ total: number; page: number; all: boolean } | null>(() => {
    const total = moreMatching.value
    if (total === null || allState.value !== 'all' || !selectableKeys.value.length) return null
    return { total, page: selectableKeys.value.length, all: opts.allMatching.value }
  })
  /** Selected rows: every matching row with "all matching", else the selected keys. */
  const count = computed(() =>
    opts.allMatching.value
      ? (opts.matchingTotal() ?? opts.selected.value.length)
      : opts.selected.value.length,
  )
  watch(opts.matchKey, () => (opts.allMatching.value = false))

  // ── Pruning ─────────────────────────────────────────────────────────────────────────────
  /** Keys of every known row (filters ignored), only while pruning. */
  const knownKeys = computed(() => {
    if (!opts.prune()) return null
    const keys = new Set<RowKey>()
    const visit = (rows: readonly T[]) => {
      for (const row of rows) {
        keys.add(opts.getKey(row))
        const kids = opts.children(row)
        if (kids) visit(kids)
      }
    }
    visit(opts.rows())
    return keys
  })
  watch(knownKeys, (keys) => {
    if (!keys) return
    const next = opts.selected.value.filter((k) => keys.has(k))
    if (next.length !== opts.selected.value.length) opts.selected.value = next
  })

  return {
    isRowSelectable,
    rowCheckState,
    toggleRow,
    selectableKeys,
    allState,
    toggleAll,
    clear,
    banner,
    count,
  }
}
