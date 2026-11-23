import { computed, type Ref } from 'vue'
import { selectionState, toggleRowSelection, type SelectionSummary } from '../core/selection'
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
}

/** Row selection: single or multi, optionally cascading through sub-grids. Only visible rows count. */
export function useGridSelection<T>(opts: GridSelectionOptions<T>) {
  const selectedSet = computed(() => new Set(opts.selected.value))
  const isRowSelectable = (row: T) => opts.isRowSelectable()?.(row) ?? true

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
    const key = opts.getKey(row)
    const known = cascadeStates.value?.get(key)
    if (known) return known
    if (opts.cascade()) {
      const desc = descendantKeys(row)
      if (desc.length) return selectionState([key, ...desc], selectedSet.value)
    }
    return selectedSet.value.has(key) ? 'all' : 'none'
  }

  function toggleRow(row: T) {
    const mode = opts.mode()
    if (!mode || !isRowSelectable(row)) return
    const key = opts.getKey(row)
    if (mode === 'single') {
      opts.selected.value = selectedSet.value.has(key) ? [] : [key]
      return
    }
    const cascade = opts.cascade()
    const fullySelected = rowCheckState(row) === 'all'
    const desc = cascade ? descendantKeys(row) : []
    // A partially selected parent becomes fully selected on click.
    const base = new Set(selectedSet.value)
    if (!fullySelected) base.delete(key)
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
  const allState = computed(() => selectionState(selectableKeys.value, selectedSet.value))

  function toggleAll() {
    const next = new Set(selectedSet.value)
    if (allState.value === 'all') for (const k of selectableKeys.value) next.delete(k)
    else for (const k of selectableKeys.value) next.add(k)
    opts.selected.value = [...next]
  }

  return { isRowSelectable, rowCheckState, toggleRow, selectableKeys, allState, toggleAll }
}
