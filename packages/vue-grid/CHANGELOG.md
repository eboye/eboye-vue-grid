# Changelog

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
