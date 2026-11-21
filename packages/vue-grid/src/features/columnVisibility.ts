import { setColumnHidden } from '../core/columns'
import type { ColumnVisibilityFeature } from '../types'

/**
 * Column visibility: `hidden: true` columns, `columnState.hidden` (persisted with `storage`), the
 * header menu's Hide column item and `<VGridColumnMenu>`'s checkboxes. Columns opt out with
 * `hideable: false`. Without it, every column shows.
 */
export const columnVisibilityFeature: ColumnVisibilityFeature = { feature: 'columnVisibility', setColumnHidden }
