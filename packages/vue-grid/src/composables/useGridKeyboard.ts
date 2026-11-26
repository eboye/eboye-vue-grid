import type { Ref } from 'vue'

// Group header cells (column groups) aren't interactive: the arrow keys skip them.
const CELL = ':is([role="gridcell"], [role="columnheader"]):not(.vg-group-cell)'
const FOCUSABLE =
  'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'

export interface GridKeyboardOptions {
  /** Alt+ArrowLeft/Right on a header cell. */
  moveColumn: (key: string, direction: -1 | 1) => void
  /** Alt+Shift+ArrowLeft/Right on a header cell (column resizing feature). */
  resizeColumn?: (key: string, delta: number) => void
  /**
   * Column virtualization: brings a column (0-based) into view so its cells render. Cells then
   * carry `aria-colindex`, which the keys go by (and the grid `aria-colcount`).
   */
  revealColumn?: (index: number) => Promise<void>
}

/** Px per Alt+Shift+Arrow resize step. */
const RESIZE_STEP = 16

/**
 * Cell-level keyboard navigation. The scroll container is the single tab stop; arrow keys move a
 * focused cell through rows in DOM order (header, rows, sub-grid rows, detail rows).
 */
export function useGridKeyboard(root: Ref<HTMLElement | undefined>, opts: GridKeyboardOptions) {
  let lastCell: HTMLElement | null = null

  const rows = () =>
    Array.from(
      root.value?.querySelectorAll<HTMLElement>('[role="row"]:not(.vg-header-groups)') ?? [],
    )
  const cellsOf = (row: Element) =>
    Array.from(row.children).filter((c): c is HTMLElement => c.matches(CELL))

  function focusCell(cell: HTMLElement | undefined | null) {
    if (!cell) return
    // Scrolled explicitly: Firefox's focus scrolling ignores `scroll-padding`, so a row would land
    // under the sticky pinned / totals rows; `scrollIntoView` honours it in every engine.
    cell.focus({ preventScroll: true })
    cell.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    lastCell = cell
  }

  /** Columns a cell covers: a group row's label spans several (`aria-colspan`). */
  const spanOf = (cell: Element) => Number(cell.getAttribute('aria-colspan')) || 1
  /** A cell's column (0-based) when columns are virtualized (`aria-colindex`), else undefined. */
  const colOf = (cell: Element) => {
    const n = Number(cell.getAttribute('aria-colindex'))
    return n ? n - 1 : undefined
  }

  /**
   * ↑ / ↓ / PageUp / PageDown keep the column they started in, even through a cell spanning
   * several: from Placed, up onto a group row's wide label and down again lands on Placed.
   */
  let sticky: { cell: HTMLElement; col: number } | null = null

  function position(cell: HTMLElement) {
    const allRows = rows()
    const row = cell.parentElement
    const rowIndex = row ? allRows.indexOf(row) : -1
    const cells = row ? cellsOf(row) : []
    const colIndex = cells.indexOf(cell)
    let col = colOf(cell) ?? 0
    if (colOf(cell) === undefined) for (let i = 0; i < colIndex; i++) col += spanOf(cells[i]!)
    if (sticky?.cell === cell) col = sticky.col
    return { allRows, rowIndex, colIndex, col }
  }

  /** The cell covering column `col` (counting spans) in a row; a row with fewer: its last cell. */
  function cellAt(allRows: HTMLElement[], rowIndex: number, col: number) {
    const row = allRows[rowIndex]
    if (!row) return undefined
    const cells = cellsOf(row)
    // virtualized columns: the cell whose track range holds `col`, if it is rendered
    if (cells.length && cells.every((c) => colOf(c) !== undefined))
      return cells.find((c) => colOf(c)! <= col && col < colOf(c)! + spanOf(c))
    let start = 0
    let found = cells[0]
    for (const cell of cells) {
      if (start > col) break
      found = cell
      start += spanOf(cell)
    }
    return found
  }

  function onFocusIn(event: FocusEvent) {
    const target = event.target as HTMLElement
    if (target === root.value) {
      // Tabbing into the grid: resume where the user left off, else the first header cell.
      const resume = lastCell?.isConnected ? lastCell : root.value?.querySelector<HTMLElement>(CELL)
      focusCell(resume)
    } else if (target.matches(CELL)) {
      lastCell = target
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    const cell = event.target as HTMLElement
    if (!cell.matches?.(CELL)) return
    const { allRows, rowIndex, colIndex, col } = position(cell)
    if (rowIndex < 0) return
    const isHeader = cell.getAttribute('role') === 'columnheader'

    // Keyboard context menu: re-dispatch as an (untrusted) contextmenu event on the cell, which the
    // grid anchors to the cell instead of a pointer position.
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
      return
    }
    const ctrl = event.ctrlKey || event.metaKey

    if (
      isHeader &&
      event.altKey &&
      event.shiftKey &&
      opts.resizeColumn &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      const key = cell.dataset.colKey
      const rtl = getComputedStyle(cell).direction === 'rtl'
      if (key) opts.resizeColumn(key, ((event.key === 'ArrowRight') !== rtl ? 1 : -1) * RESIZE_STEP)
      event.preventDefault()
      return
    }
    if (isHeader && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const key = cell.dataset.colKey
      if (key) opts.moveColumn(key, event.key === 'ArrowLeft' ? -1 : 1)
      event.preventDefault()
      return
    }

    const expander = cell.querySelector<HTMLButtonElement>(':scope .vg-expander')
    let next: HTMLElement | undefined
    let vertical = false
    /** Virtualized columns: the column a horizontal key goes to, and the row it is in. */
    let target: { row: number; col: number } | undefined
    const count = Number(root.value?.getAttribute('aria-colcount')) || 0
    const byIndex = colOf(cell) !== undefined && !!opts.revealColumn
    switch (event.key) {
      case 'ArrowRight':
        if (expander && expander.getAttribute('aria-expanded') === 'false') {
          expander.click()
          event.preventDefault()
          return
        }
        if (byIndex) target = { row: rowIndex, col: col + spanOf(cell) }
        else next = cellsOf(allRows[rowIndex]!)[colIndex + 1]
        break
      case 'ArrowLeft':
        if (expander && expander.getAttribute('aria-expanded') === 'true') {
          expander.click()
          event.preventDefault()
          return
        }
        if (byIndex) target = { row: rowIndex, col: col - 1 }
        else next = cellsOf(allRows[rowIndex]!)[colIndex - 1]
        break
      case 'ArrowDown':
        next = cellAt(allRows, rowIndex + 1, col)
        vertical = true
        break
      case 'ArrowUp':
        next = cellAt(allRows, rowIndex - 1, col)
        vertical = true
        break
      case 'Home':
        if (byIndex) target = { row: ctrl ? 0 : rowIndex, col: 0 }
        else next = ctrl ? cellAt(allRows, 0, 0) : cellsOf(allRows[rowIndex]!)[0]
        break
      case 'End': {
        if (byIndex) {
          target = { row: ctrl ? allRows.length - 1 : rowIndex, col: count - 1 }
          break
        }
        const row = ctrl ? allRows[allRows.length - 1] : allRows[rowIndex]
        const cells = row ? cellsOf(row) : []
        next = cells[cells.length - 1]
        break
      }
      case 'PageDown':
        next = cellAt(allRows, Math.min(allRows.length - 1, rowIndex + 10), col)
        vertical = true
        break
      case 'PageUp':
        next = cellAt(allRows, Math.max(0, rowIndex - 10), col)
        vertical = true
        break
      case 'Enter': {
        const inner = cell.querySelector<HTMLElement>(isHeader ? '.vg-sort' : FOCUSABLE)
        if (inner) {
          // Shift+Enter on a header: a Shift-click (multi-column sort adds the column)
          if (isHeader)
            inner.dispatchEvent(
              new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                shiftKey: event.shiftKey,
              }),
            )
          else inner.focus()
        } else if (!isHeader) {
          cell.click()
        }
        event.preventDefault()
        return
      }
      case ' ': {
        const checkbox = cell.parentElement?.querySelector<HTMLInputElement>('.vg-checkbox input')
        if (checkbox && !isHeader) {
          // Shift+Space selects a range, like a shift-click
          checkbox.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: event.shiftKey }),
          )
          event.preventDefault()
        }
        return
      }
      default:
        return
    }
    // a navigation key: at the grid's edge it does nothing (not the browser's scrolling either)
    event.preventDefault()
    if (target) {
      if (target.col < 0 || target.col >= count) return
      const { row, col: at } = target
      next = cellAt(allRows, row, at)
      if (next) return void focusCell(next)
      // not rendered yet: scroll it into view, then focus it in the row as it is then
      const rowEl = allRows[row]
      void opts.revealColumn!(at).then(() => {
        const rows_ = rows()
        const i = rowEl ? rows_.indexOf(rowEl) : -1
        focusCell(cellAt(rows_, i < 0 ? row : i, at))
      })
      sticky = null
      return
    }
    if (next) {
      focusCell(next)
      sticky = vertical ? { cell: next, col } : null
    }
  }

  return { onFocusIn, onKeyDown, focusCell }
}
