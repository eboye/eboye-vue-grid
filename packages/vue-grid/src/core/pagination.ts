export type PageItem = number | 'ellipsis'

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** Page buttons with a constant item count (`siblings * 2 + 5`) once pages overflow. */
export function pageItems(page: number, pageCount: number, siblings = 1): PageItem[] {
  if (pageCount <= 0) return []
  const slots = siblings * 2 + 5
  if (pageCount <= slots) return range(1, pageCount)

  const current = Math.min(Math.max(1, page), pageCount)
  const left = Math.max(current - siblings, 1)
  const right = Math.min(current + siblings, pageCount)
  const showLeft = left > 2
  const showRight = right < pageCount - 2
  const edgeCount = 3 + siblings * 2

  if (!showLeft && showRight) return [...range(1, edgeCount), 'ellipsis', pageCount]
  if (showLeft && !showRight) return [1, 'ellipsis', ...range(pageCount - edgeCount + 1, pageCount)]
  return [1, 'ellipsis', ...range(left, right), 'ellipsis', pageCount]
}
