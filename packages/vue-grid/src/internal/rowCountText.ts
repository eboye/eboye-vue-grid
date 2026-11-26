import type { GridMessages } from '../types'

/**
 * "20 rows", or "3 of 22 rows" when a filter hides some: the status bar's row count, also read
 * out after filtering. `n` formats a number in the grid's locale.
 */
export function rowCountText(
  m: GridMessages,
  n: (v: number) => string,
  count: number,
  total: number | undefined,
): string {
  const filtered = total !== undefined && total !== count
  if (m.rowCount)
    return m.rowCount(
      n(count),
      filtered ? n(total) : undefined,
      count,
      filtered ? total : undefined,
    )
  const rows = (v: number) => `${n(v)} ${v === 1 ? 'row' : 'rows'}`
  return filtered ? `${n(count)} of ${rows(total)}` : rows(count)
}
