import type { ColumnDef, ColumnState, PinSide } from '../types'

type PinGroup = PinSide | 'none'

/** The column's pin side after applying runtime overrides from column state. */
export function effectivePin(col: Pick<ColumnDef, 'key' | 'pinned'>, state?: Pick<ColumnState, 'pinned'>): PinSide | undefined {
  const override = state?.pinned?.[col.key]
  if (override !== undefined) return override ?? undefined
  return col.pinned
}

const pinGroup = (col: Pick<ColumnDef, 'key' | 'pinned'> | undefined, state?: ColumnState): PinGroup =>
  (col && effectivePin(col, state)) ?? 'none'

/** A plausible grid track (`240px`, `12rem`, `minmax(…)`) — not junk from storage that breaks the template. */
const isTrack = (v: unknown): v is string => typeof v === 'string' && v.length <= 64 && /^[\w\s.,%()+\-*/]+$/.test(v)

const isPinValue =(v: unknown): v is PinSide | null => v === 'left' || v === 'right' || v === null

/**
 * Reconciles (possibly stale or persisted) column state with the current column definitions:
 * unknown keys are dropped, new columns are appended in definition order, columns with no stored
 * visibility take their `hidden` default, and invalid pin overrides are discarded.
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

  // Stored visibility covers the columns the state knew about (its `order`); columns added since
  // then still take their own `hidden` default.
  const storedKnown = new Set(storedOrder)
  const hidden = Array.isArray(state?.hidden)
    ? [
        ...new Set([
          ...state.hidden.filter((k) => known.has(k)),
          ...(Array.isArray(state?.order) ? columns.filter((c) => c.hidden && !storedKnown.has(c.key)).map((c) => c.key) : []),
        ]),
      ]
    : columns.filter((c) => c.hidden).map((c) => c.key)

  const pinned: Record<string, PinSide | null> = {}
  if (state?.pinned && typeof state.pinned === 'object') {
    for (const [k, v] of Object.entries(state.pinned)) {
      if (known.has(k) && isPinValue(v)) pinned[k] = v
    }
  }
  const out: ColumnState = { order, hidden, pinned }
  if (state?.widths && typeof state.widths === 'object') {
    const widths: Record<string, string> = {}
    for (const [k, v] of Object.entries(state.widths)) {
      if (known.has(k) && isTrack(v)) widths[k] = v
    }
    if (Object.keys(widths).length) out.widths = widths
  }
  return out
}

/** Sets (or, with `null`, clears) a resized column width. */
export function setColumnWidth(state: ColumnState, key: string, width: string | null): ColumnState {
  const widths = { ...state.widths }
  if (width) widths[key] = width
  else delete widths[key]
  const next: ColumnState = { ...state, widths }
  if (!Object.keys(widths).length) delete next.widths
  return next
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
    .sort((a, b) => rank[pinGroup(a.col, state)] - rank[pinGroup(b.col, state)] || a.i - b.i)
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
  if (pinGroup(fromCol, state) !== pinGroup(toCol, state)) return state

  const order = [...state.order]
  const fromIndex = order.indexOf(from)
  const toIndex = order.indexOf(to)
  if (fromIndex < 0 || toIndex < 0) return state
  order.splice(fromIndex, 1)
  order.splice(toIndex, 0, from)
  return { ...state, order }
}

/** Drag & drop variant: puts `from` immediately before or after `to`. Same rules as `moveColumn`. */
export function moveColumnRelative(
  columns: readonly ColumnDef[],
  state: ColumnState,
  from: string,
  to: string,
  side: 'before' | 'after',
): ColumnState {
  if (moveColumn(columns, state, from, to) === state) return state
  const order = state.order.filter((k) => k !== from)
  const toIndex = order.indexOf(to)
  order.splice(side === 'after' ? toIndex + 1 : toIndex, 0, from)
  return order.every((k, i) => k === state.order[i]) ? state : { ...state, order }
}

export function setColumnHidden(state: ColumnState, key: string, hidden: boolean): ColumnState {
  const set = new Set(state.hidden)
  if (hidden) set.add(key)
  else set.delete(key)
  return { ...state, hidden: state.order.filter((k) => set.has(k)) }
}

/**
 * Pins (`'left' | 'right'`) or unpins (`null`) a column at runtime. A newly pinned column lands at
 * the inner edge of its pin group (next to the unpinned area). Returns the same state when the
 * column is unknown, has `pinnable: false`, or is already pinned that way.
 */
export function setColumnPinned(
  columns: readonly ColumnDef[],
  state: ColumnState,
  key: string,
  side: PinSide | null,
): ColumnState {
  const col = columns.find((c) => c.key === key)
  if (!col || col.pinnable === false) return state
  if ((effectivePin(col, state) ?? null) === side) return state

  const pinned = { ...state.pinned }
  if ((col.pinned ?? null) === side) delete pinned[key]
  else pinned[key] = side

  const next: ColumnState = { ...state, pinned }
  if (!side) return next

  const order = state.order.filter((k) => k !== key)
  const pinOf = (k: string) => {
    const c = columns.find((x) => x.key === k)
    return c ? effectivePin(c, next) : undefined
  }
  if (side === 'left') {
    let last = -1
    order.forEach((k, i) => {
      if (pinOf(k) === 'left') last = i
    })
    order.splice(last + 1, 0, key)
  } else {
    const first = order.findIndex((k) => pinOf(k) === 'right')
    order.splice(first < 0 ? order.length : first, 0, key)
  }
  return { ...next, order }
}

export function trackSize(col: { width?: string; minWidth?: string }): string {
  const width = col.width ?? 'auto'
  return col.minWidth ? `minmax(${col.minWidth}, ${width})` : width
}

export function gridTemplate(cols: readonly { width?: string; minWidth?: string }[]): string {
  return cols.map(trackSize).join(' ')
}
