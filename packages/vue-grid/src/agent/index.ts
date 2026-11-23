/**
 * `@eboye/vue-grid/agent`: the grid's API as data, and a validator for grid configs — for coding
 * agents, MCP servers and tooling. Not part of the main entry: apps never bundle it.
 *
 * ```ts
 * import { api, validateGridConfig } from '@eboye/vue-grid/agent'
 * validateGridConfig({ columns, rowKey: 'id', features: ['sortingFeature'], sortMode: 'client' })
 * ```
 */
import apiJson from './api.json'

export { validateGridConfig, type Diagnostic, type GridConfigInput, type ValidationResult } from './validate'
export { columnFeatures, featureExport, optOuts, propFeatures, type FeatureId } from './requirements'

/** One prop, model, column option, renderer option or type field. */
export interface ApiMember {
  name: string
  type: string
  required?: boolean
  default?: string
  description: string
  /** The feature it needs (`sorting` → `sortingFeature`). */
  feature?: string
}
export interface ApiReference {
  package: string
  version: string
  component: 'VGrid'
  props: ApiMember[]
  models: ApiMember[]
  events: { name: string; payload: string; description: string }[]
  slots: { name: string; scope: string | null; description: string }[]
  methods: ApiMember[]
  column: ApiMember[]
  features: { id: string; export: string; description: string; props: string[]; columnOptions: string[] }[]
  renderers: {
    name: string
    export: string
    description: string
    align: string
    filterType: string
    defaults?: string
    options: ApiMember[]
  }[]
  types: Record<string, ApiMember[]>
}

/** Every prop, v-model, event, slot, method, column option, feature and renderer — generated from the sources. */
export const api = apiJson as ApiReference
