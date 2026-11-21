import type { CellRendererDefinition } from '../types'

/**
 * Identity helper that gives renderer authors type inference for options.
 *
 * ```ts
 * export const ratingRenderer = defineCellRenderer<{ max: number }>({
 *   name: 'rating', component: RatingCell, defaults: { max: 5 },
 * })
 * ```
 */
export function defineCellRenderer<O = Record<string, unknown>>(
  definition: CellRendererDefinition<O>,
): CellRendererDefinition<O> {
  return definition
}

export interface RendererRegistry {
  get(name: string): CellRendererDefinition | undefined
}

/** Builds a lookup from layers of definitions; later layers override earlier ones by name. */
export function createRendererRegistry(
  ...layers: (readonly CellRendererDefinition[] | undefined)[]
): RendererRegistry {
  const map = new Map<string, CellRendererDefinition>()
  for (const layer of layers) {
    for (const def of layer ?? []) map.set(def.name, def)
  }
  return { get: (name) => map.get(name) }
}

/** Tells a renderer definition (`{ name, component, … }`) apart from a plain component. */
export function isRendererDefinition(value: unknown): value is CellRendererDefinition {
  return typeof value === 'object' && value !== null && 'component' in value && 'name' in value && typeof (value as { name: unknown }).name === 'string'
}
