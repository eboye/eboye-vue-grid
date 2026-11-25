# Changelog

## 0.18.0 — 2026-11-25

**Test hooks on rows and cells** (`attributesFeature`): `row-attrs` and `cell-attrs` add your own
attributes to each data row and cell, such as `data-test` hooks for end-to-end tests. Each gets the
row, its key and its position as shown (0-based, sorted and filtered; with virtual scrolling
counted over every row), its tree depth and pinned section; cells also the column, its key and
position, its kind and pinned side. The grid's own attributes (`role`, `aria-*`, `tabindex`, `id`,
`class`, `style`, its `data-*` hooks) and `on…` handlers can't be overridden. New types
`RowAttrsContext`, `CellAttrsContext`, `ExtraAttrs`. The feature is 0.5 kB gzipped; a plain grid
grows by 0.1 kB, to 16.1 kB.

## 0.17.1 — 2026-11-25

Fix: the find bar no longer loses keyboard focus after **Replace** or **Replace all**. The buttons
turn off while the change saves (and Replace all stays off once nothing is left to match), and
the browser moved focus off a disabled button, so Esc no longer closed the bar. Focus now goes
back to the button, or to the search box when the button stays off.

Docs: a **Spreadsheet mode** page in the
[live examples](https://eboye.github.io/eboye-vue-grid/#/spreadsheet): a budget you edit like a
sheet (typing, paste, the fill handle, find and replace, Delete and cut, undo), with a Total
column worked out from the months, totals, the status bar and an Excel download.

## 0.17.0 — 2026-11-25

**Delete and cut** (`rangeSelectionFeature` with `editingFeature`): Delete or Backspace clear the
selected range (else the selected cell), each editable cell to its column's empty value (blank
text; no number, date or choice; an unticked checkbox). Ctrl/⌘+X copies the cells, as Ctrl/⌘+C
does, then clears them, so cut and paste moves cells. Read-only cells and a `validate` that wants
a value keep a cell as it is. Each change is a `cell-edit` (`source: 'clear'` / `'cut'`) and a
`save-cell`; the new `cells-clear` event reports the lot, and one Ctrl/⌘+Z undoes it. In an open
editor the keys edit its text as before. New: `grid.clearRange()`, `grid.cutRange()`, part
`clearShortcut`. The range selection feature grows by 0.3 kB gzipped; a plain grid stays at
16.0 kB.

**Fix:** copying a range (Ctrl/⌘+C) where the browser refuses the Clipboard API (pages on plain
http, headless Chromium) copies through a hidden text area that takes focus for a moment; focus
coming back to the cell was taken as a click and dropped the range. The range now stays.

## 0.16.0 — 2026-11-25

**Find and replace** (`rangeSelectionFeature`; replacing with `editingFeature`): Ctrl/⌘+F with focus
in the grid opens a find bar in its top corner (outside the grid the browser's find stays),
Ctrl/⌘+H with the replace row. It searches what the cells show (`€1,200.00`, `05/23/2026`), with
Match case and Whole cell, in the selected range if there was one ("In selection"), else every
cell, rows virtual scrolling hasn't drawn included. Matches are highlighted; Enter / Shift+Enter go
to the next / previous (scrolled into view; "3 of 12" is announced), Esc closes the bar and
leaves the current match selected. Replace changes the current match and moves on, Replace all
every match: the new text is read as each column's kind like a paste (read-only and invalid
cells skipped), each change is a `cell-edit` with `source: 'replace'` and a `save-cell`, the new
`cells-replace` event reports it, and one Ctrl/⌘+Z undoes a Replace all. Keys typed while the
bar opens go into its search box. New: `grid.openFind({ replace, text })` / `closeFind()`,
`openFind` in the `#toolbar` slot, part `findShortcut`, colour tokens `--vg-color-find`,
`--vg-color-find-current`, `--vg-color-find-border`, and 13 messages (`find`, `replaceWith`,
`matchCase`, `wholeCell`, `inSelection`, `findNext`, `findPrevious`, `showReplace`, `replace`,
`replaceAll`, `findCount`, `noMatches`, `replacedCount`), in every language pack. The bar is its
own chunk (2.9 kB gzipped), loaded while the browser is idle once range selection is on; the range selection feature grows by 1.0 kB, a plain grid by 0.2 kB (to 16.0).

**Fixes:** virtual scrolling with something below the grid that changes its height (the status
bar appearing) caused a "ResizeObserver loop" error in Safari / WebKit; the new height now applies
on the next frame. `grid.scrollToRow()` no longer throws where `scrollIntoView` is missing (jsdom).

## 0.15.0 — 2026-11-25

**Fill handle** (`rangeSelectionFeature` with `editingFeature`): the selection's last cell
has a small square; drag it down, up or sideways and the cells it passes over are filled, as in a
spreadsheet. One value repeats, two or more numbers a steady step apart go on (`1, 2` → `3, 4`,
without float noise), dates go on by their step in days (one date alone: day by day, in the type
the cell had), anything else repeats as a pattern. A dashed preview shows the cells it will fill,
and the grid scrolls at its edges. Ctrl/⌘+D fills the selected range down from its top row.
Values go through the same checks as a paste (read-only and invalid cells are skipped); each
change is a `cell-edit` with `source: 'fill'` and a `save-cell`, the new `cells-fill` event
reports the lot, and one Ctrl/⌘+Z undoes the whole fill. New: `grid.fillDown()`, part
`fillHandle`. The handle is drawn with CSS (no extra elements in the cells). The range selection feature grows by 0.9 kB gzipped; a plain grid stays at 15.8 kB.

## 0.14.0 — 2026-11-25

**Undo and redo** (`editingFeature`): Ctrl/⌘+Z undoes the last change made in the grid, an edit,
a checkbox flip or a whole paste (one step, however many cells); Ctrl+Y or Ctrl/⌘+Shift+Z redoes
it. Inside an open editor the keys stay the text box's own. Undoing works like editing: each cell
gets its value back through `cell-edit` and `save-cell`, so the app stays in charge of its data;
`cell-edit` now says what made a change (`source: 'edit' | 'paste' | 'undo' | 'redo'`). A cell
changed since by something else (a live update) is left alone rather than overwritten, only
changes that saved are remembered, and a change whose undo fails to save stays undoable. The
undone cells are selected (range selection) or focused. New: `undo-limit` (default 100; `0`
turns undo off), `grid.undo()` / `redo()` / `canUndo()` / `canRedo()` / `clearHistory()`,
`undo`, `redo`, `canUndo`, `canRedo` in the `#toolbar` slot, part `undoShortcut`. The editing feature grows by 0.9 kB gzipped, a plain grid by 0.2 kB (to 15.8).

## 0.13.1 — 2026-11-25

**Fix:** an open cell editor showed two outlines in apps with a global `:focus-visible` style: the
cell's accent outline and the app's focus ring on the input inside it (unlayered app CSS beats the
grid's `@layer`). The editor's input and select now draw no ring of their own; the cell's outline
marks the edit.

## 0.13.0 — 2026-11-25

**Paste into a range** (`rangeSelectionFeature` with `editingFeature`): Ctrl/⌘+V pastes
tab-separated text, what Excel, Sheets or the grid copy, into the `editable` cells from the
range's top-left cell (or the clicked cell). One value fills the whole range, as does any block
the range is a whole number of times; else the block lands as it is, clipped at the grid's edges,
and becomes the range. Each text is read as its column's kind, like the editors do: numbers in any
locale and with currency signs (`€1,234.50`, `1.234,50`, `(12)`), dates in ISO or the locale's
order with an optional time (keeping the cell's type), yes / no (also in the grid's words), a
select's choices by value or label; `validate` and `editorOptions.min` / `max` apply. Every
changed cell is a `cell-edit` and goes through `save-cell`, as with typing; then the new
`cells-paste({ edits, skipped, failed })` event reports the lot: what changed, the cells left
alone (`read-only`, `invalid` with a message, `unsupported` for custom editor components) and the
saves that failed. Works in every engine without a clipboard permission (the browser's own paste
is caught). While an editor is open, Ctrl/⌘+V pastes into it as before. New: `grid.pasteText(text)`,
types `CellsPasteEvent` and `PasteSkip`, part `pasteShortcut`. The code that reads pasted text (1.8 kB gzipped) loads on the first paste; the editing and range features grow by 0.5 and 0.7 kB, a plain grid by 0.1 kB.

## 0.12.0 — 2026-11-25

**Cell-range selection** (`rangeSelectionFeature`, opt-in, with `range-selection`): select a
block of cells as in a spreadsheet. Drag across cells (past an edge the grid scrolls and the block
follows), Shift+click to stretch it from the last clicked cell, Shift+arrows from the focused cell
(with `keyboardNavigationFeature`), Ctrl/⌘+A for every cell, Esc to clear; a plain click is one cell
again, and touch drags still scroll. Ctrl/⌘+C copies it as tab-separated text as the cells show it
(`exportValue` wins), so it pastes into Excel or Sheets as cells, and the grid emits `copy` with
`kind: 'range'`. `v-model:range` holds its corners (`{ start, end }`, each `{ rowKey, columnKey }`),
so it follows sorting and filtering, spans rows virtual scrolling hasn't drawn, and covers expanded
child rows (not group or pinned rows). With `statusBarFeature` the bar shows its size and the sum and
average of its numbers (formatted like the cells when they come from one column; `#status-bar` gets
`range`). Cells in it are tinted and outlined (`--vg-color-range`, `--vg-color-range-border`) and
carry `aria-selected`. It works next to row selection. Methods `selectRange(range)`,
`getRangeValues()`, `copyRange()`; types `CellRange`, `CellRef`, `StatusBarRange`; message
`cellCount` (in every language pack). The feature adds 2.3 kB gzipped to a grid that uses it; a
plain grid grows by 0.2 kB (to 15.5).

## 0.11.0 — 2026-11-25

**Language packs**: ready-made, complete translations of every built-in text, each its own import
and bundled only when imported (about 2 kB gzipped): `@nocopypaste/vue-grid/locales/de` (`de`),
`/fr` (`fr`), `/es` (`es`), `/sr` (`sr`, Serbian Cyrillic), `/sr-Latn` (`srLatn`), and `/en`
(`en`, the built-in English written out, as a template). Use one as `messages` app-wide
(`createVueGrid({ messages: de })`) or per grid, and spread it to change a few texts
(`{ ...de, total: 'Gesamt' }`). Counts follow each language's plural rules (`Intl.PluralRules`:
`1 red`, `2 reda`, `5 redova`). Texts that take a count now also get the number, for plurals:
`rowCount(shown, total, count, totalCount)`, `selectedCount(count, all, amount)`, and
`sortPosition(position, dir, count)` gets the number of sort keys (it couldn't say “of 3” before).
The new arguments come last, so existing functions keep working.

## 0.10.0 — 2026-11-25

**Inline cell editing** (`editingFeature`, opt-in): mark columns `editable` (or `(row) => boolean`).
A cell opens its editor on double-click, on Enter or F2 when focused, or when you start typing on
it (the keys replace the value, even typed before the editor has loaded). Enter saves, Tab /
Shift+Tab save and edit the next / previous editable cell (a checkbox cell only takes focus), Esc
cancels, clicking elsewhere saves. The editor follows the renderer: number (money, numbers),
date, date and time, a select of the column's values (status, chip), a checkbox that flips at
once, else text; `editor` picks another or your own component (`CellEditorProps`), `editorOptions`
sets a select's choices, a number's `min` / `max`, a placeholder. `validate(value, row)` returns a
message to keep the editor open with it, shown below the cell (and as the input's description);
numbers are checked too. The grid emits `cell-edit({ row, rowKey, column, value, oldValue })` and
never writes the value; `save-cell` may return a Promise: the cell shows it saving, and a rejection
keeps the editor open with the error. The cell keeps its width while editing. `startEdit(rowKey,
columnKey)` / `stopEdit(cancel?)` from code. New exports: `editingFeature` (also in
`allFeatures`), `setCellValue(row, column, value)`, types `CellEditEvent`, `CellEditorProps`,
`EditorName`, `EditorOptions`, `EditorOption`; messages `editCell`, `editNotANumber`,
`editOutOfRange`, `editSaveFailed`, `editSaving`. The editor (3.0 kB gzip) loads on demand, while
the browser is idle, once a grid has an editable column. A plain grid grows by 0.3 kB gzip (to 15.3),
a grid with editing is 17.0 kB plus the editor's chunk.

## 0.9.0 — 2026-11-24

**Multi-column sort** (`sortingFeature`): with `multi-sort`, Shift-click a header (Shift+Enter on
a focused one) to sort by it after the others: ascending, descending, then removed; a plain click
still sorts by that column alone. `v-model:sorts` holds every key (`sort` stays the first, and
setting it from outside makes it the only one). Headers show each column's number; `aria-sort` stays
on the first key and screen readers hear “sorted 2 of 3, descending” for the others. The header
menu gains **Then sort ascending / descending**, and its Clear sort drops only that column. A
`dataSource` gets every key in `query.sorts` (only with `multi-sort`). Row groups follow their own
column's key wherever it is in the list. New exports: `sortRowsBy(rows, keys)`, `nextSorts(sorts,
key)`, `type SortKey`; `GridQuery.sorts`; messages `thenSortAscending`, `thenSortDescending`,
`sortPosition(position, dir)`. The logic lives in `sortingFeature`: a plain grid grows by 0.2 kB
gzip (to 15.0), a grid with sorting by 0.9 kB (to 16.0).

## 0.8.0 — 2026-11-24

**Server-side row grouping** (`serverGroupingFeature`, with `rowGroupingFeature` and
`serverDataFeature`): a grouped grid with a `data-source` asks the server for groups instead of
grouping only the rows it has loaded. The query gains `groupBy` and `groupPath`; the source
answers with `groups: [{ value, count, aggregates }]` (or `rows` at the last level). Only the
top-level groups load first; expanding a group loads its sub-groups or rows, once, with the
loading row and error / Retry of lazy sub-grids. `pagination` pages the top-level groups;
`rowTotal` feeds the status bar. A group's checkbox selects it by query, without loading its
rows (`v-model:selected-groups`, paths like `[[{ key: 'status', value: 'Won' }]]`); rows inside
show ticked and locked, the header checkbox selects every top-level group, and the selected groups
end with a new filter or grouping. Exports cover the loaded rows. Works with virtual scrolling and
keyboard navigation. New exported types `GroupPath`, `ServerGroup`; group rows gain `count` and
`path`; `DataSourceResult` gains `groups` and `rowTotal` (`rows` is optional). Without the
feature, grouped server grids work as before, with a dev hint. Grids without it grow by 0.3 kB
gzip (the `selected-groups` model and the grouped query), grids with row grouping by 0.6 kB more.

Docs: the bundle sizes are measured again. 0.7.0's table was not updated for its own changes:
a plain grid was 14.5 kB gzip there, not 14.1 (now 14.8).

## 0.7.0 — 2026-11-24

**Text and parts are configurable.** `messages` (`GridMessages`) replaces any built-in text: menus,
filters, the pager, the status bar, notices, screen-reader labels and renderer buttons, 112
keys, functions where a value goes in (`groupBy(column)`, `rowCount(shown, total)`…). `parts`
(`GridParts`) leaves out pieces a feature adds: the progress bar, the load-error notice, Retry
buttons, the no-match Clear button, the select-all checkbox and banner, filter funnels, resize
grips, header dragging, Ctrl/⌘+C and group counts. Both are app-wide in `createVueGrid` or per
grid, the grid's own winning. New slots replace parts: `#load-error`, `#no-match`,
`#select-all-banner`. `pagination` takes `{ siblings, summary, firstLast }` too (`PaginationOptions`;
`<VGridPagination first-last>`), and the status bar `{ rows, selected, filters, clear }` flags.
`empty-text`, `no-match-text` and `totals-label` now default to `messages`, then English; the
standalone components' label props to `messages` too. New exported types `GridMessages`,
`GridParts`, `PaginationOptions`.

**Printing** (export feature): `grid.print()` prints the rows as a table from a hidden frame,
through the browser's print dialog: every row that passes the filters, sorted, on every page (a
virtual grid included, which only has the rows in view on screen), as the cells show them. The
header repeats on each printed page, numbers are right-aligned as in the grid, and the totals
print once, in bold, after the last row. Options: the export ones (`rows`, `columns`, `header`,
`totals`, `children`) plus `title` and `landscape`. It resolves when printing is over. The
printing code loads on first use (1.1 kB gzip); the export feature grows by 0.2 kB gzip. New
exported type `PrintOptions`.

## 0.6.0 — 2026-11-24

**Excel export** (export feature): `grid.exportXlsx()` downloads the rows as an `.xlsx` workbook
and `grid.getXlsx()` resolves to it as a `Blob`. They take the CSV options (which rows, columns,
raw or formatted values, header, totals, sub-grid rows) plus `sheetName`. Cells are typed:
numbers, booleans and dates stay what they are, so the sheet can sum and sort them, with number
formats from the columns' renderers (money `#,##0.00`, percentages, `yyyy-mm-dd` dates and date-
times in the grid's time zone). The header is bold and frozen, the totals line bold, and column
widths follow the content. Text is never written as a formula. The writer has no dependencies and
loads the first time you export (2.9 kB gzip); the export feature itself grows by 0.3 kB gzip.
`toXlsx(rows, columns)` writes a workbook without a grid. New exported types `XlsxExportOptions`,
`ToXlsxOptions`, `XlsxFormat`.

## 0.5.0 — 2026-11-24

**Status bar** (`statusBarFeature`): `status-bar` adds a bar under the grid with the rows that pass
the filters (`84 of 200 rows`, or the server's `total`), the selected rows, and the active filters
with a Clear button. `{ summary: ['stake'] }` adds, like a spreadsheet, the sum and average of
those columns over the selected rows (`aggregates` picks sum, average, min, max), formatted like
the column's cells; selected child rows count too. The `#status-bar` slot replaces the content
(`rowCount`, `totalRowCount`, `selectedCount`, `allSelected`, `filterCount`, `summary`,
`clearFilters`). Its component loads on demand; a grid without the feature grows by 0.1 kB gzip.
New exported types `StatusBarOptions`, `StatusBarScope`, `StatusBarSummary`, `StatusBarAggregate`.

Docs: the bundle sizes in the READMEs are measured again (a plain grid is 14.0 kB gzip; the
numbers had last been taken at 0.3.0).

## 0.4.3 — 2026-11-24

**Server data: a failed request no longer leaves the old rows looking current.** When a
`dataSource` request failed while rows were on screen, the grid kept them and emitted
`load-error`, but showed nothing, so the rows looked up to date (the _Couldn't load the rows_ /
_Retry_ message only appeared with no rows to show). Now a notice above the grid says _Couldn't
load the rows. These are from before._ with a _Retry_ button (`.vg-load-error-banner`,
`role="alert"`, themed like the selection banner in the danger tone). The next request, a retry or
a new sort, filter or page, clears it.

## 0.4.2 — 2026-11-24

**Fix: theme colours in production builds that rewrite `light-dark()`.** Lightning CSS (the CSS
minifier of Vite 8, and others) rewrites `light-dark()` for older browser targets into variables
that only a `color-scheme` rule in the app's CSS defines. In an app without one, every grid colour
became invalid in the production build (the dev server was fine): text fell back to black, and
backgrounds, borders and badges lost their colours. The theme now defaults those variables to
light, in their own cascade layer, so a `color-scheme` rule in the app's CSS still wins. A browser
test builds an app with Vite's defaults and checks the colours with no `color-scheme`, with `dark`,
and with `light dark` following the OS. Docs: set `color-scheme` in a stylesheet for a theme
switch, not inline from JavaScript, or target browsers with native `light-dark()`.

Docs: **live examples** at <https://eboye.github.io/eboye-vue-grid/>, a page per feature (renderers,
filtering, server data, selection, row grouping, totals, sub-grids, virtual scrolling, column
layout, menus, export, theming, custom cells), each running live with its complete source, in light
and dark. Linked from the READMEs, AGENTS.md, llms.txt and the Claude Code skill.

## 0.4.1 — 2026-11-24

**Accessibility**, found by a new axe-core check (WCAG 2.1 A / AA) of every story, light and dark,
now run in CI:

- The column resize grip (a focusable `separator`) announces the column's width
  (`aria-valuenow`, `aria-valuetext`).
- Nested sub-grids no longer put a `rowgroup` inside a `rowgroup`.
- Rows carry `aria-expanded` only in a `treegrid`; in a plain grid or table the expander button
  already does, and on a row it isn't valid ARIA.
- A `toggle-text` button with no text is named after its column.
- Soft status badges (`status`, `details`) and the group row count meet the 4.5:1 contrast
  ratio: the tone text is a little darker (light) or lighter (dark).

## 0.4.0 — 2026-11-24

**Pinned columns on phones** (column pinning feature): while the pinned columns together would
take more than half of the grid's width (a phone, a narrow side panel), they scroll like the
others, so the rest of the row stays readable; they pin again once the grid is wide enough. The
pins stay in the column state and the header menu. `pinned-max-share` sets the share (default
`0.5`); `false` keeps the old behaviour, always pinned. The grid has the `vg-pins-dropped` class
meanwhile.

## 0.3.2 — 2026-11-24

Row grouping fixes:

- **Keyboard:** ↑ / ↓ / PageUp / PageDown move by column, not by cell index, and keep their
  column across a group row whose label spans several columns. Before, ↑ from Stake onto a group
  row could land on another column's aggregate.
- **Narrow first column:** the label used to give its room to the column name, leaving the value
  invisible ("City 27" on every group). Now, under 12rem, the column name is dropped and the value
  ellipsized; the count stays, and the whole label is the cell's tooltip. The label no longer
  widens a narrow first column.

Docs: every renderer option (141) and every field of the public types (event payloads, menu
items, `createVueGrid` config, sort and pinned-row state) now has a description, in the editor's
hover help, the API reference, the JSON Schema and the MCP server's tools; a test keeps it that
way. New exported type `SignedNumberOptions` (the `signed-number` renderer's options).

## 0.3.1 — 2026-11-24

Releases are published from GitHub Actions with npm trusted publishing, so every version from
now on carries npm provenance (a signed link to the commit and workflow that built it). CI runs
the unit tests and the browser tests in Chromium, Firefox and WebKit on every push.

Fix (Safari): an open menu (row actions, cell and header menus) now hides when its trigger is
scrolled out of the grid. WebKit accepts CSS `position-visibility: anchor-visible` but didn't hide
it there; the grid's JavaScript fallback now always runs next to the CSS.

## 0.3.0 — 2026-11-24

**Row grouping** (`rowGroupingFeature`): `v-model:group-by` groups the rows by one or more
columns into collapsible group rows with the value (in the column's renderer, or the
`#group-<key>` slot), the row count and each column's `aggregate` for the group. Groups follow
filters and sorting, page as a unit, work with virtual scrolling, and select their rows from a
group checkbox. Columns with `groupable: true` get Group by / Ungroup in the header menu;
`groupValue` groups by a derived value (a month, a range); `groups-expanded` opens every group;
`expandAll()` / `collapseAll()` include groups. `validateGridConfig()` checks `group-by` keys.
`groupRows()` and `isRowGroup()` are exported.

**CSV export and copy** (`exportFeature`): `grid.exportCsv()` downloads the filtered, sorted
rows as CSV (UTF-8 with a BOM), `grid.getCsv()` returns the text, `grid.copyRows()` copies rows as
tab-separated text that pastes as cells into spreadsheets, and Ctrl/⌘+C copies the selected rows,
else the focused cell, as displayed (`copy` event). Options pick the rows (`filtered`, `all`,
`page`, `selected`, plus sub-grid `children`), columns, raw or formatted values, header, totals and
delimiter. Fields are quoted per RFC 4180 and formula-like text is guarded. New column options
`exportValue` and `exportable`; `toCsv()` writes CSV without a grid.

**Selection for batch actions**: shift-click a row checkbox (or Shift+Space) to select a range in
display order; the `#toolbar` slot gets `selected`, `selectedCount`, `selectAllMatching` and
`clearSelection()` for a batch-action bar; `grid.clearSelection()`; `prune-selection` drops keys
whose rows left the data; with server data, a banner offers "Select all N rows" once the page is
selected (`v-model:select-all-matching`), ending when the filters change or a row is unticked.

Renderers: number, signed number, currency, change, date, date-time, boolean, status, chip and
list now have a plain-text `format` (what copying shows); a renderer's `format` also receives the
row.

Copying (the text cell's copy button too) falls back to the browser's copy command where the
Clipboard API is missing or refused, e.g. on pages served over plain http.

Bundle: virtual scrolling and export no longer pull in the row grouping code; the README's
bundle sizes are now measured with Rolldown (Vite's bundler), counting every chunk an app loads up
front (a plain grid: 13.6 kB gzip).

Docs: the generated API reference no longer inserts stray `;` into multi-line column option
descriptions.

## 0.2.0 — first public release

`<VGrid>`: a Vue 3 data grid laid out with CSS Grid, nested rows in real `subgrid`. A plain grid
is a read-only table (13.2 kB gzip); everything else is opt-in.

**Features** (each a tree-shakeable import, per grid or app-wide):
sorting · filtering (typed column filters, filter row with shorthand, quick search, value lists,
persistence) · server data (`dataSource` with cancellation, loading / error / retry) ·
pagination · selection (multi, single, cascading) · sub-grids (sync and lazy children) ·
context and header menus · column reordering, pinning, resizing, visibility and groups ·
**pinned rows** (`v-model:pinned-rows`, `pinRow()`, extra rows) · **totals row** (column
`aggregate`: sum, avg, min, max, count or a function) · virtual scrolling (sub-grids and detail
rows included) · keyboard navigation (ARIA grid / treegrid).

**29 cell renderers**, typed options: text, numbers, currency, change, dates, boolean, status,
chip, icon, link, multi-line, list, image, code, JSON, JSON tree, details, buttons, menus, copy,
edit, toggles, checkbox, switch, radio. Write your own with `defineCellRenderer`.

**Phones, tablets and touch**: the grid scrolls inside its own frame at any width; swipe to
scroll, hold a header to drag it, hold a header or cell for its menu (iOS included); no iOS input
zoom, no sticky tap tints. Checked in Chromium, Firefox and WebKit.

**Performance**: virtual layout with per-level prefix sums, own scroll anchoring, cell-level
partial updates, a GPU-composited change highlight, minified CSS.

**For coding agents**: `AGENTS.md`, `llms.txt` / `llms-full.txt`, an API reference generated
from the sources (`agent/api.md`, `agent/api.json`), a JSON Schema of a grid config, and
`validateGridConfig()` from `@nocopypaste/vue-grid/agent`. Companion packages: the
`@nocopypaste/vue-grid-mcp` MCP server and a Claude Code plugin (`plugins/vue-grid`).
