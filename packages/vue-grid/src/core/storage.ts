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
        const { order, hidden } = parsed as Partial<ColumnState>
        if (!isStringArray(order) || (hidden !== undefined && !isStringArray(hidden))) return null
        return { order, hidden: hidden ?? [] }
      } catch {
        return null
      }
    },
    save(state) {
      try {
        globalThis.localStorage?.setItem(key, JSON.stringify({ order: state.order, hidden: state.hidden }))
      } catch {
        // Storage full or unavailable: persistence is best-effort.
      }
    },
  }
}
