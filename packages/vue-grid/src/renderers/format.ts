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
  if (ctx.timeZone && !opts.timeZone) opts.timeZone = ctx.timeZone
  return dateFormat(ctx.locale, opts).format(d)
}

export const DATE_DEFAULT: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }
export const TIME_DEFAULT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' }

/** Only http(s), mailto, tel and relative URLs are rendered as links (blocks `javascript:` etc.). */
export function safeHref(href: unknown): string | undefined {
  if (typeof href !== 'string' || !href.trim()) return undefined
  const trimmed = href.trim()
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)?.[1]?.toLowerCase()
  if (!scheme) return trimmed
  return ['http', 'https', 'mailto', 'tel'].includes(scheme) ? trimmed : undefined
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

export function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(parseJsonish(value), null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}
