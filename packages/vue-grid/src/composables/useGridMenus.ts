import { nextTick, shallowRef, type Ref } from 'vue'
import {
  effectivePin,
  normalizeColumnState,
  setColumnPinned,
  visibleColumns,
} from '../core/columns'
import type { AnchorTarget } from '../internal/anchor'
import { holdEvent, isHoldEvent, touchHold } from '../internal/touchHold'
import type {
  GridMessages,
  CellContext,
  ColumnDef,
  ColumnState,
  ContextActionEvent,
  HeaderActionEvent,
  HeaderMenuContext,
  MenuAction,
  MenuItem,
  SortState,
} from '../types'

export interface MenuHandle {
  openAt(target: AnchorTarget, focusAfterClose?: HTMLElement | null): Promise<void>
}

export interface GridMenusOptions<T> {
  menu: Ref<MenuHandle | undefined>
  /** The grid's built-in text. */
  messages: () => GridMessages
  columns: () => readonly ColumnDef<T>[]
  columnState: () => ColumnState
  setColumnState: (state: ColumnState) => void
  sort: Ref<SortState | null>
  /** Every sort key (multi-column sort), the first one first. */
  sorts: () => readonly SortState[]
  setSorts: (sorts: SortState[]) => void
  /** `multi-sort` is on: the menu can add a column as a further key. */
  multiSort: () => boolean
  /** Whether a column can be sorted (the sorting feature is on and the column is `sortable`). */
  sortable: (column: ColumnDef<T>) => boolean
  /** Whether the pin items show (the pinning feature is on and the column is `pinnable`). */
  pinnable: (column: ColumnDef<T>) => boolean
  /** Whether the move items show (the reorder feature is on and the column is `reorderable`). */
  reorderable: (column: ColumnDef<T>) => boolean
  /** Hides a column; only with the visibility feature (no Hide item without it). */
  hideColumn?: (key: string) => void
  /** Fit width / Reset width items; only with the resizing feature. */
  resize?: {
    can(column: ColumnDef<T>): boolean
    isResized(key: string): boolean
    fit(key: string): void
    reset(key: string): void
  }
  moveColumnBy: (key: string, direction: -1 | 1) => boolean
  contextMenu: () => ((ctx: CellContext<T>) => MenuItem[] | null | undefined) | undefined
  headerMenu: () => boolean | ((ctx: HeaderMenuContext<T>) => MenuItem[] | null | undefined)
  onContextAction: (event: ContextActionEvent<T>) => void
  onHeaderAction: (event: HeaderActionEvent<T>) => void
  /** Group by / Ungroup items; only with the row grouping feature. */
  grouping?: {
    can(column: ColumnDef<T>): boolean
    isGrouped(key: string): boolean
    toggle(key: string): void
    clear(): void
    any(): boolean
  }
  filters?: {
    isActive(key: string): boolean
    anyActive(): boolean
    open(key: string): void
    clear(key: string): void
    clearAll(): void
  }
}

const SEPARATOR: MenuItem = { separator: true }

/** Resolves after the next pointerup has been fully dispatched (or after a safety timeout). */
function pointerReleased(): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0
    const done = () => {
      window.removeEventListener('pointerup', done, true)
      window.clearTimeout(timer)
      // Let the browser finish handling pointerup (incl. light dismiss) before we open.
      window.setTimeout(resolve, 0)
    }
    window.addEventListener('pointerup', done, true)
    timer = window.setTimeout(done, 1000)
  })
}

/** Drops leading, trailing and repeated separators. */
function tidy(items: MenuItem[]): MenuItem[] {
  const out: MenuItem[] = []
  for (const item of items) {
    const isSep = 'separator' in item
    if (isSep && (!out.length || 'separator' in out[out.length - 1]!)) continue
    out.push(item)
  }
  while (out.length && 'separator' in out[out.length - 1]!) out.pop()
  return out
}

/**
 * Right-click menus for body cells (app-provided items → `context-action`) and column headers
 * (built-in sort / pin / move / hide / reset items, optionally extended → `header-action`).
 * One `VGridMenu` instance serves both.
 */
export function useGridMenus<T>(opts: GridMenusOptions<T>) {
  const items = shallowRef<MenuItem[]>([])
  const label = shallowRef('')
  let target:
    { kind: 'cell'; ctx: CellContext<T> } | { kind: 'header'; column: ColumnDef<T> } | null = null

  /**
   * Pointer right-click or touch hold → menu at the pointer; keyboard (ContextMenu key,
   * Shift+F10) → at the cell.
   */
  function anchorFor(event: MouseEvent, el: HTMLElement): AnchorTarget {
    const fromPointer =
      (event.isTrusted || isHoldEvent(event)) &&
      event.button === 2 &&
      (event.clientX !== 0 || event.clientY !== 0)
    return fromPointer ? { x: event.clientX, y: event.clientY } : el
  }

  async function show(event: MouseEvent, el: HTMLElement, next: MenuItem[], nextLabel: string) {
    event.preventDefault()
    event.stopPropagation()
    items.value = next
    label.value = nextLabel
    // On Linux (and in Playwright everywhere) `contextmenu` fires while the right button is still
    // down. Showing the popover now lets that button's `pointerup`, outside the popover, light-dismiss
    // it straight away (Firefox does). Open after the release instead.
    if (event.isTrusted && event.buttons & 2) await pointerReleased()
    await nextTick()
    await opts.menu.value?.openAt(anchorFor(event, el), el)
  }

  function openCellMenu(ctx: CellContext<T>, event: MouseEvent, el: HTMLElement) {
    const build = opts.contextMenu()
    const next = build ? tidy(build(ctx) ?? []) : []
    if (!next.length) return // keep the browser's native menu
    target = { kind: 'cell', ctx }
    void show(event, el, next, opts.messages().rowActions ?? 'Row actions')
  }

  /** Touch screens: hold, then release without moving → the menu, at the finger. */
  function holdToOpen(event: PointerEvent, el: HTMLElement, open: (event: MouseEvent) => void) {
    touchHold(event, (x, y) => {
      el.setAttribute('data-vg-held', '')
      return {
        end(e, moved) {
          el.removeAttribute('data-vg-held')
          if (e && !moved) open(holdEvent(x, y))
        },
      }
    })
  }
  /** A touch `pointerdown` on a body cell: hold for its menu (when the grid has one). */
  function holdCell(ctx: CellContext<T>, event: PointerEvent, el: HTMLElement) {
    if (event.pointerType !== 'touch' || !opts.contextMenu()) return
    holdToOpen(event, el, (e) => openCellMenu(ctx, e, el))
  }
  /** A touch `pointerdown` on a header: hold for its menu. */
  function holdHeader(column: ColumnDef<T>, event: PointerEvent, el: HTMLElement) {
    if (event.pointerType !== 'touch' || opts.headerMenu() === false) return
    holdToOpen(event, el, (e) => openHeaderMenu(column, e, el))
  }

  function builtinHeaderItems(column: ColumnDef<T>): MenuItem[] {
    const m = opts.messages()
    const state = opts.columnState()
    const out: MenuItem[] = []
    if (opts.sortable(column)) {
      const list = opts.sorts()
      const mine = list.find((s) => s.key === column.key)
      // Sorted by this column alone, in this direction.
      const only = (dir: string) => list.length === 1 && mine?.dir === dir
      out.push(
        {
          name: 'vg:sort-asc',
          label: m.sortAscending ?? 'Sort ascending',
          disabled: only('asc'),
        },
        {
          name: 'vg:sort-desc',
          label: m.sortDescending ?? 'Sort descending',
          disabled: only('desc'),
        },
      )
      if (opts.multiSort() && list.length && !(list.length === 1 && mine))
        out.push(
          {
            name: 'vg:sort-then-asc',
            label: m.thenSortAscending ?? 'Then sort ascending',
            disabled: mine?.dir === 'asc',
          },
          {
            name: 'vg:sort-then-desc',
            label: m.thenSortDescending ?? 'Then sort descending',
            disabled: mine?.dir === 'desc',
          },
        )
      out.push(
        { name: 'vg:sort-clear', label: m.clearSort ?? 'Clear sort', disabled: !mine },
        SEPARATOR,
      )
    }
    if (opts.filters && column.filterable) {
      out.push(
        { name: 'vg:filter', label: m.filterMenu ?? 'Filter…' },
        {
          name: 'vg:filter-clear',
          label: m.clearFilter ?? 'Clear filter',
          disabled: !opts.filters.isActive(column.key),
        },
      )
      if (opts.filters.anyActive())
        out.push({ name: 'vg:filter-clear-all', label: m.clearAllFilters ?? 'Clear all filters' })
      out.push(SEPARATOR)
    }
    if (opts.grouping?.can(column)) {
      const grouped = opts.grouping.isGrouped(column.key)
      out.push(
        grouped
          ? { name: 'vg:ungroup', label: m.ungroup ?? 'Ungroup' }
          : {
              name: 'vg:group',
              label: (m.groupBy ?? ((c) => `Group by ${c}`))(column.header ?? column.key),
            },
      )
      if (opts.grouping.any())
        out.push({ name: 'vg:ungroup-all', label: m.ungroupAll ?? 'Ungroup all' })
      out.push(SEPARATOR)
    }
    if (opts.pinnable(column)) {
      const pin = effectivePin(column, state)
      out.push(
        { name: 'vg:pin-left', label: m.pinLeft ?? 'Pin left', disabled: pin === 'left' },
        { name: 'vg:pin-right', label: m.pinRight ?? 'Pin right', disabled: pin === 'right' },
        { name: 'vg:unpin', label: m.unpin ?? 'Unpin', disabled: !pin },
        SEPARATOR,
      )
    }
    const visible = visibleColumns(opts.columns(), state)
    if (opts.reorderable(column)) {
      const i = visible.findIndex((c) => c.key === column.key)
      const sameGroup = (c: ColumnDef<T> | undefined) =>
        !!c && opts.reorderable(c) && effectivePin(c, state) === effectivePin(column, state)
      out.push(
        {
          name: 'vg:move-left',
          label: m.moveLeft ?? 'Move left',
          disabled: !sameGroup(visible[i - 1]),
        },
        {
          name: 'vg:move-right',
          label: m.moveRight ?? 'Move right',
          disabled: !sameGroup(visible[i + 1]),
        },
        SEPARATOR,
      )
    }
    if (opts.resize?.can(column)) {
      out.push(
        { name: 'vg:fit-width', label: m.fitWidth ?? 'Fit width' },
        {
          name: 'vg:reset-width',
          label: m.resetWidth ?? 'Reset width',
          disabled: !opts.resize.isResized(column.key),
        },
        SEPARATOR,
      )
    }
    if (opts.hideColumn && column.hideable !== false) {
      out.push({
        name: 'vg:hide',
        label: m.hideColumn ?? 'Hide column',
        disabled: visible.length <= 1,
      })
    }
    out.push({ name: 'vg:reset', label: m.resetColumns ?? 'Reset columns' })
    return tidy(out)
  }

  function openHeaderMenu(column: ColumnDef<T>, event: MouseEvent, el: HTMLElement) {
    const config = opts.headerMenu()
    if (config === false) return
    const builtin = builtinHeaderItems(column)
    const next = tidy(
      typeof config === 'function' ? (config({ column, items: builtin }) ?? []) : builtin,
    )
    if (!next.length) return
    target = { kind: 'header', column }
    void show(
      event,
      el,
      next,
      (opts.messages().columnMenu ?? ((c) => `${c} column`))(column.header ?? column.key),
    )
  }

  function runBuiltin(name: string, column: ColumnDef<T>) {
    const state = opts.columnState()
    const columns = opts.columns()
    switch (name) {
      case 'vg:sort-asc':
      case 'vg:sort-desc':
        opts.setSorts([{ key: column.key, dir: name === 'vg:sort-asc' ? 'asc' : 'desc' }])
        break
      case 'vg:sort-then-asc':
      case 'vg:sort-then-desc': {
        const dir = name === 'vg:sort-then-asc' ? 'asc' : 'desc'
        opts.setSorts([
          ...opts.sorts().filter((s) => s.key !== column.key),
          { key: column.key, dir },
        ])
        break
      }
      case 'vg:sort-clear':
        // This column's key (the others stay).
        opts.setSorts(opts.sorts().filter((s) => s.key !== column.key))
        break
      case 'vg:pin-left':
      case 'vg:pin-right':
      case 'vg:unpin': {
        const side = name === 'vg:unpin' ? null : name === 'vg:pin-left' ? 'left' : 'right'
        const next = setColumnPinned(columns, state, column.key, side)
        if (next !== state) opts.setColumnState(next)
        break
      }
      case 'vg:move-left':
        opts.moveColumnBy(column.key, -1)
        break
      case 'vg:move-right':
        opts.moveColumnBy(column.key, 1)
        break
      case 'vg:hide':
        opts.hideColumn?.(column.key)
        break
      case 'vg:fit-width':
        opts.resize?.fit(column.key)
        break
      case 'vg:reset-width':
        opts.resize?.reset(column.key)
        break
      case 'vg:filter':
        // After the menu has closed and handed focus back, so the popover keeps it.
        window.setTimeout(() => opts.filters?.open(column.key), 0)
        break
      case 'vg:filter-clear':
        opts.filters?.clear(column.key)
        break
      case 'vg:filter-clear-all':
        opts.filters?.clearAll()
        break
      case 'vg:group':
      case 'vg:ungroup':
        opts.grouping?.toggle(column.key)
        break
      case 'vg:ungroup-all':
        opts.grouping?.clear()
        break
      case 'vg:reset':
        opts.setColumnState(normalizeColumnState(columns, null))
        break
    }
  }

  function onSelect(item: MenuAction) {
    const current = target
    target = null
    if (!current) return
    if (current.kind === 'cell') {
      opts.onContextAction({ ...current.ctx, name: item.name, item })
    } else if (item.name.startsWith('vg:')) {
      runBuiltin(item.name, current.column)
    } else {
      opts.onHeaderAction({ name: item.name, item, column: current.column })
    }
  }

  /** Opens a header's menu at a viewport point (a header held on a touch screen). */
  function openHeaderMenuAt(column: ColumnDef<T>, x: number, y: number, el: HTMLElement) {
    openHeaderMenu(column, holdEvent(x, y), el)
  }

  return {
    items,
    label,
    openCellMenu,
    openHeaderMenu,
    openHeaderMenuAt,
    holdCell,
    holdHeader,
    onSelect,
  }
}
