import { computed, inject, type ComputedRef, type InjectionKey } from 'vue'
import { GRID_CONFIG_KEY } from '../registry/plugin'
import type { GridMessages, GridParts } from '../types'

/** A grid's messages and parts: its own props over `createVueGrid` config. */
export const MESSAGES_KEY: InjectionKey<ComputedRef<GridMessages>> = Symbol('vue-grid:messages')
export const PARTS_KEY: InjectionKey<ComputedRef<GridParts>> = Symbol('vue-grid:parts')

/**
 * The built-in text in effect: the nearest grid's, else the app's (`createVueGrid({ messages })`),
 * for components used on their own (`<VGridPagination>`, `<VGridSearch>`…). Each caller keeps its
 * English default next to the text (`m.value.retry ?? 'Retry'`), so unused features' text
 * tree-shakes away with them.
 */
export function useMessages(): ComputedRef<GridMessages> {
  const grid = inject(MESSAGES_KEY, undefined)
  if (grid) return grid
  const config = inject(GRID_CONFIG_KEY, undefined)
  return computed(() => config?.messages ?? {})
}

/** The built-in parts in effect (each `true` unless turned off). */
export function useParts(): ComputedRef<GridParts> {
  const grid = inject(PARTS_KEY, undefined)
  if (grid) return grid
  const config = inject(GRID_CONFIG_KEY, undefined)
  return computed(() => config?.parts ?? {})
}

/** Is a part on? Parts are on unless set to `false`. */
export const partOn = (parts: GridParts, name: keyof GridParts) => parts[name] !== false
