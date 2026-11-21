import type { Ref } from 'vue'

const CELL = '[role="gridcell"], [role="columnheader"]'
const FOCUSABLE = 'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'

export interface GridKeyboardOptions {
  /** Alt+ArrowLeft/Right on a header cell. */
  moveColumn: (key: string, direction: -1 | 1) => void
}

/**
 * Cell-level keyboard navigation. The scroll container is the single tab stop; arrow keys move a
 * focused cell through rows in DOM order (header, rows, sub-grid rows, detail rows).
 */
export function useGridKeyboard(root: Ref<HTMLElement | undefined>, opts: GridKeyboardOptions) {
  let lastCell: HTMLElement | null = null

  const rows = () => Array.from(root.value?.querySelectorAll<HTMLElement>('[role="row"]') ?? [])
  const cellsOf = (row: Element) =>
    Array.from(row.children).filter((c): c is HTMLElement => c.matches(CELL))

  function focusCell(cell: HTMLElement | undefined | null) {
    if (!cell) return
    cell.focus({ preventScroll: false })
    lastCell = cell
  }

  function position(cell: HTMLElement) {
    const allRows = rows()
    const row = cell.parentElement
    const rowIndex = row ? allRows.indexOf(row) : -1
    const colIndex = row ? cellsOf(row).indexOf(cell) : -1
    return { allRows, rowIndex, colIndex }
  }

  function cellAt(allRows: HTMLElement[], rowIndex: number, colIndex: number) {
    const row = allRows[rowIndex]
    if (!row) return undefined
    const cells = cellsOf(row)
    return cells[Math.min(colIndex, cells.length - 1)]
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
    const { allRows, rowIndex, colIndex } = position(cell)
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

    if (isHeader && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const key = cell.dataset.colKey
      if (key) opts.moveColumn(key, event.key === 'ArrowLeft' ? -1 : 1)
      event.preventDefault()
      return
    }

    const expander = cell.querySelector<HTMLButtonElement>(':scope .vg-expander')
    let next: HTMLElement | undefined
    switch (event.key) {
      case 'ArrowRight':
        if (expander && expander.getAttribute('aria-expanded') === 'false') {
          expander.click()
          event.preventDefault()
          return
        }
        next = cellsOf(allRows[rowIndex]!)[colIndex + 1]
        break
      case 'ArrowLeft':
        if (expander && expander.getAttribute('aria-expanded') === 'true') {
          expander.click()
          event.preventDefault()
          return
        }
        next = cellsOf(allRows[rowIndex]!)[colIndex - 1]
        break
      case 'ArrowDown':
        next = cellAt(allRows, rowIndex + 1, colIndex)
        break
      case 'ArrowUp':
        next = cellAt(allRows, rowIndex - 1, colIndex)
        break
      case 'Home':
        next = ctrl ? cellAt(allRows, 0, 0) : cellsOf(allRows[rowIndex]!)[0]
        break
      case 'End': {
        const row = ctrl ? allRows[allRows.length - 1] : allRows[rowIndex]
        const cells = row ? cellsOf(row) : []
        next = cells[cells.length - 1]
        break
      }
      case 'PageDown':
        next = cellAt(allRows, Math.min(allRows.length - 1, rowIndex + 10), colIndex)
        break
      case 'PageUp':
        next = cellAt(allRows, Math.max(0, rowIndex - 10), colIndex)
        break
      case 'Enter': {
        const inner = cell.querySelector<HTMLElement>(isHeader ? '.vg-sort' : FOCUSABLE)
        if (inner) {
          if (isHeader) inner.click()
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
          checkbox.click()
          event.preventDefault()
        }
        return
      }
      default:
        return
    }
    if (next) {
      event.preventDefault()
      focusCell(next)
    }
  }

  return { onFocusIn, onKeyDown, focusCell }
}
