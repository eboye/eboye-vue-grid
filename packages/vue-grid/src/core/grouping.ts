/* eslint-disable @typescript-eslint/no-explicit-any -- rows are type-erased here; ColumnDef<T> keeps the public API typed. */
import type { ColumnDef, RowKey, SortState } from '../types'
import { aggregateRows } from './aggregate'
import { compareValues } from './sort'
import { getCellValue } from './value'

const GROUP = Symbol.for('vue-grid:row-group')

/**
 * A group of rows (row grouping feature): the rows that share a value in a grouped column. Shown
 * as a group row with its value, its row count and its columns' aggregates; expanding it shows
 * its sub-groups (grouped by the next column) or, at the last level, its rows.
 */
export interface RowGroup<T = any> {
  readonly [GROUP]: true
  /** Unique among the grid's rows and groups (the path of group values from the top). */
  readonly key: string
  /** The grouped column. */
  readonly column: ColumnDef<T>
  /** The value its rows share (`column.groupValue`, else the cell value). */
  readonly value: unknown
  /** 0 for top-level groups. */
  readonly level: number
  /** Every row in the group, sub-groups included, in display order. */
  readonly rows: readonly T[]
  /** Sub-groups, or the rows at the last level. */
  readonly children: readonly (RowGroup<T> | T)[]
  /** Aggregates of the group's rows, by column key (columns with an `aggregate`). */
  readonly aggregates: Readonly<Record<string, unknown>>
}

/** A row of the grid is a group row, not a row of the data. */
export function isRowGroup(row: unknown): row is RowGroup {
  return typeof row === 'object' && row !== null && GROUP in row
}

/** Prefix of group keys: keeps them apart from the app's row keys. */
export const GROUP_KEY_PREFIX = '\u001fvg-group:'

/** The `children` arrays of groups: already filtered and sorted, so the grid takes them as they are. */
export const groupedLevels = new WeakSet<object>()

/** The value rows are grouped by. */
export function groupValueOf<T>(row: T, column: ColumnDef<T>): unknown {
  return column.groupValue ? column.groupValue(row) : getCellValue(row, column)
}

const isBlank = (v: unknown) =>
  v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))

/** Same group ⇔ same id: dates by time, objects by content, everything else by string. */
function groupId(value: unknown): string {
  if (isBlank(value)) return ''
  if (value instanceof Date) return `d${value.getTime()}`
  if (typeof value === 'object') {
    try {
      return `o${JSON.stringify(value)}`
    } catch {
      return `o${String(value)}`
    }
  }
  return `${typeof value === 'number' || typeof value === 'bigint' ? 'n' : 's'}${String(value)}`
}

export interface GroupRowsOptions<T> {
  /** The grouped columns, outermost first. */
  columns: readonly ColumnDef<T>[]
  /** Every column: the ones with an `aggregate` get group aggregates. */
  allColumns: readonly ColumnDef<T>[]
  /** Groups of the sorted column follow its direction; other groups are ascending. */
  sort?: SortState | null
}

/**
 * Groups rows by one or more columns. The rows keep their order inside each group (pass them
 * filtered and sorted); groups are ordered by value (blank last), descending when the grid is
 * sorted descending by that column.
 */
export function groupRows<T>(rows: readonly T[], opts: GroupRowsOptions<T>): RowGroup<T>[] {
  const aggregated = opts.allColumns.filter((c) => c.aggregate)
  const build = (items: readonly T[], level: number, parentKey: string): RowGroup<T>[] => {
    const column = opts.columns[level]!
    const buckets = new Map<string, { value: unknown; rows: T[] }>()
    for (const row of items) {
      const value = groupValueOf(row, column)
      const id = groupId(value)
      const bucket = buckets.get(id)
      if (bucket) bucket.rows.push(row)
      else buckets.set(id, { value, rows: [row] })
    }
    const dir = opts.sort?.key === column.key && opts.sort.dir === 'desc' ? -1 : 1
    const ordered = [...buckets.entries()].sort(([, a], [, b]) => {
      const blankA = isBlank(a.value)
      const blankB = isBlank(b.value)
      if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1
      return compareValues(a.value, b.value) * dir
    })
    const last = level === opts.columns.length - 1
    return ordered.map(([id, bucket]) => {
      const key = `${parentKey}${parentKey ? '\u001e' : GROUP_KEY_PREFIX}${column.key}=${id}`
      const children = last ? bucket.rows : build(bucket.rows, level + 1, key)
      groupedLevels.add(children)
      return {
        [GROUP]: true,
        key,
        column,
        value: bucket.value,
        level,
        rows: bucket.rows,
        children,
        aggregates: aggregated.length ? aggregateRows(bucket.rows, aggregated) : {},
      } as RowGroup<T>
    })
  }
  return opts.columns.length ? build(rows, 0, '') : []
}

/** Pre-order walk over groups and their sub-groups (not their rows). */
export function walkGroups<T>(
  groups: readonly (RowGroup<T> | T)[],
  visit: (group: RowGroup<T>) => void,
) {
  for (const g of groups) {
    if (!isRowGroup(g)) return // a level holds either groups or rows
    visit(g)
    walkGroups(g.children, visit)
  }
}

/** Row keys of every group in the tree. */
export function groupKeys(groups: readonly RowGroup[]): RowKey[] {
  const keys: RowKey[] = []
  walkGroups(groups, (g) => keys.push(g.key))
  return keys
}
