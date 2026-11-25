import { useExtraAttrs } from '../composables/useExtraAttrs'
import type { AttributesFeature } from '../types'

/**
 * Your own attributes on rows and cells (`row-attrs`, `cell-attrs`), such as test hooks:
 * `:row-attrs="({ rowIndex }) => ({ 'data-test': `row-${rowIndex}` })"`. Each gets the row, its
 * key and its position as shown (cells also the column and its position). The grid's own
 * attributes (role, ARIA, `tabindex`, classes, styles, its `data-*` hooks) and `on…` handlers
 * are left alone.
 */
export const attributesFeature: AttributesFeature = {
  feature: 'attributes',
  useExtraAttrs,
}
