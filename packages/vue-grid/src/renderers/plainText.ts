/**
 * Plain-text forms of renderer values (a definition's `format`): what the cell shows, as text, for
 * copying and exports. They mirror the cell components' own formatting.
 */
import type { FormatContext } from '../types'
import { DATE_DEFAULT, TIME_DEFAULT, formatCurrency, formatDate, formatNumber, formatSigned, toDate, toNumber } from './format'
import {
  lookup,
  resolveOption,
  type BooleanOptions,
  type ChangeOptions,
  type ChipOptions,
  type CurrencyOptions,
  type DateOptions,
  type DateTimeOptions,
  type ListOptions,
  type SignedNumberOptions,
  type StatusOptions,
} from './options'

const isEmpty = (v: unknown) => v === null || v === undefined || v === ''

export const numberText = (v: unknown, o: SignedNumberOptions, ctx: FormatContext) =>
  (o.signed ? formatSigned : formatNumber)(v, ctx, o.format)

export const currencyText = (v: unknown, o: CurrencyOptions, ctx: FormatContext, row?: unknown) =>
  formatCurrency(v, ctx, resolveOption(o.currency, v, row), o.format)

export function changeText(v: unknown, o: ChangeOptions, ctx: FormatContext): string {
  if (typeof v === 'boolean' || v === 'true' || v === 'false') return ''
  if (toNumber(v) === null) return isEmpty(v) ? '' : String(v)
  if (o.currency) return formatCurrency(v, ctx, typeof o.currency === 'string' ? o.currency : undefined, o.format)
  return formatNumber(v, ctx, o.format)
}

export const dateText = (v: unknown, o: DateOptions, ctx: FormatContext) =>
  toDate(v) ? formatDate(v, ctx, o.format ?? DATE_DEFAULT) : ''

export function dateTimeText(v: unknown, o: DateTimeOptions, ctx: FormatContext): string {
  const d = toDate(v)
  if (!d) return ''
  if (o.format) return formatDate(d, ctx, o.format)
  const time: Intl.DateTimeFormatOptions = { ...TIME_DEFAULT }
  if (o.milliseconds) time.fractionalSecondDigits = 3
  return `${formatDate(d, ctx, DATE_DEFAULT)} ${formatDate(d, ctx, time)}`
}

export const booleanText = (v: unknown, o: BooleanOptions) =>
  v === null || v === undefined ? (o.nullLabel ?? '') : v ? (o.trueLabel ?? 'Yes') : (o.falseLabel ?? 'No')

export function statusText(v: unknown, o: StatusOptions, _ctx: FormatContext, row?: unknown): string {
  const l = o.label
  if (typeof l === 'function') return l(v, row)
  const raw = isEmpty(v) ? '' : String(v)
  return (l && lookup(l, raw)) ?? raw
}

export function chipText(v: unknown, o: ChipOptions, _ctx: FormatContext, row?: unknown): string {
  if (o.label) return o.label(v, row)
  const r = v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : null
  const label = r ? (r.label ?? r.name ?? r.text) : v
  return label === null || label === undefined ? '' : String(label)
}

export function listText(v: unknown, o: ListOptions, _ctx: FormatContext, row?: unknown): string {
  const raw = o.items ? o.items(v, row) : v
  if (!Array.isArray(raw)) return ''
  return raw
    .map((item) =>
      o.itemLabel ? o.itemLabel(item, row) : item !== null && typeof item === 'object' ? JSON.stringify(item) : String(item ?? ''),
    )
    .join(', ')
}
