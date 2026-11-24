# Changelog

## Unreleased

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
