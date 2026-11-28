import { isReactive, isShallow, reactive, toRaw } from 'vue'
import type { RowKey } from '../types'

/**
 * Virtual layout of a tree of rows, for rendering only what is in view while keeping the grid's DOM
 * structure: expanded children stay inside their parent's `subgrid` container, and off-screen
 * siblings at every level are replaced by spacers.
 *
 * Every item at a level is a *block*: its row (fixed `rowHeight`), then — when expanded — its detail
 * row and its sub-grid (a loading / error status row, or the child level). Blocks are stacked
 * top-down; `tops` holds the prefix sums, so finding what is in view is a binary search per level.
 */
export interface LevelLayout<T = unknown> {
  /** Rows of this level, in display order (filtered and sorted). */
  rows: readonly T[]
  /** `tops[i]`: block `i`'s top, relative to the level's start. `tops[rows.length]` = level height. */
  tops: Float64Array
  /** `rowsBefore[i]`: rendered rows (data, detail, status) before block `i` within the level. */
  rowsBefore: Int32Array
  /** Measured or estimated detail row height per block (0 = no detail row). */
  detail: Float64Array
  /** Sub-grids of expanded blocks, by row key. */
  sub: Map<RowKey, SubLayout<T>>
  /** Level height in px. */
  height: number
  /** Rendered rows in the level, nested ones included. */
  rowCount: number
  /** Data and group rows, including expanded descendants but excluding details and status rows. */
  dataRowCount: number
}

export type SubLayout<T> =
  | { kind: 'status'; status: 'loading' | 'error'; height: number }
  | { kind: 'rows'; layout: LevelLayout<T> }

export interface LayoutInput<T> {
  /** Top-level rows, already filtered and sorted. */
  rows: readonly T[]
  getKey: (row: T) => RowKey
  rowHeight: number
  /** Filters and sorts a child level. */
  prepare: (rows: readonly T[]) => readonly T[]
  isExpanded: (row: T) => boolean
  /** Height of the row's detail row when expanded, or 0 for none. */
  detailHeight: (row: T, key: RowKey) => number
  /**
   * The expanded row's sub-grid container: its status (loading / error) or its children (before
   * filtering); undefined = no container.
   */
  subRows: (
    row: T,
    key: RowKey,
  ) => { status: 'loading' | 'error' } | { children: readonly T[] } | undefined
  /** Height of a sub-grid status row (measured or estimated). */
  statusHeight: (key: RowKey) => number
  /** Border + padding of a sub-grid container, above and below its rows. */
  subgridChrome: { top: number; bottom: number }
}

export function buildLayout<T>(input: LayoutInput<T>): LevelLayout<T> {
  const chrome = input.subgridChrome.top + input.subgridChrome.bottom
  const level = (rows: readonly T[]): LevelLayout<T> => {
    // Walk the raw array: reading thousands of rows through a reactive proxy tracks every index
    // and field as a dependency (seconds of work for a big tree). One iteration read keeps the
    // layout reacting to changes of the array itself.
    const reactiveRows = isReactive(rows)
    if (reactiveRows) void (rows as T[])[Symbol.iterator]()
    const raw = toRaw(rows)
    // Children are read from the reactive row, so in-place edits to them still update their cells.
    const wrap = reactiveRows && !isShallow(rows)
    const n = raw.length
    const tops = new Float64Array(n + 1)
    const rowsBefore = new Int32Array(n + 1)
    const detail = new Float64Array(n)
    const sub = new Map<RowKey, SubLayout<T>>()
    let top = 0
    let count = 0
    let dataRowCount = n
    for (let i = 0; i < n; i++) {
      const row = raw[i]!
      tops[i] = top
      rowsBefore[i] = count
      top += input.rowHeight
      count++
      if (input.isExpanded(row)) {
        const key = input.getKey(row)
        const current = wrap && row !== null && typeof row === 'object' ? (reactive(row) as T) : row
        const d = input.detailHeight(current, key)
        if (d > 0) {
          detail[i] = d
          top += d
          count++
        }
        const s = input.subRows(current, key)
        if (s && 'status' in s) {
          const height = input.statusHeight(key)
          sub.set(key, { kind: 'status', status: s.status, height })
          top += chrome + height
          count++
        } else if (s) {
          // The container renders even when filters leave none of its rows (as without virtual).
          const child = level(input.prepare(s.children))
          sub.set(key, { kind: 'rows', layout: child })
          top += chrome + child.height
          count += child.rowCount
          dataRowCount += child.dataRowCount
        }
      }
    }
    tops[n] = top
    rowsBefore[n] = count
    return { rows, tops, rowsBefore, detail, sub, height: top, rowCount: count, dataRowCount }
  }
  return level(input.rows)
}

/** Blocks `[start, end)` of a level that intersect `[top, bottom)` (px, relative to the level). */
export function visibleSpan(
  layout: Pick<LevelLayout, 'tops' | 'rows'>,
  top: number,
  bottom: number,
): { start: number; end: number } {
  const n = layout.rows.length
  if (!n || bottom <= 0 || top >= layout.tops[n]!) return { start: 0, end: 0 }
  // first block whose bottom (= next top) is below `top`
  let lo = 0
  let hi = n
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (layout.tops[mid + 1]! <= top) lo = mid + 1
    else hi = mid
  }
  const start = lo
  // first block starting at or below `bottom`
  hi = n
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (layout.tops[mid]! < bottom) lo = mid + 1
    else hi = mid
  }
  return { start, end: Math.max(start, lo) }
}

/** Where a row is: its top (px from the first row) and its position among rendered rows, or null. */
export function locateRow<T>(
  layout: LevelLayout<T>,
  key: RowKey,
  getKey: (row: T) => RowKey,
  rowHeight: number,
  chromeTop: number,
): { top: number; index: number } | null {
  const search = (
    l: LevelLayout<T>,
    offset: number,
    indexBase: number,
  ): { top: number; index: number } | null => {
    for (let i = 0; i < l.rows.length; i++) {
      const rowKey = getKey(l.rows[i]!)
      if (rowKey === key) return { top: offset + l.tops[i]!, index: indexBase + l.rowsBefore[i]! }
      const s = l.sub.get(rowKey)
      if (s?.kind === 'rows') {
        const found = search(
          s.layout,
          offset + l.tops[i]! + rowHeight + l.detail[i]! + chromeTop,
          indexBase + l.rowsBefore[i]! + 1 + (l.detail[i]! > 0 ? 1 : 0),
        )
        if (found) return found
      }
    }
    return null
  }
  return search(layout, 0, 0)
}
