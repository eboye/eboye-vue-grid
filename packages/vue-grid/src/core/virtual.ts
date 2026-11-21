export interface VirtualWindowInput {
  scrollTop: number
  viewportHeight: number
  rowHeight: number
  rowCount: number
  overscan: number
}

export interface VirtualWindow {
  /** First rendered row index (inclusive). */
  start: number
  /** Last rendered row index (exclusive). */
  end: number
  padTop: number
  padBottom: number
}

export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindow {
  const { scrollTop, viewportHeight, rowHeight, rowCount, overscan } = input
  if (rowCount <= 0 || rowHeight <= 0) return { start: 0, end: 0, padTop: 0, padBottom: 0 }
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight))
  const maxFirst = Math.max(0, rowCount - visibleCount)
  const first = Math.min(Math.max(0, Math.floor(scrollTop / rowHeight)), maxFirst)
  const start = Math.max(0, first - overscan)
  const end = Math.min(rowCount, first + visibleCount + overscan)
  return { start, end, padTop: start * rowHeight, padBottom: (rowCount - end) * rowHeight }
}
