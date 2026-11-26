import { computed, type Ref } from 'vue'
import type { PinnedRowItem } from '../internal/context'
import type { PinnedRowsState, RowKey } from '../types'

export interface PinnedRowsOptions<T> {
  /** `v-model:pinned-rows`. */
  model: Ref<PinnedRowsState | null>
  /** The top-level rows pinned rows are looked up in (before filtering). */
  rows: () => readonly T[]
  /** Reads `row-key` once, for passes over many rows. */
  keyOf: () => (row: T) => RowKey
  /** A server page can omit a row that still exists. */
  retainMissing?: () => boolean
  /** Extra rows above / below the body that aren't in the data. */
  extraTop: () => readonly T[] | undefined
  extraBottom: () => readonly T[] | undefined
}

/**
 * Row pinning: the rows pinned by key (`v-model:pinned-rows`) and the app's extra pinned rows, as
 * the items of the two sticky sections; the keys the body leaves out; and `pinRow()`.
 */
export function usePinnedRows<T>(opts: PinnedRowsOptions<T>) {
  const topKeys = computed<readonly RowKey[]>(() => opts.model.value?.top ?? [])
  const bottomKeys = computed<readonly RowKey[]>(() => opts.model.value?.bottom ?? [])
  /** Keys of the data rows pinned anywhere: the body leaves them out. */
  const keys = computed(() => new Set([...topKeys.value, ...bottomKeys.value]))

  // A pinned row the current rows no longer hold (server data: another page) keeps showing its
  // last known version.
  const cache = new Map<RowKey, T>()
  const byKey = computed(() => {
    const wanted = keys.value
    const found = new Map<RowKey, T>()
    if (!wanted.size) {
      cache.clear()
      return found
    }
    const key = opts.keyOf()
    for (const row of opts.rows()) {
      const k = key(row)
      if (wanted.has(k)) found.set(k, row)
    }
    if (opts.retainMissing?.() === false) {
      cache.clear()
      return found
    }
    for (const k of [...cache.keys()]) if (!wanted.has(k)) cache.delete(k)
    for (const k of wanted) {
      const row = found.get(k)
      if (row !== undefined) cache.set(k, row)
      else if (cache.has(k)) found.set(k, cache.get(k)!)
    }
    return found
  })

  const items = computed(() => {
    const key = opts.keyOf()
    const extra = (rows: readonly T[] | undefined, side: string) =>
      (rows ?? []).map((row): PinnedRowItem => {
        const k = key(row)
        return { id: `${side}:x:${String(k)}`, kind: 'row', row, key: k, selectable: false }
      })
    const keyed = (list: readonly RowKey[], side: string) =>
      list.flatMap((k): PinnedRowItem[] => {
        const row = byKey.value.get(k)
        return row === undefined
          ? []
          : [{ id: `${side}:k:${String(k)}`, kind: 'row', row, key: k, selectable: true }]
      })
    return {
      top: [...extra(opts.extraTop(), 'top'), ...keyed(topKeys.value, 'top')],
      bottom: [...keyed(bottomKeys.value, 'bottom'), ...extra(opts.extraBottom(), 'bottom')],
    }
  })

  /** Pins a top-level row above or below the body (`null` unpins it). */
  function pinRow(key: RowKey, side: 'top' | 'bottom' | null) {
    const top = topKeys.value.filter((k) => k !== key)
    const bottom = bottomKeys.value.filter((k) => k !== key)
    if (side === 'top') top.push(key)
    else if (side === 'bottom') bottom.push(key)
    opts.model.value = { top, bottom }
  }

  return { keys, items, pinRow }
}
