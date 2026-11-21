import { defineCellRenderer } from '@eboye/vue-grid'
import RatingCell from './RatingCell.vue'
import type { RatingOptions } from './types'

// 1. Register the renderer name and its options with the grid's type registry, so
//    `renderer: 'rating'` autocompletes and `rendererOptions` is type-checked.
declare module '@eboye/vue-grid' {
  interface CellRendererRegistry {
    rating: RatingOptions
  }
}

// 2. Describe the renderer. Everything except `name` and `component` is optional.
export const ratingRenderer = defineCellRenderer<RatingOptions>({
  name: 'rating',
  component: RatingCell,
  defaults: { max: 5, readonly: false },
  align: 'start',
  // Used by `sortMode="client"` so ratings sort numerically.
  sortValue: (value) => (value === null || value === undefined ? null : Number(value)),
  // Plain-text form (tooltips, exports, accessibility).
  format: (value, options) => `${Number(value ?? 0)} of ${options.max ?? 5}`,
})

export { RatingCell }
export type { RatingOptions }
