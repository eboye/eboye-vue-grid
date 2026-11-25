import { trackSize } from './columns'

/** Track sizes that follow the cells' content, which a column left out of the DOM doesn't have. */
const CONTENT = /\b(?:auto|min-content|max-content|fit-content)\b/i
/** A bare flexible track (`1fr`): its minimum is `auto`, so content-sized too. */
const BARE_FR = /^\s*\d*\.?\d+fr\s*$/i

/**
 * A column's grid track with column virtualization: the same as without it, unless its size
 * depends on its cells' content (`auto`, `min-content`, bare `1fr`), which aren't all rendered.
 * Those get `fallback` (a bare `fr` gets it as its minimum, so it still stretches).
 */
export function virtualTrack(def: { width?: string; minWidth?: string }, fallback: string): string {
  const size = trackSize(def).trim()
  if (BARE_FR.test(size)) return `minmax(${def.minWidth ?? fallback}, ${size})`
  if (!CONTENT.test(size)) return size
  return def.minWidth ? `max(${def.minWidth}, ${fallback})` : fallback
}

/** The used track sizes from `getComputedStyle(grid).gridTemplateColumns`; null if not all in px. */
export function parseTracks(value: string): number[] | null {
  const parts = value.trim().split(/\s+/)
  const out: number[] = []
  for (const part of parts) {
    const m = /^(-?\d*\.?\d+(?:e[+-]?\d+)?)px$/i.exec(part)
    if (!m) return null
    out.push(Number(m[1]))
  }
  return out.length ? out : null
}

/**
 * The columns in view, by index: those overlapping `[start, start + viewport)` (px from the
 * grid's start edge), plus `overscan` more on each side.
 */
export function columnSpan(
  sizes: readonly number[],
  start: number,
  viewport: number,
  overscan: number,
): { first: number; last: number } {
  const end = start + viewport
  let first = -1
  let last = -1
  let at = 0
  for (let i = 0; i < sizes.length; i++) {
    const next = at + sizes[i]!
    if (first < 0 && next > start) first = i
    if (at < end) last = i
    at = next
  }
  if (first < 0) first = Math.max(0, sizes.length - 1)
  if (last < first) last = first
  return {
    first: Math.max(0, first - overscan),
    last: Math.min(sizes.length - 1, last + overscan),
  }
}
