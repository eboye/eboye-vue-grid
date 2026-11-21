import { toDate, toNumber } from '../renderers/format'

/** The kinds of built-in column filters. */
export type FilterType = 'text' | 'number' | 'date' | 'boolean' | 'set'

export type TextFilterOp = 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty'
export type NumberFilterOp = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'empty' | 'notEmpty'
export type DateFilterOp = 'on' | 'before' | 'after' | 'between' | 'empty' | 'notEmpty'

export interface TextFilter {
  type: 'text'
  op: TextFilterOp
  value?: string
}
export interface NumberFilter {
  type: 'number'
  op: NumberFilterOp
  value?: number | null
  /** Upper bound for `between` (inclusive). */
  to?: number | null
}
export interface DateFilter {
  type: 'date'
  op: DateFilterOp
  /** `YYYY-MM-DD` (what `<input type="date">` produces). */
  value?: string
  to?: string
}
export interface BooleanFilter {
  type: 'boolean'
  /** `null` matches empty values. */
  value: boolean | null
}
export interface SetFilter {
  type: 'set'
  /** Selected values, as keys from {@link setKey} (`''` = blanks). */
  values: string[]
}
/** Anything a column's `filterComponent` / `filterFn` understand. */
export interface CustomFilter {
  type: 'custom'
  value: unknown
}

export type ColumnFilter = TextFilter | NumberFilter | DateFilter | BooleanFilter | SetFilter | CustomFilter

/** The grid's filter model (`v-model:filters`). */
export interface FilterState {
  /** Active filter per column key. */
  columns: Record<string, ColumnFilter>
  /** Quick search across searchable columns. */
  search?: string
}

export interface FilterStateStorage {
  load(): FilterState | null
  save(state: FilterState): void
}

export const emptyFilters = (): FilterState => ({ columns: {}, search: '' })

/** Is the filter restricting anything? (An empty text box or an empty value list doesn't.) */
export function isFilterActive(filter: ColumnFilter | undefined | null): boolean {
  if (!filter) return false
  switch (filter.type) {
    case 'text':
      return filter.op === 'empty' || filter.op === 'notEmpty' || !!filter.value
    case 'number':
      if (filter.op === 'empty' || filter.op === 'notEmpty') return true
      if (filter.op === 'between') return isNum(filter.value) || isNum(filter.to)
      return isNum(filter.value)
    case 'date':
      if (filter.op === 'empty' || filter.op === 'notEmpty') return true
      return !!filter.value || (filter.op === 'between' && !!filter.to)
    case 'boolean':
      return true
    case 'set':
      return Array.isArray(filter.values)
    case 'custom':
      return filter.value !== undefined && filter.value !== null && filter.value !== ''
  }
}

/** Number of active column filters plus the search, for badges and "clear all". */
export function activeFilterCount(state: FilterState | null | undefined): number {
  if (!state) return 0
  const columns = Object.values(state.columns ?? {}).filter(isFilterActive).length
  return columns + (state.search?.trim() ? 1 : 0)
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isBlank = (v: unknown) => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)

/** Lower-cased, accent-free text for forgiving matching (`"nis"` finds `"Niš"`). */
export function foldText(value: unknown): string {
  if (isBlank(value)) return ''
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
}

/** The value-list key of a cell value: its string form, `''` for blanks. */
export function setKey(value: unknown): string {
  if (isBlank(value)) return ''
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

/** `YYYY-MM-DD` of a date-ish value in the given time zone (default: local). */
export function dayKey(value: unknown, timeZone?: string): string | null {
  const d = toDate(value)
  if (!d) return null
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Does a single cell value pass a built-in filter? (`custom` filters need the column's `filterFn`.) */
export function matchesFilter(value: unknown, filter: ColumnFilter, opts: { timeZone?: string } = {}): boolean {
  if (!isFilterActive(filter)) return true
  switch (filter.type) {
    case 'text': {
      if (filter.op === 'empty') return isBlank(value)
      if (filter.op === 'notEmpty') return !isBlank(value)
      const text = foldText(value)
      const q = foldText(filter.value)
      switch (filter.op) {
        case 'contains':
          return text.includes(q)
        case 'notContains':
          return !text.includes(q)
        case 'equals':
          return text === q
        case 'notEquals':
          return text !== q
        case 'startsWith':
          return text.startsWith(q)
        case 'endsWith':
          return text.endsWith(q)
      }
      return true
    }
    case 'number': {
      const n = toNumber(value)
      if (filter.op === 'empty') return n === null
      if (filter.op === 'notEmpty') return n !== null
      if (n === null) return false
      const a = filter.value
      switch (filter.op) {
        case 'eq':
          return n === a
        case 'ne':
          return n !== a
        case 'lt':
          return n < (a as number)
        case 'lte':
          return n <= (a as number)
        case 'gt':
          return n > (a as number)
        case 'gte':
          return n >= (a as number)
        case 'between':
          return (!isNum(a) || n >= a) && (!isNum(filter.to) || n <= filter.to)
      }
      return true
    }
    case 'date': {
      const day = dayKey(value, opts.timeZone)
      if (filter.op === 'empty') return day === null
      if (filter.op === 'notEmpty') return day !== null
      if (day === null) return false
      const a = filter.value ?? ''
      switch (filter.op) {
        case 'on':
          return day === a
        case 'before':
          return day < a
        case 'after':
          return day > a
        case 'between':
          return (!a || day >= a) && (!filter.to || day <= filter.to)
      }
      return true
    }
    case 'boolean':
      return filter.value === null ? isBlank(value) : !isBlank(value) && !!value === filter.value
    case 'set':
      return filter.values.includes(setKey(value))
    case 'custom':
      return true
  }
}

/**
 * Parses the filter row's shorthand into a filter: text → contains; numbers accept `>10`, `<=5`,
 * `!=3`, `10..20` / `10-20`, or a plain number; dates accept `>2026-01-01`, `<…`, `a..b` or a day.
 * Returns `undefined` for empty input (= no filter).
 */
export function parseQuickFilter(type: FilterType, input: string): ColumnFilter | undefined {
  const s = input.trim()
  if (!s) return undefined
  if (type === 'number') {
    const range = /^(-?[\d.]+)\s*(?:\.\.|–|—|-(?=\s*-?\d))\s*(-?[\d.]+)$/.exec(s)
    if (range) return { type: 'number', op: 'between', value: Number(range[1]), to: Number(range[2]) }
    const m = /^(>=|<=|!=|<>|=|>|<)?\s*(-?\d+(?:\.\d+)?)$/.exec(s)
    if (!m) return undefined
    const op = ({ '>=': 'gte', '<=': 'lte', '!=': 'ne', '<>': 'ne', '=': 'eq', '>': 'gt', '<': 'lt' } as const)[m[1] as '>'] ?? 'eq'
    return { type: 'number', op, value: Number(m[2]) }
  }
  if (type === 'date') {
    const range = /^(\d{4}-\d{2}-\d{2})\s*\.\.\s*(\d{4}-\d{2}-\d{2})$/.exec(s)
    if (range) return { type: 'date', op: 'between', value: range[1], to: range[2] }
    const m = /^(>|<)?\s*(\d{4}-\d{2}-\d{2})$/.exec(s)
    if (!m) return undefined
    return { type: 'date', op: m[1] === '>' ? 'after' : m[1] === '<' ? 'before' : 'on', value: m[2] }
  }
  return { type: 'text', op: 'contains', value: s }
}

/** Shorthand text for a filter, shown in the filter row (inverse of {@link parseQuickFilter}). */
export function quickFilterText(filter: ColumnFilter | undefined): string {
  if (!filter || !isFilterActive(filter)) return ''
  if (filter.type === 'text') return filter.op === 'contains' ? (filter.value ?? '') : ''
  if (filter.type === 'number') {
    if (filter.op === 'between') return `${filter.value ?? ''}..${filter.to ?? ''}`
    const sym = { eq: '', ne: '!=', lt: '<', lte: '<=', gt: '>', gte: '>=' } as Record<string, string>
    return filter.op in sym ? `${sym[filter.op]}${filter.value ?? ''}` : ''
  }
  if (filter.type === 'date') {
    if (filter.op === 'between') return `${filter.value ?? ''}..${filter.to ?? ''}`
    const sym = ({ on: '', before: '<', after: '>' } as Record<string, string>)[filter.op]
    return sym === undefined ? '' : `${sym}${filter.value ?? ''}`
  }
  return ''
}

/**
 * Filters rows, keeping tree structure: a row stays if it matches, or if any of its children
 * (from `childrenOf`) stays. A row that matches itself keeps all of its children.
 */
export function filterTree<T>(
  rows: readonly T[],
  matches: (row: T) => boolean,
  childrenOf?: (row: T) => readonly T[] | undefined,
): T[] {
  if (!childrenOf) return rows.filter(matches)
  return rows.filter((row) => matches(row) || hasMatchingDescendant(row, matches, childrenOf))
}

function hasMatchingDescendant<T>(
  row: T,
  matches: (row: T) => boolean,
  childrenOf: (row: T) => readonly T[] | undefined,
): boolean {
  const kids = childrenOf(row)
  if (!kids?.length) return false
  return kids.some((kid) => matches(kid) || hasMatchingDescendant(kid, matches, childrenOf))
}

/** Saves the filter model in localStorage. Never throws; malformed data loads as "nothing stored". */
export function localFilterStorage(key: string): FilterStateStorage {
  return {
    load() {
      try {
        const raw = globalThis.localStorage?.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<FilterState>
        if (!parsed || typeof parsed !== 'object' || typeof parsed.columns !== 'object' || !parsed.columns) return null
        return { columns: parsed.columns as Record<string, ColumnFilter>, search: typeof parsed.search === 'string' ? parsed.search : '' }
      } catch {
        return null
      }
    },
    save(state) {
      try {
        globalThis.localStorage?.setItem(key, JSON.stringify(state))
      } catch {
        // Storage full or unavailable: persistence is best-effort.
      }
    },
  }
}
