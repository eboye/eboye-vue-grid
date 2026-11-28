import type { DataAttrs } from '../types'

// Internal data hooks control placement, row identity and other built-in behavior.
const reserved =
  /^data-(?:vg-.*|col-key|row-key|pinned-key|depth|group-level|detail-for|subgrid-for|placement|sort-dir)$/i

export function dataAttrs(attrs: DataAttrs | null | undefined): DataAttrs | undefined {
  if (!attrs) return undefined
  const result: DataAttrs = {}
  for (const [name, value] of Object.entries(attrs)) {
    if (/^data-[\w.:-]+$/.test(name) && !reserved.test(name))
      result[name as `data-${string}`] = value
  }
  return result
}
