# Changelog

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
