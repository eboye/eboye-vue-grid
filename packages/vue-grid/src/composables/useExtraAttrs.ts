import type { ObjectDirective } from 'vue'
import type { ResolvedColumn } from '../internal/context'
import type { CellAttrsContext, ExtraAttrs, RowAttrsContext, RowKey } from '../types'

/**
 * Attributes the grid keeps for itself: its roles, ARIA, focus order, classes, styles and its own
 * `data-*` hooks. Inline event handlers (`on…`) are never set either.
 */
const OWN =
  /^(?:role|tabindex|class|style|id|aria-.*|on.*|data-(?:row-key|col-key|pinned-key|depth|group-level|detail-for|subgrid-for|vg-.*))$/i
/** A name `setAttribute` takes. */
const NAME = /^[a-z_][\w.:-]*$/i

const applied = new WeakMap<Element, Set<string>>()

/** Sets this render's extra attributes and removes the ones a previous render set that are gone. */
function apply(el: Element, attrs: ExtraAttrs | null | undefined) {
  const before = applied.get(el)
  const now = new Set<string>()
  if (attrs)
    for (const name in attrs) {
      const value = attrs[name]
      if (value == null || !NAME.test(name) || OWN.test(name)) continue
      now.add(name)
      const text = String(value)
      if (el.getAttribute(name) !== text) el.setAttribute(name, text)
    }
  if (before) for (const name of before) if (!now.has(name)) el.removeAttribute(name)
  applied.set(el, now)
}

/**
 * Applies `rowAttrs` / `cellAttrs` straight to the element, so rows and cells keep Vue's
 * optimised updates (a bound attribute object would make every row and cell diff all of theirs).
 */
export const vExtraAttrs: ObjectDirective<Element, ExtraAttrs | null | undefined> = {
  mounted: (el, { value }) => apply(el, value),
  updated: (el, { value }) => apply(el, value),
}

/** The grid's props (read on each call, so they stay reactive). */
export interface ExtraAttrsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the grid's generic `T` is erased here
  rowAttrs?: (ctx: RowAttrsContext<any>) => ExtraAttrs | null | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellAttrs?: (ctx: CellAttrsContext<any>) => ExtraAttrs | null | undefined
}

/**
 * The attributes feature's part of the grid: what rows and cells call while rendering (so the
 * functions' own reactive reads re-render them). Everything is built here, keeping the grid's
 * components to one call each.
 */
export function useExtraAttrs(
  props: ExtraAttrsProps,
  /** The shown columns, the selection checkbox included: a cell's `columnIndex`. */
  columns: { readonly value: readonly ResolvedColumn[] },
) {
  const row = (ctx: RowAttrsContext) => props.rowAttrs?.(ctx)
  return {
    directive: vExtraAttrs,
    /** A body row (group rows get none). */
    row: (item: { row: unknown; key: RowKey; index: number; group?: unknown }, depth: number) =>
      item.group
        ? undefined
        : row({ row: item.row, rowKey: item.key, rowIndex: item.index, depth }),
    /** A pinned row (the totals row gets none). */
    pinnedRow: (
      item: { kind: string; row: unknown; key?: RowKey },
      rowIndex: number,
      pinned: 'top' | 'bottom',
    ) =>
      item.kind === 'total'
        ? undefined
        : row({ row: item.row, rowKey: item.key!, rowIndex, depth: 0, pinned }),
    cell: (p: {
      row: unknown
      rowKey: RowKey
      rowIndex: number
      depth: number
      column: ResolvedColumn
      pinnedSide?: 'top' | 'bottom'
    }) =>
      props.cellAttrs?.({
        row: p.row,
        rowKey: p.rowKey,
        rowIndex: p.rowIndex,
        depth: p.depth,
        pinned: p.pinnedSide,
        column: p.column.def,
        columnKey: p.column.key,
        columnIndex: columns.value.indexOf(p.column),
        kind: p.column.kind,
        columnPinned: p.column.pinned,
      }),
  }
}

export type ExtraAttrsState = ReturnType<typeof useExtraAttrs>
