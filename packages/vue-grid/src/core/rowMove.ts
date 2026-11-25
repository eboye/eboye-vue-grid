import type { RowMoveEvent } from '../types'

/**
 * The rows with a `row-move` applied: `event.row` taken out and put back just before or after
 * `event.target`. Returns a new array (the rows themselves are kept); the same array when either row
 * isn't in it. For a nested row, pass its parent's children.
 *
 * ```ts
 * function onRowMove(e: RowMoveEvent<Task>) {
 *   tasks.value = moveRow(tasks.value, e)
 * }
 * ```
 */
export function moveRow<T>(
  rows: readonly T[],
  event: Pick<RowMoveEvent<T>, 'row' | 'target' | 'position'>,
): T[] {
  const from = rows.indexOf(event.row)
  if (from < 0 || !rows.includes(event.target) || event.row === event.target) return rows as T[]
  const next = rows.slice()
  next.splice(from, 1)
  const at = next.indexOf(event.target) + (event.position === 'after' ? 1 : 0)
  next.splice(at, 0, event.row)
  return next
}
