import { useGridExport } from '../composables/useGridExport'
import type { ExportFeature } from '../types'

/**
 * CSV and Excel export and copying: `grid.exportCsv()` downloads the filtered, sorted rows as a
 * CSV file, `grid.getCsv()` returns the text, `grid.exportXlsx()` / `grid.getXlsx()` write an Excel
 * workbook with typed cells (the writer loads on demand), `grid.print()` prints every matching row
 * as a table with the header on each page, `grid.copyRows()` copies rows as
 * tab-separated text, and Ctrl/⌘+C copies the selected rows, else the focused cell, as displayed.
 * Columns can set `exportValue` and `exportable: false`. Without it those methods only warn.
 */
export const exportFeature: ExportFeature = { feature: 'export', useExport: useGridExport }
