import type { FormatContext } from '../types'

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>()

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `n|${locale}|${JSON.stringify(options)}`
  let f = cache.get(id) as Intl.NumberFormat | undefined
  if (!f) cache.set(id, (f = new Intl.NumberFormat(locale, options)))
  return f
}

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = `d|${locale}|${JSON.stringify(options)}`
  let f = cache.get(id) as Intl.DateTimeFormat | undefined
  if (!f) cache.set(id, (f = new Intl.DateTimeFormat(locale, options)))
  return f
}

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' || typeof value === 'number') {
    if (value === '') return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function formatNumber(value: unknown, ctx: FormatContext, options: Intl.NumberFormatOptions = {}): string {
  const n = toNumber(value)
  return n === null ? '' : numberFormat(ctx.locale, options).format(n)
}

export function formatSigned(value: unknown, ctx: FormatContext, options: Intl.NumberFormatOptions = {}): string {
  return formatNumber(value, ctx, { signDisplay: 'exceptZero', ...options })
}

export function formatCurrency(
  value: unknown,
  ctx: FormatContext,
  currency?: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return formatNumber(value, ctx, { style: 'currency', currency: currency ?? ctx.currency, ...options })
}

export function formatDate(value: unknown, ctx: FormatContext, options: Intl.DateTimeFormatOptions = {}): string {
  const d = toDate(value)
  if (!d) return ''
  const opts: Intl.DateTimeFormatOptions = { ...options }
  // `2026-01-05` parses as UTC midnight: show it in UTC, or it reads as the 4th west of Greenwich.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) opts.timeZone = 'UTC'
  else if (ctx.timeZone && !opts.timeZone) opts.timeZone = ctx.timeZone
  return dateFormat(ctx.locale, opts).format(d)
}

export const DATE_DEFAULT: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
export const TIME_DEFAULT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' }

/** Only http(s), mailto, tel and relative URLs are rendered as links (blocks `javascript:` etc.). */
export function safeHref(href: unknown): string | undefined {
  if (typeof href !== 'string') return undefined
  // Clean the URL the way browsers do before parsing it (WHATWG URL): drop leading/trailing C0
  // controls and spaces, and every tab or newline — otherwise `java\tscript:` slips past the check.
  const cleaned = href.replace(/^[\u0000- ]+|[\u0000- ]+$/g, '').replace(/[\t\n\r]/g, '')
  if (!cleaned) return undefined
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned)?.[1]?.toLowerCase()
  if (!scheme) return cleaned
  return ['http', 'https', 'mailto', 'tel'].includes(scheme) ? cleaned : undefined
}

/** Parses JSON strings; other values are returned as-is. */
export function parseJsonish(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/**
 * Black or white, whichever reads better on `color`. Understands hex (#rgb, #rrggbb) and rgb()/rgba();
 * anything else (named colours, var(), hsl()) gets white.
 */
export function readableTextColor(color: string): '#000' | '#fff' {
  let r: number, g: number, b: number
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())?.[1]
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(color.trim())
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
    ;[r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
  } else if (rgb) {
    ;[r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number) as [number, number, number]
  } else {
    return '#fff'
  }
  // WCAG relative luminance
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return lum > 0.4 ? '#000' : '#fff'
}

/** Image URL with an optional base for relative paths; only http(s), relative and `data:image/` are allowed. */
export function resolveImageSrc(src: unknown, baseUrl?: string): string | undefined {
  if (typeof src !== 'string' || !src.trim()) return undefined
  const s = src.trim()
  if (/^data:image\//i.test(s)) return s
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//')) return /^https?:/i.test(s) ? s : undefined
  if (!baseUrl) return s
  return `${baseUrl.replace(/\/+$/, '')}/${s.replace(/^\/+/, '')}`
}

export type JsonTokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct'

/** Splits pretty-printed JSON into typed tokens (rendered as text nodes, never as HTML). */
export function tokenizeJson(text: string): { type: JsonTokenType; text: string }[] {
  const out: { type: JsonTokenType; text: string }[] = []
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ type: 'punct', text: text.slice(last, m.index) })
    if (m[1]) {
      out.push({ type: m[2] ? 'key' : 'string', text: m[1] })
      if (m[2]) out.push({ type: 'punct', text: m[2] })
    } else if (m[3]) out.push({ type: 'boolean', text: m[0] })
    else if (m[0] === 'null') out.push({ type: 'null', text: m[0] })
    else out.push({ type: 'number', text: m[0] })
    last = re.lastIndex
  }
  if (last < text.length) out.push({ type: 'punct', text: text.slice(last) })
  return out
}

export function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(parseJsonish(value), null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}
