import type { ColumnState, ColumnStateStorage } from '../types'

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/**
 * Persists column state in `localStorage`. Never throws: unavailable storage (private mode,
 * blocked cookies, SSR) or malformed data simply behaves like "nothing stored".
 */
export function localStorageAdapter(key: string): ColumnStateStorage {
  return {
    load() {
      try {
        const raw = globalThis.localStorage?.getItem(key)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object') return null
        const { order, hidden, pinned, widths } = parsed as Partial<ColumnState>
        if (!isStringArray(order) || (hidden !== undefined && !isStringArray(hidden))) return null
        // Pin and width entries are validated per key by normalizeColumnState; only the shape here.
        const isRecord = (v: unknown): v is Record<string, never> => !!v && typeof v === 'object' && !Array.isArray(v)
        // A missing `hidden` stays missing, so columns keep their own `hidden` defaults.
        const state: Partial<ColumnState> = { order, pinned: isRecord(pinned) ? pinned : {} }
        if (hidden) state.hidden = hidden
        if (isRecord(widths)) state.widths = widths
        return state
      } catch {
        return null
      }
    },
    save(state) {
      try {
        const stored: Partial<ColumnState> = { order: state.order, hidden: state.hidden, pinned: state.pinned ?? {} }
        if (state.widths && Object.keys(state.widths).length) stored.widths = state.widths
        globalThis.localStorage?.setItem(key, JSON.stringify(stored))
      } catch {
        // Storage full or unavailable: persistence is best-effort.
      }
    },
  }
}
