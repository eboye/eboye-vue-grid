/**
 * Pasting into the grid (range selection + editing): clipboard text as a block of cells, and a
 * cell's text as the value its column holds. Pure functions, no DOM.
 */
import { fromWallTime, localDay, localDayKey, parseIsoDay, utcDay, wallFormatter } from './date'

/**
 * Tab-separated text as rows of cells, the way spreadsheets put cells on the clipboard: tabs
 * between cells, line breaks between rows, and a cell in double quotes may hold tabs, line breaks
 * and `""` for a quote. The trailing line break spreadsheets add is dropped.
 */
export function parseClipboard(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let i = 0
  const s = text.replace(/\r\n?/g, '\n')
  while (i < s.length) {
    const ch = s[i]!
    if (ch === '"' && cell === '') {
      // a quoted cell: up to the closing quote (`""` is a quote)
      let j = i + 1
      let quoted = ''
      let closed = false
      while (j < s.length) {
        if (s[j] === '"') {
          if (s[j + 1] === '"') {
            quoted += '"'
            j += 2
            continue
          }
          closed = true
          j++
          break
        }
        quoted += s[j]
        j++
      }
      // only a real quoted cell if the cell ends right after it; else the quote is text
      if (closed && (j === s.length || s[j] === '\t' || s[j] === '\n')) {
        if (j === s.length) {
          row.push(quoted)
          rows.push(row)
          return rows
        }
        cell = quoted
        i = j
        continue
      }
    }
    if (ch === '\t') {
      row.push(cell)
      cell = ''
    } else if (ch === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
    i++
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

/** The kind of value a column's cells hold, as its editor sees it. */
export type PasteKind = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'checkbox'

export interface PasteContext {
  /** The format locale (for `1.234,5` vs `1,234.5`, and the order of day, month and year). */
  locale: string
  /** Offset-free datetimes are read in the renderer's time zone (default: local). */
  timeZone?: string
  /** A renderer showing a percentage uses fractional values. */
  percent?: boolean
  /** The cell's value before: a date keeps its type (Date, timestamp, ISO text). */
  oldValue: unknown
  /** A select's choices (value and label). */
  options?: readonly { value: unknown; label?: string }[]
  /** Words for yes and no besides the English ones (e.g. the grid's messages). */
  yes?: string
  no?: string
}

/** What a pasted text means for a column: its value, or an Error saying why it doesn't fit. */
export function pasteValue(text: string, kind: PasteKind, ctx: PasteContext): unknown {
  const t = text.trim()
  switch (kind) {
    case 'number': {
      if (!t) return null
      const percent =
        ctx.percent && (t.includes('%') || t.includes(numberParts(ctx.locale).percent))
      const n = parseNumber(t, ctx.locale)
      return n === null ? new Error(`"${t}" is not a number.`) : percent ? n / 100 : n
    }
    case 'date':
    case 'datetime': {
      if (!t) return null
      const d = parseDate(t, ctx.locale, kind === 'datetime' ? ctx.timeZone : undefined)
      if (!d) return new Error(`"${t}" is not a date.`)
      return asOld(d, ctx.oldValue, kind)
    }
    case 'checkbox': {
      const v = t.toLowerCase()
      const yes = ['true', 'yes', 'y', '1', '✓', '✔', 'x', ctx.yes?.toLowerCase()]
      const no = ['false', 'no', 'n', '0', '', '✗', '✘', ctx.no?.toLowerCase()]
      if (yes.includes(v)) return true
      if (no.includes(v)) return false
      return new Error(`"${t}" is not yes or no.`)
    }
    case 'select': {
      if (!t) return null
      const lower = t.toLowerCase()
      const hit = ctx.options?.find(
        (o) => String(o.value).toLowerCase() === lower || (o.label ?? '').toLowerCase() === lower,
      )
      return hit ? hit.value : new Error(`"${t}" is not one of the choices.`)
    }
    default:
      return text
  }
}

const localeNumbers = new Map<string, { decimal: string; percent: string; digits: string[] }>()
function numberParts(locale: string) {
  const cached = localeNumbers.get(locale)
  if (cached) return cached
  let result = { decimal: '.', percent: '%', digits: [] as string[] }
  try {
    const number = new Intl.NumberFormat(locale, { useGrouping: false })
    result = {
      decimal: number.formatToParts(1.5).find((p) => p.type === 'decimal')?.value ?? '.',
      percent:
        new Intl.NumberFormat(locale, { style: 'percent' })
          .formatToParts(1)
          .find((p) => p.type === 'percentSign')?.value ?? '%',
      digits: Array.from({ length: 10 }, (_, digit) => number.format(digit)),
    }
  } catch {
    // Unknown locale: keep the plain ASCII forms.
  }
  localeNumbers.set(locale, result)
  return result
}

function asciiDigits(text: string, locale: string): string {
  if (/^[\x00-\x7f]*$/.test(text)) return text
  let normalized = text.replace(/\p{Bidi_Control}/gu, '')
  numberParts(locale).digits.forEach((digit, index) => {
    if (digit !== String(index)) normalized = normalized.replaceAll(digit, String(index))
  })
  return normalized
}

/**
 * A number as people paste it: `1234.5`, `1,234.50`, `1.234,50`, `€ 1 234,5`, `-12%`, `(12)`.
 * With one separator that could be either (`1,234` / `1.234`), the locale decides.
 */
export function parseNumber(text: string, locale: string): number | null {
  let s = asciiDigits(text, locale)
    .replace(/[\s  '٬]/g, '')
    .replaceAll('−', '-')
  const localDecimal = numberParts(locale).decimal
  const decimalSymbol = localDecimal === ',' ? ',' : '.'
  if (localDecimal !== decimalSymbol) s = s.replaceAll(localDecimal, decimalSymbol)
  let sign = 1
  if (/^\(.*\)$/.test(s)) {
    sign = -1 // accounting negatives
    s = s.slice(1, -1)
  }
  s = s.replace(/^[^\d.,+-]+|[^\d.,eE+-]+$/g, '') // currency symbols, %, units around it
  if (!/^[+-]?[\d.,]*\d[\d.,]*(?:[eE][+-]?\d+)?$/.test(s)) return null
  const dot = s.lastIndexOf('.')
  const comma = s.lastIndexOf(',')
  let decimal: string | null = null
  if (dot >= 0 && comma >= 0) decimal = dot > comma ? '.' : ','
  else if (dot >= 0 || comma >= 0) {
    const sep = dot >= 0 ? '.' : ','
    const parts = s.split(sep)
    // `1,234` / `1.234,567,8`: groups of three after it read as thousands, unless the locale says
    // that separator is its decimal one
    const grouped = parts.length > 2 || (parts[1]!.length === 3 && decimalSymbol !== sep)
    decimal = grouped ? null : sep
  }
  const thousands = decimal === '.' ? ',' : decimal === ',' ? '.' : s.includes(',') ? ',' : '.'
  s = s.split(thousands).join('')
  if (decimal === ',') s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? sign * n : null
}

/**
 * A date as people paste it: ISO (`2026-05-23`, with a time or not), or in the locale's order
 * (`05/23/2026` in en-US, `23.05.2026` in de, `23/05/2026` in en-GB), with an optional time.
 */
export function parseDate(text: string, locale: string, timeZone?: string): Date | null {
  text = asciiDigits(text, locale)
  const iso =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?)?$/i.exec(
      text,
    )
  if (iso) {
    if (!parseIsoDay(text.slice(0, 10))) return null
    if (iso[8]) {
      const instant = new Date(text.replace(' ', 'T'))
      return Number.isFinite(instant.getTime()) ? instant : null
    }
    return readWallTime(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      Number(iso[4] ?? 0),
      Number(iso[5] ?? 0),
      Number(iso[6] ?? 0),
      Number((iso[7] ?? '').padEnd(3, '0').slice(0, 3)),
      timeZone,
    )
  }
  const m =
    /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})\.?(?:[\s,T]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?(?:\s*(\p{L}[\p{L} .]*))?)?$/u.exec(
      text,
    )
  if (m) {
    const nums = [m[1], m[2], m[3]].map(Number) as [number, number, number]
    let y: number, mo: number, d: number
    if (m[1]!.length === 4) [y, mo, d] = nums
    else {
      const order = dateOrder(locale)
      const at = (k: 'year' | 'month' | 'day') => nums[order.indexOf(k)]!
      ;[y, mo, d] = [at('year'), at('month'), at('day')]
      if (y < 100 && m[order.indexOf('year') + 1]!.length <= 2) y += 2000
    }
    let hour = Number(m[4] ?? 0)
    if (m[8]) {
      const period = m[8].trim().toLowerCase()
      const parts = new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        hour12: true,
        timeZone: 'UTC',
      })
      const name = (h: number) =>
        parts
          .formatToParts(h * 3_600_000)
          .find((part) => part.type === 'dayPeriod')
          ?.value.toLowerCase()
      if (hour < 1 || hour > 12) return null
      if (period === 'am' || period === name(1)) hour %= 12
      else if (period === 'pm' || period === name(13)) hour = (hour % 12) + 12
      else return null
    }
    return readWallTime(
      y,
      mo,
      d,
      hour,
      Number(m[5] ?? 0),
      Number(m[6] ?? 0),
      Number((m[7] ?? '').padEnd(3, '0')),
      timeZone,
    )
  }
  // Don't let the engine normalize malformed ISO-looking dates in the fallback.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d/.test(text)) return null
  const any = new Date(text) // `May 23, 2026`, `23 May 2026` and friends
  if (Number.isNaN(any.getTime())) return null
  if (!timeZone || /(?:\b(?:GMT|UTC)|\d(?:Z|[+-]\d{2}:?\d{2})$)/i.test(text)) return any
  return readWallTime(
    any.getFullYear(),
    any.getMonth() + 1,
    any.getDate(),
    any.getHours(),
    any.getMinutes(),
    any.getSeconds(),
    any.getMilliseconds(),
    timeZone,
  )
}

const wallFormats = new Map<string, Intl.DateTimeFormat>()

function readWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone?: string,
): Date | null {
  if (hour > 23 || minute > 59 || second > 59) return null
  const midnight = utcDay(year, month - 1, day)
  const date = new Date(midnight)
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  if (timeZone) {
    const wall = midnight + ((hour * 60 + minute) * 60 + second) * 1000 + ms
    let formatter = wallFormats.get(timeZone)
    if (!formatter) wallFormats.set(timeZone, (formatter = wallFormatter(timeZone)))
    return fromWallTime(wall, formatter)
  }
  const local = localDay(year, month - 1, day)
  local.setHours(hour, minute, second, ms)
  return local.getDate() === day ? local : null
}

/** The order of day, month and year in the locale's short dates. */
function dateOrder(locale: string): ('year' | 'month' | 'day')[] {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(2026, 4, 23))
    const order = parts
      .map((p) => p.type)
      .filter((t): t is 'year' | 'month' | 'day' => t === 'year' || t === 'month' || t === 'day')
    if (order.length === 3) return order
  } catch {
    // an unknown locale: month first, like the default
  }
  return ['month', 'day', 'year']
}

/** A pasted date in the type the cell had: Date, timestamp, ISO date-time, or `YYYY-MM-DD`. */
function asOld(d: Date, old: unknown, kind: 'date' | 'datetime'): unknown {
  if (old instanceof Date) return d
  if (typeof old === 'number') return d.getTime()
  if (kind === 'datetime' || (typeof old === 'string' && old.length > 10)) return d.toISOString()
  return localDayKey(d)
}

/**
 * Where a block goes: its own size from the top-left cell, or, when a range is a whole number of
 * blocks in both directions (one value into many cells, as in a spreadsheet), repeated over it.
 */
export function pasteArea(
  block: { rows: number; cols: number },
  range: { rows: number; cols: number } | null,
): { rows: number; cols: number } {
  if (range && range.rows % block.rows === 0 && range.cols % block.cols === 0) return range
  return block
}

// ── Filling (the fill handle, Ctrl/⌘+D) ─────────────────────────────────────────────────────

/** A value read as a calendar day, if it is one: a Date, or ISO text (`2026-05-23`, with a time or not). */
function asDay(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (m) return parseIsoDay(value) ? localDay(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
  if (!/^\d{4}-\d{2}-\d{2}T\d/.test(value)) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Whole days from `a` to `b`, by the calendar (a daylight-saving change doesn't count). */
const dayGap = (a: Date, b: Date) =>
  Math.round(
    (utcDay(b.getFullYear(), b.getMonth(), b.getDate()) -
      utcDay(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  )

/** `d` moved by `days`, in the type `like` had (Date, ISO date, ISO date-time). */
function shiftDay(d: Date, days: number, like: unknown): unknown {
  const next = new Date(d)
  next.setDate(next.getDate() + days)
  if (like instanceof Date) return next
  if (typeof like === 'string' && like.length === 10) return localDayKey(next)
  return next.toISOString()
}

/**
 * The next `count` values after `source` (the cells a fill starts from, in the fill's direction),
 * as a spreadsheet's fill handle makes them: numbers a steady step apart go on (`1, 2` → `3, 4`;
 * `10, 20` → `30`), dates go on by their step in days (one date alone: day by day), and
 * anything else repeats (`a, b` → `a, b, a`).
 */
export function fillSeries(source: readonly unknown[], count: number): unknown[] {
  const n = source.length
  const out: unknown[] = []
  if (!n || count <= 0) return out
  const last = source[n - 1]
  if (n >= 2 && source.every((v) => typeof v === 'number' && Number.isFinite(v))) {
    const nums = source as number[]
    const step = nums[1]! - nums[0]!
    const steady = nums.every(
      (v, i) => i === 0 || Math.abs(v - nums[i - 1]! - step) <= 1e-9 * Math.max(1, Math.abs(step)),
    )
    if (steady) {
      // rounded: 0.1 + 0.2 shows as 0.3, not 0.30000000000000004
      const integerSeries = Number.isSafeInteger(step) && nums.every(Number.isSafeInteger)
      for (let i = 1; i <= count; i++) {
        const value = (last as number) + step * i
        out.push(integerSeries ? value : Number(value.toPrecision(12)))
      }
      return out
    }
  }
  const days = source.map(asDay)
  if (days.every((d): d is Date => d !== null)) {
    const step = n === 1 ? 1 : dayGap(days[0]!, days[1]!)
    const steady = days.every((d, i) => i === 0 || dayGap(days[i - 1]!, d) === step)
    if (steady && step !== 0) {
      for (let i = 1; i <= count; i++) out.push(shiftDay(days[n - 1]!, step * i, last))
      return out
    }
  }
  for (let i = 0; i < count; i++) out.push(source[i % n])
  return out
}

/**
 * A filled value as the target column holds it: kept when it already fits (a number into a
 * number column, a choice into a select…), else read like pasted text; an Error when it can't be.
 */
export function fillValue(value: unknown, kind: PasteKind, ctx: PasteContext): unknown {
  if (value === null || value === undefined || value === '')
    return kind === 'checkbox' ? false : kind === 'text' ? (value ?? null) : null
  switch (kind) {
    case 'number':
      if (typeof value === 'number')
        return Number.isFinite(value) ? value : new Error('Not a number.')
      return pasteValue(String(value), kind, ctx)
    case 'checkbox':
      return typeof value === 'boolean' ? value : pasteValue(String(value), kind, ctx)
    case 'date':
    case 'datetime': {
      const d =
        value instanceof Date
          ? value
          : typeof value === 'number'
            ? new Date(value)
            : parseDate(String(value), ctx.locale, kind === 'datetime' ? ctx.timeZone : undefined)
      if (!d || Number.isNaN(d.getTime())) return new Error(`"${String(value)}" is not a date.`)
      return asOld(d, ctx.oldValue, kind)
    }
    case 'select':
      return ctx.options?.some((o) => Object.is(o.value, value))
        ? value
        : pasteValue(String(value), kind, ctx)
    default:
      return typeof value === 'string' ? value : String(value)
  }
}
