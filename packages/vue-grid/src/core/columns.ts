import type { ColumnDef, ColumnState } from '../types'

type PinGroup = 'left' | 'none' | 'right'
const pinGroup = (col: Pick<ColumnDef, 'pinned'> | undefined): PinGroup => col?.pinned ?? 'none'

/**
 * Reconciles (possibly stale or persisted) column state with the current column definitions:
 * unknown keys are dropped, new columns are appended in definition order, and columns with no
 * stored visibility take their `hidden` default.
 */
export function normalizeColumnState(
  columns: readonly ColumnDef[],
  state?: Partial<ColumnState> | null,
): ColumnState {
  const known = new Set(columns.map((c) => c.key))
  const storedOrder = Array.isArray(state?.order) ? state.order : []
  const order = storedOrder.filter((k, i) => known.has(k) && storedOrder.indexOf(k) === i)
  const seen = new Set(order)
  for (const col of columns) if (!seen.has(col.key)) order.push(col.key)

  if (Array.isArray(state?.hidden)) {
    return { order, hidden: state.hidden.filter((k) => known.has(k)) }
  }
  return { order, hidden: columns.filter((c) => c.hidden).map((c) => c.key) }
}

/** Visible columns in display order: left-pinned, unpinned, right-pinned (each group keeps user order). */
export function visibleColumns<T>(columns: readonly ColumnDef<T>[], state: ColumnState): ColumnDef<T>[] {
  const byKey = new Map(columns.map((c) => [c.key, c]))
  const hidden = new Set(state.hidden)
  const ordered = state.order
    .map((k) => byKey.get(k))
    .filter((c): c is ColumnDef<T> => !!c && !hidden.has(c.key))
  const rank: Record<PinGroup, number> = { left: 0, none: 1, right: 2 }
  return ordered
    .map((col, i) => ({ col, i }))
    .sort((a, b) => rank[pinGroup(a.col)] - rank[pinGroup(b.col)] || a.i - b.i)
    .map((x) => x.col)
}

/**
 * Moves column `from` to the position of column `to`. Returns the same state object when the
 * move is not allowed (different pin groups, or either column not reorderable).
 */
export function moveColumn(
  columns: readonly ColumnDef[],
  state: ColumnState,
  from: string,
  to: string,
): ColumnState {
  if (from === to) return state
  const fromCol = columns.find((c) => c.key === from)
  const toCol = columns.find((c) => c.key === to)
  if (!fromCol || !toCol) return state
  if (fromCol.reorderable === false || toCol.reorderable === false) return state
  if (pinGroup(fromCol) !== pinGroup(toCol)) return state

  const order = [...state.order]
  const fromIndex = order.indexOf(from)
  const toIndex = order.indexOf(to)
  if (fromIndex < 0 || toIndex < 0) return state
  order.splice(fromIndex, 1)
  order.splice(toIndex, 0, from)
  return { ...state, order }
}

export function setColumnHidden(state: ColumnState, key: string, hidden: boolean): ColumnState {
  const set = new Set(state.hidden)
  if (hidden) set.add(key)
  else set.delete(key)
  return { ...state, hidden: state.order.filter((k) => set.has(k)) }
}

export function trackSize(col: { width?: string; minWidth?: string }): string {
  const width = col.width ?? 'auto'
  return col.minWidth ? `minmax(${col.minWidth}, ${width})` : width
}

export function gridTemplate(cols: readonly { width?: string; minWidth?: string }[]): string {
  return cols.map(trackSize).join(' ')
}
