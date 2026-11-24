import { useGridExport } from '../composables/useGridExport'
import type { ExportFeature } from '../types'

/**
 * CSV export and copying: `grid.exportCsv()` downloads the filtered, sorted rows as a CSV file,
 * `grid.getCsv()` returns the text, `grid.copyRows()` copies rows as tab-separated text, and
 * Ctrl/⌘+C copies the selected rows, else the focused cell, as displayed. Columns can set
 * `exportValue` and `exportable: false`. Without it those methods only warn.
 */
export const exportFeature: ExportFeature = { feature: 'export', useExport: useGridExport }
