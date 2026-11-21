import { inject, type Component, type ComputedRef, type InjectionKey, type Slots } from 'vue'
import type { Align, CellRendererDefinition, ClassValue, ColumnDef, GridPart, RowKey } from '../types'
import type { SelectionSummary } from '../core/selection'
import type { SubRowEntry } from '../composables/useSubRows'

export const SELECT_COLUMN_KEY = '__vg_select'

/** A visible column with everything the cells need precomputed. */
export interface ResolvedColumn {
  key: string
  kind: 'data' | 'select'
  def: ColumnDef
  component: Component | undefined
  definition: CellRendererDefinition | undefined
  options: Record<string, unknown>
  align: Align
  pinned: 'left' | 'right' | undefined
  /** Last left-pinned or first right-pinned column (gets the pin shadow). */
  pinEdge: boolean
  /** First data column — hosts the expander and the depth indent. */
  isTree: boolean
}

export interface GridContext {
  columns: ComputedRef<ResolvedColumn[]>
  slots: Slots
  ui: ComputedRef<Partial<Record<GridPart, ClassValue>>>
  getKey(row: any): RowKey
  sortRows(rows: readonly any[]): any[]
  // expansion
  treeMode: ComputedRef<boolean>
  hasDetail: ComputedRef<boolean>
  canExpand(row: any): boolean
  isExpanded(key: RowKey): boolean
  toggleExpanded(row: any): void
  children(row: any): any[] | undefined
  subRowState(row: any): SubRowEntry | undefined
  ensureSubRows(row: any): void
  retrySubRows(row: any): void
  // selection
  selectMode: ComputedRef<false | 'multi' | 'single'>
  isRowSelectable(row: any): boolean
  rowCheckState(row: any): SelectionSummary
  toggleRow(row: any): void
  // presentation & events
  isHighlighted(key: RowKey): boolean
  rowClass(row: any, index: number): ClassValue
  rowClickable: ComputedRef<boolean>
  virtual: ComputedRef<boolean>
  pinStyle(key: string): Record<string, string> | undefined
  onRowClick(row: any, key: RowKey, event: MouseEvent | KeyboardEvent): void
  onCellClick(row: any, key: RowKey, column: ResolvedColumn, event: MouseEvent | KeyboardEvent): void
  onCellAction(row: any, key: RowKey, column: ResolvedColumn, name: string, payload: unknown): void
}

export const GRID_CONTEXT_KEY: InjectionKey<GridContext> = Symbol('vue-grid:context')

export function useInternalGrid(): GridContext {
  const ctx = inject(GRID_CONTEXT_KEY)
  if (!ctx) throw new Error('[vue-grid] internal component used outside <VGrid>')
  return ctx
}
