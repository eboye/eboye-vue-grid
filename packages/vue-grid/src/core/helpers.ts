import type { ColumnDef, ColumnHelper } from '../types'

/** See {@link ColumnHelper}. Runtime identity; exists for type inference only. */
export function createColumnHelper<T>(): ColumnHelper<T> {
  return (def) => def as ColumnDef<T>
}
