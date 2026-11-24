# @nocopypaste/vue-grid

A data grid for Vue 3 built on **CSS Grid** — with real `subgrid` sub-rows, pinned columns, column
reorder/visibility with persistence, selection, virtual scrolling, pagination, a pluggable
**cell-renderer registry** for 3rd-party addons, and a theme you customise with **CSS variables**.

- Vue `^3.5` peer dependency, zero runtime dependencies, fully typed (`<VGrid generic="T">`).
- Plain CSS in `@layer vue-grid` — your CSS / Tailwind utilities override it without `!important`.
  Published minified (Lightning CSS, no transpiling).
- Built for big data: virtual scrolling with sub-grids and detail rows, cell-level partial updates,
  a GPU-animated change highlight — see [Performance](#performance).
- Safe with untrusted row data: no `v-html` / `innerHTML` anywhere. Link renderers allow only
  http(s), mailto and tel, and URLs are checked after the cleanup browsers apply (so `java\tscript:`
  is caught). Value maps ignore inherited keys, and saved state is validated.

**New here? Start with the [examples cookbook](../../docs/examples.md)** — runnable snippets for every
feature. This README is the API reference.

## Install

```sh
npm i @nocopypaste/vue-grid
```

The package is built for a bundler (Vite, webpack, Rollup, esbuild, or a framework built on one),
like Vue's own `esm-bundler` build. Dev-only warnings are wrapped in
`process.env.NODE_ENV !== 'production'`, which the bundler replaces, so they disappear from
production builds. Loading the files straight in a browser (an import map or CDN `<script>`, no
build step) throws `process is not defined`. If you must do that, define it first:
`<script>window.process = { env: { NODE_ENV: 'production' } }</script>`.

```ts
// main.ts
import { createApp } from 'vue'
import { createVueGrid } from '@nocopypaste/vue-grid'
import '@nocopypaste/vue-grid/style.css'

createApp(App)
  .use(createVueGrid({ locale: 'en-US', currency: 'EUR' })) // optional: app-wide defaults
  .mount('#app')
```

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  VGrid,
  createColumnHelper,
  currencyRenderer,
  dateTimeRenderer,
  numberRenderer,
  columnPinningFeature,
  sortingFeature,
  statusRenderer,
  type SortState,
} from '@nocopypaste/vue-grid'

interface Order {
  id: number
  customer: { name: string }
  total: number
  status: 'Paid' | 'Open'
  placedAt: string
}

const rows = ref<Order[]>([/* … */])
const sort = ref<SortState | null>(null)

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'id', header: '#', renderer: numberRenderer, width: 'min-content', pinned: 'left' }),
  col({
    key: 'customer',
    header: 'Customer',
    field: 'customer.name',
    sortable: true,
    width: 'minmax(10rem, 1fr)',
  }),
  col({ key: 'total', header: 'Total', renderer: currencyRenderer, sortable: true }),
  col({
    key: 'status',
    header: 'Status',
    renderer: statusRenderer,
    rendererOptions: { tone: { Paid: 'success', Open: 'info' } },
  }),
  col({ key: 'placedAt', header: 'Placed', renderer: dateTimeRenderer }),
]
</script>

<template>
  <VGrid
    v-model:sort="sort"
    :rows="rows"
    :columns="columns"
    row-key="id"
    :features="[sortingFeature, columnPinningFeature]"
    sort-mode="client"
    style="height: 480px"
  />
</template>
```

`createColumnHelper<T>()` is optional; it types each column's `rendererOptions` from its renderer.

## Features: everything optional

Out of the box `<VGrid>` is a plain, read-only table: columns with any renderer and any width,
saved column state (`storage`), detail rows, tabbable controls and theming. Everything else is
an opt-in feature:

| Feature                     | Turns on                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sortingFeature`            | Sort buttons on `sortable` headers, the header menu's sort items, `sort-mode="client"` sorting                                                                                                                                                                                                                                          |
| `filteringFeature`          | Funnels on `filterable` headers, `filter-row`, `<VGridSearch>`, `v-model:filters`, `filter-storage`, the header menu's filter items                                                                                                                                                                                                     |
| `serverDataFeature`         | `data-source`: the grid fetches sorted, filtered pages itself                                                                                                                                                                                                                                                                           |
| `paginationFeature`         | `pagination` and `v-model:page` / `v-model:page-size` (the standalone `<VGridPagination>` doesn't need it)                                                                                                                                                                                                                              |
| `selectionFeature`          | `selectable` (multi or single), `v-model:selected`, `selection-mode`, `is-row-selectable`, select-all, Space to select, shift-click / Shift+Space ranges, `prune-selection`, the selection in `#toolbar` for batch actions, "select all N matching rows" with server data (`v-model:select-all-matching`)                               |
| `subGridsFeature`           | `sub-rows` / `load-sub-rows` / `has-sub-rows`: nested rows in a CSS `subgrid` (detail rows don't need it)                                                                                                                                                                                                                               |
| `menusFeature`              | The header right-click menu (`header-menu`) and body-cell menus (`context-menu`); without it the browser's menu shows. The standalone `<VGridMenu>` and the `actions-menu` renderer don't need it                                                                                                                                       |
| `columnReorderFeature`      | Dragging headers to reorder (mouse and pen; on touch, hold the header first), Alt+←/→ on a header, the header menu's Move items                                                                                                                                                                                                         |
| `columnPinningFeature`      | Sticky `pinned: 'left' \| 'right'` columns with edge shadows, the header menu's Pin items; while they'd take more than `pinned-max-share` of the grid (half), they scroll like the others; without it pins are ignored                                                                                                                  |
| `virtualScrollingFeature`   | `virtual: { rowHeight, overscan?, detailHeight? }`: only the rows in view render, sub-grids and detail rows included; without it every row renders                                                                                                                                                                                      |
| `columnVisibilityFeature`   | `hidden: true` columns, `columnState.hidden`, the header menu's Hide column item; without it every column shows                                                                                                                                                                                                                         |
| `keyboardNavigationFeature` | The ARIA grid pattern: one Tab stop, arrow keys / Home / End / PageUp / PageDown between cells, Enter, Space to select, →/← to expand, Alt+←/→ to move a column. Without it the grid is an ARIA `table` with its controls in the Tab order                                                                                              |
| `columnResizingFeature`     | Drag a header edge to resize (mouse, pen, touch), double-click it to fit the content, ←/→ on the focused edge (Alt+Shift+←/→ on a header with keyboard navigation); `minWidth` / `maxWidth` bound it, `resizable: false` opts out; widths in `columnState.widths`, persisted with `storage`; Fit width / Reset width in the header menu |
| `columnGroupsFeature`       | Grouped column headers: columns with the same `group` share a header cell in a sticky row above theirs; groups follow reordering, hiding, resizing and pinning (a pin boundary splits a group)                                                                                                                                          |
| `rowPinningFeature`         | `v-model:pinned-rows` / `pinRow()`: rows that stay in view above or below the body, plus `pinned-top-rows` / `pinned-bottom-rows` for rows that aren't in the data                                                                                                                                                                      |
| `aggregationFeature`        | Column `aggregate` (`sum`, `avg`, `min`, `max`, `count`, a function) and `totals`: a sticky totals row over the filtered rows                                                                                                                                                                                                           |
| `rowGroupingFeature`        | `v-model:group-by`: rows grouped by one or more columns into collapsible group rows with the value, row count and aggregates; Group by / Ungroup in the header menu for `groupable` columns                                                                                                                                             |
| `exportFeature`             | `exportCsv()` / `getCsv()` / `copyRows()`, Ctrl/⌘+C for the selected rows or the focused cell, the `copy` event; column `exportValue` / `exportable`                                                                                                                                                                                    |

```ts
// per grid
<VGrid :features="[sortingFeature, filteringFeature]" … />

// or for every grid in the app (merged with each grid's own list)
app.use(createVueGrid({ features: [sortingFeature, filteringFeature] }))
app.use(createVueGrid({ features: allFeatures }))   // all of them
```

Only the features you import reach your bundle. Without its feature, an option does nothing:
a `sortable` column is a plain header and `data-source` is never called. In development a warning
names the feature to add. A grid reads `features` once, when it is created; to change them,
re-create it (for example with a `:key`).

## Tree-shaking: import only what you use

The package is ESM, one file per module, with `sideEffects` limited to CSS — bundlers keep only
what you import.

- **Features are opt-in** (see above).
- **Renderers are opt-in.** `<VGrid>` bundles just the default `text` renderer. Use others either
  - **per column** (recommended, smallest bundle, typed options): `renderer: currencyRenderer`, or
  - **by name**, after registering them: `createVueGrid({ renderers: [currencyRenderer, statusRenderer] })`
    or `<VGrid :renderers="[…]">`, then `renderer: 'currency'`. `allRenderers` registers every built-in.
    An unregistered name renders as plain text and logs a dev warning saying how to register it.
- **Components and helpers** (`VGridPagination`, `VGridColumnMenu`, `VGridMenu`, `sortRows`, …) are
  only bundled when imported.
- **CSS**: `@nocopypaste/vue-grid/style.css` has everything. Pick parts instead:

  | File            | What                                                                                                                                    | gzip   |
  | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
  | `base.css`      | Structure only: grid layout, subgrid, sticky header and pins, tree indent, popover placement, virtual rows, pinned rows, truncation     | 2.2 kB |
  | `theme.css`     | The default look on top of `base.css`: `--vg-*` tokens, colours, dark mode, densities, spacing, borders, typography, shadows, animation | 3.3 kB |
  | `core.css`      | `base.css` + `theme.css`                                                                                                                | 5.1 kB |
  | `renderers.css` | Styles for the cell renderers (other than text); uses the theme's tokens                                                                | 2.2 kB |
  | `style.css`     | All of the above                                                                                                                        | 6.6 kB |

  For a fully custom look, import only `base.css` (and `renderers.css` if you use renderers)
  and style the `.vg-*` classes yourself. See [Theming](#theming).

| Import (minified / gzip, Vue excluded)                                       | Initial chunk      |
| ---------------------------------------------------------------------------- | ------------------ |
| `VGrid` (no features)                                                        | 39.0 kB / 13.6 kB  |
| `VGrid` + `sortingFeature`                                                   | 39.8 kB / 13.9 kB  |
| `VGrid` + `filteringFeature`                                                 | 49.7 kB / 17.4 kB  |
| `VGrid` + `serverDataFeature`                                                | 40.4 kB / 14.2 kB  |
| `VGrid` + `paginationFeature`                                                | 39.2 kB / 13.7 kB  |
| `VGrid` + `selectionFeature`                                                 | 43.2 kB / 15.1 kB  |
| `VGrid` + `subGridsFeature`                                                  | 41.4 kB / 14.5 kB  |
| `VGrid` + `menusFeature`                                                     | 49.6 kB / 17.2 kB  |
| `VGrid` + `columnReorderFeature`                                             | 42.7 kB / 14.9 kB  |
| `VGrid` + `columnPinningFeature`                                             | 41.2 kB / 14.5 kB  |
| `VGrid` + `virtualScrollingFeature`                                          | 44.8 kB / 15.8 kB  |
| `VGrid` + `columnVisibilityFeature`                                          | 39.2 kB / 13.7 kB  |
| `VGrid` + `keyboardNavigationFeature`                                        | 41.5 kB / 14.5 kB  |
| `VGrid` + `columnResizingFeature`                                            | 41.8 kB / 14.7 kB  |
| `VGrid` + `columnGroupsFeature`                                              | 40.3 kB / 14.1 kB  |
| `VGrid` + `rowPinningFeature`                                                | 44.0 kB / 15.0 kB  |
| `VGrid` + `aggregationFeature`                                               | 44.2 kB / 15.1 kB  |
| `VGrid` + `rowGroupingFeature`                                               | 48.6 kB / 16.4 kB  |
| `VGrid` + `exportFeature`                                                    | 42.8 kB / 15.1 kB  |
| `VGrid` + `allFeatures` + `VGridSearch`                                      | 102.8 kB / 34.7 kB |
| `VGrid` + `currencyRenderer`                                                 | 40.4 kB / 14.1 kB  |
| `VGrid` + `VGridPagination` + `VGridColumnMenu`                              | 45.8 kB / 15.9 kB  |
| `sortRows` only                                                              | 0.7 kB / 0.4 kB    |
| `toCsv` only                                                                 | 1.1 kB / 0.6 kB    |
| everything                                                                   | 147.4 kB / 47.2 kB |
| `validateGridConfig` (`@nocopypaste/vue-grid/agent`, never in an app bundle) | 63.7 kB / 17.1 kB  |

With `filteringFeature`, the filter popover body and the filter-row editors are **on-demand
chunks**: they load the first time a popover opens or `filter-row` is on. With
`paginationFeature`, the pager is one too, and with `selectionFeature` the "select all N rows" banner.

Measured with Rolldown (the bundler in Vite) on tiny apps importing the published build:
minified, gzipped, Vue external, `process.env.NODE_ENV` set to `production` (which also drops the
dev warnings). "Initial" counts the entry and every chunk it loads up front; on-demand chunks are
left out. esbuild with `--splitting` tree-shakes the package too, but also loads the pager's and
the filter core's chunks (5.2 kB, 2.3 kB gzip) in a grid without those features: esbuild keeps
chunks that on-demand imports share with the entry, even when nothing uses them.

## `<VGrid>` API

### Props

| Prop                                 | Type                                                                                                                         | Default                                |                                                                                                                                                                                                                             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rows`                               | `T[]`                                                                                                                        | `[]`                                   | Your data objects, used as-is (never mutated). Not needed with `dataSource`.                                                                                                                                                |
| `features`                           | `GridFeature[]`                                                                                                              | —                                      | Opt-in features for this grid, added to the app-wide ones. See [Features](#features-everything-optional).                                                                                                                   |
| `dataSource`                         | `(query, { signal }) => Promise<{ rows, total? }>`                                                                           | —                                      | Server rows: the grid calls it whenever sort, filters or page change. Needs `serverDataFeature`. See [Server data](#server-data).                                                                                           |
| `columns`                            | `ColumnDef<T>[]`                                                                                                             | —                                      | See below.                                                                                                                                                                                                                  |
| `rowKey`                             | `keyof T \| (row) => string \| number`                                                                                       | —                                      | Stable unique id; all row state is keyed by it.                                                                                                                                                                             |
| `v-model:sort`                       | `{ key, dir: 'asc' \| 'desc' } \| null`                                                                                      | `null`                                 | Header click cycles asc → desc → none. Needs `sortingFeature` for the header UI.                                                                                                                                            |
| `sortMode`                           | `'controlled' \| 'client'`                                                                                                   | `'controlled'`                         | `controlled` only emits (server-side sorting). Ignored with `dataSource`.                                                                                                                                                   |
| `v-model:filters`                    | `FilterState \| null`                                                                                                        | `null`                                 | `{ columns: Record<key, ColumnFilter>, search }`. Needs `filteringFeature` (as do the next four). See [Filtering](#filtering).                                                                                              |
| `filterMode`                         | `'client' \| 'controlled'`                                                                                                   | `'client'`                             | `controlled` only emits (server-side filtering). Ignored with `dataSource`.                                                                                                                                                 |
| `filterRow`                          | `boolean`                                                                                                                    | `false`                                | A row of inline filter inputs under the headers.                                                                                                                                                                            |
| `filterStorage`                      | `string \| FilterStateStorage`                                                                                               | —                                      | Persist filters (`string` = localStorage key).                                                                                                                                                                              |
| `noMatchText`                        | `string`                                                                                                                     | `'No rows match the current filters.'` | Shown, with a _Clear filters_ button, when filters hide every row.                                                                                                                                                          |
| `pagination`                         | `boolean \| { pageSizes?: number[] }`                                                                                        | `false`                                | Built-in pagination bar: slices client rows, or asks the `dataSource` for pages. Needs `paginationFeature`.                                                                                                                 |
| `v-model:page` / `v-model:pageSize`  | `number`                                                                                                                     | `1` / `25`                             | Reset to page 1 when sort or filters change.                                                                                                                                                                                |
| `v-model:columnState`                | `{ order: string[]; hidden: string[]; pinned?: Record<string, "left" \| "right" \| null>; widths?: Record<string, string> }` | derived                                | Column order, visibility and runtime pins.                                                                                                                                                                                  |
| `storage`                            | `string \| ColumnStateStorage`                                                                                               | —                                      | Persist column state (`string` = localStorage key).                                                                                                                                                                         |
| `pinnedMaxShare`                     | `number \| false`                                                                                                            | `0.5`                                  | Pinned columns scroll like the others while together they'd take more than this share of the grid's width (a phone, a narrow panel), and pin again once there's room. `false`: always pinned. Needs `columnPinningFeature`. |
| `v-model:expanded`                   | `RowKey[]`                                                                                                                   | `[]`                                   | Expanded rows (sub-grids and detail rows).                                                                                                                                                                                  |
| `subRows`                            | `(row) => T[] \| undefined`                                                                                                  | —                                      | Synchronous children → sub-grid. Needs `subGridsFeature` (as do the next two).                                                                                                                                              |
| `loadSubRows`                        | `(row) => Promise<T[]>`                                                                                                      | —                                      | Lazy children (cached, loading/error/retry).                                                                                                                                                                                |
| `hasSubRows`                         | `(row) => boolean`                                                                                                           | —                                      | Which rows get an expander when lazy.                                                                                                                                                                                       |
| `rowExpandable`                      | `(row) => boolean`                                                                                                           | —                                      | Which rows can open the `#detail` slot.                                                                                                                                                                                     |
| `selectable`                         | `boolean \| 'single'`                                                                                                        | `false`                                | Adds a selection column. Needs `selectionFeature` (as do the next five). See [Selection and batch actions](#selection-and-batch-actions).                                                                                   |
| `v-model:selected`                   | `RowKey[]`                                                                                                                   | `[]`                                   |                                                                                                                                                                                                                             |
| `selectionMode`                      | `'cascade' \| 'independent'`                                                                                                 | `'cascade'`                            | Whether selecting a parent selects its children.                                                                                                                                                                            |
| `isRowSelectable`                    | `(row) => boolean`                                                                                                           | —                                      |                                                                                                                                                                                                                             |
| `pruneSelection`                     | `boolean`                                                                                                                    | `false`                                | Drop selected keys whose rows left the data (reload, delete, another server page).                                                                                                                                          |
| `v-model:selectAllMatching`          | `boolean`                                                                                                                    | `false`                                | Server data: every row matching the query is selected (from the banner).                                                                                                                                                    |
| `virtual`                            | `{ rowHeight: number; overscan?: number; detailHeight?: number } \| false`                                                   | `false`                                | Virtual scrolling (fixed-height rows; sub-grids and measured detail rows included). Needs `virtualScrollingFeature`.                                                                                                        |
| `v-model:pinnedRows`                 | `{ top?: RowKey[]; bottom?: RowKey[] } \| null`                                                                              | `null`                                 | Top-level rows pinned above / below the body. Needs `rowPinningFeature` (as do the next two). See [Pinned rows and totals](#pinned-rows-and-totals).                                                                        |
| `pinnedTopRows` / `pinnedBottomRows` | `T[]`                                                                                                                        | —                                      | Extra pinned rows that aren't part of `rows` (a target, last year's figures).                                                                                                                                               |
| `totals`                             | `boolean \| 'top' \| 'bottom'`                                                                                               | `false`                                | A totals row with each column's `aggregate`; `true` = `'bottom'`. Needs `aggregationFeature` (as do the next two).                                                                                                          |
| `totalsLabel`                        | `string`                                                                                                                     | `'Total'`                              | Shown in the totals row's first column (unless that column has an aggregate).                                                                                                                                               |
| `aggregates`                         | `Record<string, unknown>`                                                                                                    | —                                      | Totals by column key, used instead of computing them (e.g. from a server).                                                                                                                                                  |
| `v-model:groupBy`                    | `string[] \| string \| null`                                                                                                 | `null`                                 | Column keys to group the rows by, outermost first. Needs `rowGroupingFeature` (as does the next one). See [Row grouping](#row-grouping).                                                                                    |
| `groupsExpanded`                     | `boolean`                                                                                                                    | `false`                                | Groups start expanded.                                                                                                                                                                                                      |
| `rowClickable`                       | `boolean`                                                                                                                    | `false`                                | Pointer cursor; `row-click` is always emitted.                                                                                                                                                                              |
| `rowClass`                           | `(row, index) => ClassValue`                                                                                                 | —                                      |                                                                                                                                                                                                                             |
| `highlightedRows`                    | `RowKey[]`                                                                                                                   | —                                      |                                                                                                                                                                                                                             |
| `flash`                              | `boolean \| 'direction'`                                                                                                     | `false`                                | Briefly highlight cells whose value changes; `'direction'` = green up / red down. Columns override with `flash`.                                                                                                            |
| `renderers`                          | `CellRendererDefinition[]`                                                                                                   | —                                      | Renderers usable by name in this grid (override plugin ones).                                                                                                                                                               |
| `locale` / `currency` / `timeZone`   | `string`                                                                                                                     | plugin → browser                       | Formatting context for renderers.                                                                                                                                                                                           |
| `density`                            | `'compact' \| 'cozy' \| 'comfortable'`                                                                                       | `'cozy'`                               | Scales cell padding.                                                                                                                                                                                                        |
| `loading`                            | `boolean`                                                                                                                    | `false`                                | Progress bar + `aria-busy`.                                                                                                                                                                                                 |
| `emptyText`                          | `string`                                                                                                                     | `'No data to show.'`                   |                                                                                                                                                                                                                             |
| `ariaLabel`                          | `string`                                                                                                                     | —                                      |                                                                                                                                                                                                                             |
| `contextMenu`                        | `(ctx: { row, rowKey, column, value }) => MenuItem[] \| null`                                                                | —                                      | Right-click menu for body cells. Needs `menusFeature`.                                                                                                                                                                      |
| `headerMenu`                         | `boolean \| ({ column, items }) => MenuItem[] \| null`                                                                       | `true`                                 | Built-in header menu (sort, pin, move, hide, reset). Needs `menusFeature`.                                                                                                                                                  |
| `ui`                                 | `Partial<Record<'root' \| 'header' \| 'headerCell' \| 'row' \| 'cell' \| 'subgrid' \| 'detail' \| 'empty', ClassValue>>`     | —                                      | Extra classes per part (Tailwind-friendly).                                                                                                                                                                                 |

### Events

`row-click(row, event)` · `cell-click({ row, rowKey, column, value, event })` (columns with `clickable: true`) ·
`cell-action({ name, payload, row, rowKey, column })` (from renderers) · `sub-rows-error({ row, error })` · `context-action({ name, item, row, rowKey, column, value })` · `header-action({ name, item, column })` ·
`query-change(query: GridQuery)` (sort + filters + page as one object, on mount and on every real change) ·
`copy({ kind, text, rows, columns })` (rows or a cell were copied: `exportFeature`) ·
`load-error(error)` (a `dataSource` call failed) ·
plus the `update:*` events of every `v-model`.

Clicks on links, buttons and inputs inside a cell never trigger `row-click`.

### Slots

`cell-<key>` (`{ row, value, rowKey, rowIndex, depth, column }`) · `header-<key>` (`{ column }`) ·
`total-<key>` (`{ value, column, group? }`, a cell of the totals row or a group row) ·
`group-<key>` (`{ value, count, rows, column, group }`, the value of a group row) · `detail` (`{ row, rowKey, depth }`) ·
`toolbar` (`{ columns, columnState, setColumnState, filters, setFilters, clearFilters, activeFilterCount, selected, selectedCount, selectAllMatching, clearSelection }`) ·
`empty` · `loading` · `sub-rows-loading` (`{ row }`).

### Exposed methods

```ts
const grid = ref<VGridExposed>()
grid.value?.scrollToTop() / scrollToRow(key) / expandAll() / collapseAll() / setColumnState(state)
grid.value?.patchLoadedRows([{ id: 'c2', city: 'Niš' }]) // field updates for lazy children and dataSource rows
grid.value?.setFilters({ columns: { city: { type: 'text', op: 'contains', value: 'nis' } } })
grid.value?.clearFilters() / openFilter('city') / reload() // reload: re-run the dataSource query
grid.value?.clearSelection() // selectionFeature: clears the selection, "all matching" included
grid.value?.reloadSubRows('c2') // forget lazily loaded children (of one row, or all): they load again
grid.value?.pinRow(42, 'top') // pin a row above the body ('bottom' below it, null to unpin): rowPinningFeature
grid.value?.exportCsv({ filename: 'orders.csv' }) / getCsv() / copyRows() // exportFeature, see Export and copy
```

`reload()` also forgets lazily loaded children, as does passing a different `load-sub-rows`
function. With `selection-mode="cascade"`, children that load under a selected parent arrive
selected.

### Partial updates

Changing part of the data re-renders only what changed — the table is never rebuilt:

- **Reactive rows** (`reactive()` / `ref()`): assign the field — `row.city = 'Niš'` — and only that
  cell re-renders.
- **Immutable rows** (e.g. a `shallowRef` holding a large list): replace the changed rows and keep
  the others' identity. `patchRows(rows, patches, rowKey)` does exactly that for a batch of
  patches by key; only the patched rows re-render, and a batch that changes nothing returns the
  same array.
- **Lazily loaded children** live in the grid's cache: use `grid.patchLoadedRows(patches)`.

Mutating a field in place under a `shallowRef` is not observed — assign a new array (`patchRows`)
or use reactive rows.

**Change highlight.** `<VGrid flash>` briefly tints cells whose value changes (not on first render,
not when a re-fetched row has equal values); `flash="direction"` tints numbers green when they rise
and red when they fall. Columns override with `flash: false | true | 'direction'`. It's a CSS
animation — tune it with `--vg-flash-color`, `--vg-flash-up`, `--vg-flash-down`,
`--vg-flash-duration`. With `prefers-reduced-motion` the tint is held briefly instead of fading.
The tint is a `::after` layer under the cell's content that fades with `opacity`, which browsers
animate on the compositor (GPU): a busy live feed costs the main thread about a sixth of what a
`background-color` animation would.

### `ColumnDef<T>`

```ts
{
  key: string                    // unique; used by sort, column state and slot names
  header?: string; headerTooltip?: string
  field?: string                 // dot path, defaults to key
  value?: (row) => unknown       // computed value, wins over field
  renderer?: RendererDefinition | string | Component  // currencyRenderer (tree-shakeable), a registered name, or a component; default text
  rendererOptions?: object       // typed from the renderer
  width?: string                 // any grid track: 'auto' (default), '8rem', '1fr', 'minmax(8rem, 2fr)', 'min-content'
  minWidth?: string              // combined into minmax(minWidth, width); also the resize minimum
  maxWidth?: string              // resize maximum (columnResizingFeature)
  resizable?: boolean            // can the user resize it (columnResizingFeature, default true)
  group?: string                 // header group label (columnGroupsFeature)
  align?: 'start' | 'center' | 'end'
  sortable?: boolean; sortValue?: (row) => unknown; sortFn?: (a, b) => number
  pinned?: 'left' | 'right'; pinnable?: boolean   // needs columnPinningFeature; pinnable: can the header menu change it (default true)
  hidden?: boolean; hideable?: boolean           // need columnVisibilityFeature
  reorderable?: boolean                          // needs columnReorderFeature (default true)
  clickable?: boolean
  flash?: boolean | 'direction'  // change highlight for this column (overrides the grid's `flash`)
  filterable?: boolean           // funnel button in the header (and an input in the filter row)
  filter?: 'text' | 'number' | 'date' | 'boolean' | 'set'
         | { type?, options?: FilterOption[] | ((search, { signal }) => Promise<FilterOption[]>), placeholder? }
  filterValue?: (row) => unknown // value filters compare (default: the cell value)
  filterFn?: (row, filter) => boolean            // replaces the built-in matching for this column
  filterComponent?: Component    // custom popover body: props { modelValue, column }, emits update:modelValue
  searchable?: boolean           // included in the quick search (default true for visible columns)
  aggregate?: 'sum' | 'avg' | 'min' | 'max' | 'count' | ((values, rows) => unknown)  // totals row (aggregationFeature) and group rows
  groupable?: boolean            // Group by / Ungroup in the header menu (rowGroupingFeature)
  groupValue?: (row) => unknown  // what rows are grouped by (default: the cell value), e.g. the month of a date
  exportValue?: (row) => unknown // what CSV exports and copying use (exportFeature), e.g. an id instead of a link
  exportable?: boolean           // in exports and copied rows (default true); false for action columns
  cellClass?: ClassValue | ((row) => ClassValue); headerClass?: ClassValue
}
```

## Selection and batch actions

`selectionFeature` adds a checkbox column. `v-model:selected` holds the selected row keys; the
`#toolbar` slot gets them too, so a batch-action bar lives in the grid:

```vue
<VGrid
  v-model:selected="selected"
  :rows="requests"
  :columns="columns"
  row-key="id"
  selectable
  prune-selection
  :is-row-selectable="(r) => r.status === 'pending'"
  :features="[selectionFeature]"
>
  <template #toolbar="{ selected, selectedCount, clearSelection }">
    <template v-if="selectedCount">
      {{ selectedCount }} selected
      <button @click="approve(selected).then(clearSelection)">Approve</button>
      <button @click="clearSelection()">Clear</button>
    </template>
  </template>
</VGrid>
```

- **Ranges.** Shift-click a checkbox (or Shift+Space with keyboard navigation) to give every row
  on screen from the last toggled one to this one the clicked row's new state. Ranges follow the
  display order (sort, filters, expanded sub-grids, open groups) and skip rows that can't be
  selected.
- **Select all.** The header checkbox selects every selectable row that passes the filters, on
  every page; `selectable="single"` has radio buttons and no select-all.
- **Rows that leave.** By default selected keys stay when their rows leave the data, so a
  selection can span server pages. `prune-selection` drops them instead: after a reload, a batch
  delete or a new page, `selected` only holds rows that exist.
- **All matching rows (server data).** With a `data-source`, the header checkbox selects the loaded
  page; a banner then offers _Select all N rows_ (N = the `total` the source returned). That sets
  `v-model:select-all-matching`: every row shows ticked, `selectedCount` is N, and your batch
  action should run on the query (`@query-change`) rather than on `selected`. Changing the
  filters, unticking a row (the keys already in `selected` stay, plus the rest of the loaded page) or
  _Clear selection_ ends it.
- `grid.clearSelection()` clears it all from code. Cascading through sub-grids, group checkboxes
  (row grouping) and copying the selected rows (export feature) work as described in their
  sections.

## Sub-grids (CSS `subgrid`)

```vue
<VGrid
  :rows="markets"
  :columns="columns"
  row-key="id"
  :sub-rows="(row) => row.children"
  selectable
/>
```

Expanded children render inside a `.vg-subgrid` element that spans every column and uses
`grid-template-columns: subgrid` — so each child cell sits exactly in its parent's column, at any
depth. Children reuse the parent's columns: reorder, hide and pin apply automatically. The first
column is indented per depth (`--vg-subgrid-indent`), rows get `aria-level`, the grid becomes a
`treegrid`. With `loadSubRows` children are fetched on first expand.

Need children with a **different** set of columns? Put another `<VGrid>` in the `#detail` slot.

## Column menu, reorder, persistence

```vue
<VGrid
  :rows
  :columns
  row-key="id"
  storage="orders-grid"
  :features="[columnVisibilityFeature, columnReorderFeature]"
>
  <!-- the picker hides columns (columnVisibilityFeature); dragging headers needs columnReorderFeature -->
  <template #toolbar="{ columnState, setColumnState }">
    <VGridColumnMenu :columns="columns" :column-state="columnState" @update:column-state="setColumnState($event!)" />
  </template>
</VGrid>
```

With `columnReorderFeature`, drag a header to move it (mouse or pen; on a touch screen hold it for half a second first, see [Touch](#touch-phones-and-tablets)), or focus a header and press
**Alt+←/→**. Pinned columns only move within their pin group. Stored state is reconciled with the
current column definitions (unknown keys dropped, new columns appended).

## Context menus

Menus use the **Popover API** (top layer — never clipped by the grid's scroll container; Esc and
outside click close them) and **CSS anchor positioning** (`position-anchor` + `position-area` +
`position-try-fallbacks`): they flip to stay on screen and follow their anchor while the grid
scrolls. No JS positioning, except a small fallback for browsers without anchor positioning.

### Body cells

```vue
<VGrid
  :rows
  :columns
  row-key="id"
  :context-menu="
    ({ row, column, value }) =>
      column.key === 'link'
        ? []
        : [
            { name: 'copy', label: 'Copy', hint: 'Ctrl+C' },
            { name: 'open', label: `Open #${row.id}` },
            { separator: true },
            { name: 'delete', label: 'Delete', tone: 'danger', disabled: !row.canDelete },
          ]
  "
  @context-action="({ name, row, column, value }) => run(name, row)"
/>
```

Right-click opens the menu at the pointer; the **ContextMenu** key or **Shift+F10** opens it under the
focused cell. Return `[]`/`null` to keep the browser's native menu for that cell. Items:
`{ name, label, disabled?, tone?, icon?, hint? }` or `{ separator: true }`. Arrow keys, Home/End and
typeahead move through items; focus returns to the cell on close.

### Column headers

Right-clicking a header opens a built-in menu: **Sort ascending / descending / Clear sort** (sortable
columns), **Pin left / Pin right / Unpin**, **Move left / right**, **Hide column**, **Reset columns**.
Pin items need `columnPinningFeature`, move items `columnReorderFeature`, Hide column `columnVisibilityFeature`. Runtime pins are stored in column state (`columnState.pinned`) and persisted with `storage`.

```vue
<!-- extend (or replace) the built-in items; custom items emit header-action -->
<VGrid
  :header-menu="
    ({ column, items }) => [{ name: 'copy', label: 'Copy column' }, { separator: true }, ...items]
  "
  @header-action="({ name, column }) => …"
/>
<VGrid :header-menu="false" />
<!-- off -->
```

Columns opt out with `pinnable: false`, `reorderable: false`, `hideable: false`.

### `VGridMenu` for your own triggers

The same component powers the `actions-menu` renderer and is exported for add-ons:

```vue
<button popovertarget="row-menu" :style="{ 'anchor-name': '--row-menu' }">⋮</button>
<VGridMenu id="row-menu" anchor-name="--row-menu" :items="items" @select="(item) => …" />
<!-- or imperatively: menuRef.value.openAt(element | { x, y }) -->
```

## Filtering

```vue
<script setup lang="ts">
import {
  VGrid,
  VGridSearch,
  filteringFeature,
  numberRenderer,
  statusRenderer,
  type FilterState,
} from '@nocopypaste/vue-grid'

const filters = ref<FilterState | null>(null)
const columns = [
  { key: 'player', header: 'Player', filterable: true }, // text
  { key: 'stake', header: 'Stake', filterable: true, renderer: numberRenderer }, // number (from the renderer)
  { key: 'status', header: 'Status', filterable: true, renderer: statusRenderer }, // value list
  { key: 'placedAt', header: 'Placed', filterable: true, filter: 'date' }, // explicit type
]
</script>

<template>
  <VGrid
    v-model:filters="filters"
    :rows
    :columns
    row-key="id"
    :features="[filteringFeature]"
    filter-row
    filter-storage="bets-filters"
  >
    <template #toolbar="{ activeFilterCount, clearFilters }">
      <VGridSearch />
      <button v-if="activeFilterCount" @click="clearFilters()">
        Clear {{ activeFilterCount }} filters
      </button>
    </template>
  </VGrid>
</template>
```

- **Header funnel.** Each `filterable` column gets a funnel button. It is hidden until you hover the
  header (on devices that can hover) and stays visible while a filter is active. It opens a
  popover through the Popover API and CSS anchor positioning, and the popover holds an editor for
  the column's type:

  | Type      | Editor                               | Operators                                                                                          |
  | --------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
  | `text`    | operator + value                     | contains, does not contain, equals, does not equal, starts with, ends with, is empty, is not empty |
  | `number`  | operator + value(s)                  | `=` `≠` `<` `≤` `>` `≥`, between, is empty, is not empty                                           |
  | `date`    | operator + date(s)                   | on, before, after, between, is empty, is not empty                                                 |
  | `boolean` | radio group                          | any, yes, no, empty                                                                                |
  | `set`     | searchable checkbox list with counts | (the selected values)                                                                              |
  | `custom`  | your `filterComponent`               | (anything; match it with `filterFn`)                                                               |

  The type comes from `filter`, else from the renderer (number, currency, change → `number`;
  date, datetime → `date`; boolean, checkbox, switch → `boolean`; status, chip → `set`), else
  `text`.

- **Filter row** (`filter-row`). An inline input under each header that accepts shorthand:
  `>10`, `>=10`, `5..20`, `-5..-1`, open ranges `5..` / `..20`, `!=3`, a decimal comma (`1,5`),
  and `>2026-01-01` or `2026-01-01..2026-03-31` for dates; plain text for text columns. Input that
  doesn't parse sets no filter. Boolean columns get a select; value-list and custom columns get a
  button that opens the popover.
- **Quick search.** `<VGridSearch>` inside the `#toolbar` slot drives that grid's search. Anywhere
  else, bind it with `v-model` to `filters.search`. The search matches any visible column that is
  not marked `searchable: false`.
- **Matching** is case- and accent-insensitive (`nis` finds _Niš_). Dates compare by calendar day
  in the grid's `timeZone`; a date-only string (`2026-01-05`) is that calendar day in every time
  zone, for filtering and for the `date` renderer. Column filters combine with AND, and then the
  search must match too. Saved filters for columns that no longer exist are ignored.
- **Long value lists** render their first 300 values; a search narrows the rest.
- **Trees.** A row shows when it matches, when a descendant matches (so the path stays visible), or
  when an ancestor matched (so a matching group keeps its children). Select-all and cascade only
  touch rows that are visible.
- **Value lists from a backend.** Pass `filter: { type: 'set', options: (search, { signal }) => fetch(…) }`.
  The list is fetched when the popover opens and again on every search (debounced). Superseded
  requests are cancelled.
- The header menu has **Filter… / Clear filter / Clear all filters** items. When filters hide
  every row, the grid shows `noMatchText` with a _Clear filters_ button.

The model is plain JSON, so you can store it, put it in the URL or send it to an API as is:

```ts
interface FilterState {
  columns: Record<string, ColumnFilter>
  search?: string
}
type ColumnFilter =
  | {
      type: 'text'
      op:
        | 'contains'
        | 'notContains'
        | 'equals'
        | 'notEquals'
        | 'startsWith'
        | 'endsWith'
        | 'empty'
        | 'notEmpty'
      value?: string
    }
  | {
      type: 'number'
      op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'empty' | 'notEmpty'
      value?: number | null
      to?: number | null
    }
  | {
      type: 'date'
      op: 'on' | 'before' | 'after' | 'between' | 'empty' | 'notEmpty'
      value?: string
      to?: string
    } // YYYY-MM-DD
  | { type: 'boolean'; value: boolean | null }
  | { type: 'set'; values: string[] } // '' stands for blank cells
  | { type: 'custom'; value: unknown }
```

The matchers are exported too, for use on a server or in tests: `matchesFilter`,
`parseQuickFilter`, `filterTree`, `isFilterActive`, `activeFilterCount`, `foldText`.

**Custom filter.** A `filterComponent` gets `{ modelValue, column }` and emits
`update:modelValue` with a filter (or `undefined` to clear it). Pair it with `filterFn(row, filter)`.

## Server data

Two ways to connect sorting, filtering and paging to a backend.

**1. `dataSource`: the grid fetches.** You give it a function. The grid calls it on mount and
whenever sort, filters, page or page size change. It does not sort, filter or slice the rows
itself; it shows exactly what the function returns.

```vue
<script setup lang="ts">
import {
  filteringFeature,
  paginationFeature,
  serverDataFeature,
  sortingFeature,
  type DataSource,
} from '@nocopypaste/vue-grid'

const fetchBets: DataSource<Bet> = async (query, { signal }) => {
  // query: { sort: { key, dir } | null, filters: FilterState, page: number, pageSize: number | null }
  const res = await fetch('/api/bets', { method: 'POST', body: JSON.stringify(query), signal })
  if (!res.ok) throw new Error(res.statusText)
  return res.json() // { rows: Bet[], total?: number }
}
</script>

<template>
  <VGrid
    ref="grid"
    :data-source="fetchBets"
    :columns
    row-key="id"
    pagination
    filter-row
    @load-error="toast"
    :features="[serverDataFeature, sortingFeature, filteringFeature, paginationFeature]"
  />
</template>
```

- **Cancellation.** A new query aborts the previous request through `signal`, and a late response
  from a superseded request is ignored, so fast typing never shows stale rows.
- **States.** The grid shows a progress bar while loading. If the function throws, it shows
  _Couldn't load the rows._ with a _Retry_ button and emits `load-error`.
- **Paging.** `pagination` adds the pager and sends `page` / `pageSize`; return `total` so the
  pager knows how many pages there are. Without `pagination`, `pageSize` is `null` (fetch
  everything). The page resets to 1 when sort or filters change.
- `grid.reload()` re-runs the current query, and `grid.patchLoadedRows(patches)` updates fields of
  rows that are already loaded without a refetch.

**2. `@query-change`: you fetch.** Keep `rows` under your control, set `sort-mode="controlled"`
and `filter-mode="controlled"`, and handle one event. The grid emits the combined query on mount
and on every change, and skips duplicates:

```vue
<VGrid
  :rows="rows"
  :columns
  row-key="id"
  :loading="loading"
  :features="[sortingFeature, filteringFeature]"
  sort-mode="controlled"
  filter-mode="controlled"
  @query-change="load"
/>
```

Use this when the data comes from a store, a WebSocket or a GraphQL client that you already manage.

## Pagination

`pagination` gives you a built-in pager under the grid. With client rows it slices the sorted and
filtered rows; with a `dataSource` it requests pages.

```vue
<VGrid
  :rows
  :columns
  row-key="id"
  :features="[paginationFeature]"
  :pagination="{ pageSizes: [10, 25, 50] }"
  v-model:page="page"
  v-model:page-size="pageSize"
/>
```

Or place the standalone component yourself and feed the grid one page at a time:

```vue
<VGrid
  v-model:sort="sort"
  :rows="pageRows"
  :columns
  row-key="id"
  :loading="loading"
  :features="[sortingFeature]"
/>
<VGridPagination
  v-model:page="page"
  v-model:page-size="pageSize"
  :total="total"
  :page-sizes="[10, 25, 50]"
/>
```

## Pinned rows and totals

Rows that stay in view while the body scrolls: a totals row (`aggregationFeature`) and rows pinned
above or below the body (`rowPinningFeature`).

```vue
<script setup lang="ts">
const columns = [
  col({ key: 'player', aggregate: 'count' }),
  col({ key: 'stake', renderer: currencyRenderer, aggregate: 'sum' }),
  col({ key: 'odds', renderer: numberRenderer, aggregate: 'avg' }),
  col({ key: 'placedAt', renderer: dateRenderer, aggregate: 'max' }),
]
const pinned = ref<PinnedRowsState>({ top: [42] })
</script>

<template>
  <VGrid :rows="bets" :columns="columns" row-key="id" totals v-model:pinned-rows="pinned" />
</template>
```

- **Totals.** `totals` (or `totals="bottom"`) adds a totals row at the bottom; `totals="top"`
  puts it under the header. Each column with an `aggregate` shows it with the column's own
  renderer (so a currency column sums to a currency), `count` as a plain number; the first column
  shows `totals-label` (`'Total'`) unless it has an aggregate. `sum` / `avg` skip values that
  aren't numbers, `min` / `max` compare numbers, dates and strings, and a function gets the
  column's values and the rows. The totals cover the top-level rows that pass the filters, on
  every page (child rows aren't counted), and follow live data. With server data the grid only
  has the current page: pass the server's totals as `aggregates` (`{ stake: 125000 }`), which
  wins over computed values. The `total-<key>` slot renders a cell of the row yourself.
- **Pinned rows.** `v-model:pinned-rows` (`{ top, bottom }`, row keys, in display order) or
  `grid.pinRow(key, 'top' | 'bottom' | null)` pins top-level rows. They leave the body, stay put
  while it scrolls, and aren't filtered, sorted or paged; selection, row clicks and context menus
  still work on them. Pin from your own context menu: `@context-action` → `pinRow(rowKey, …)`.
- **Extra rows.** `pinned-top-rows` / `pinned-bottom-rows` show rows that aren't part of `rows`
  (a target, last year's figures) — no checkbox, not counted in the totals.

Each section is one sticky `subgrid` container, so its rows share the grid's columns, follow
resizing, reordering and pinned columns, and need no measuring of their own. Keyboard navigation
moves through them like any row, and a focused row scrolls clear of them (`scroll-padding`).
With virtual scrolling, `aria-rowindex` / `aria-rowcount` count them. Style them with
`.vg-pinned-top`, `.vg-pinned-bottom`, `.vg-row-pinned`, `.vg-row-total` and the
`--vg-total-row-bg` / `--vg-total-row-font-weight` tokens.

## Row grouping

`rowGroupingFeature` groups the rows by one or more columns. Each group is a row with the grouped
column's name, the value, the number of rows and each column's `aggregate` over the group; expand
it to see its sub-groups or, at the last level, its rows.

```vue
<script setup lang="ts">
const columns = [
  col({ key: 'player', field: 'player.name' }),
  col({ key: 'city', field: 'player.city', groupable: true }),
  col({ key: 'status', renderer: statusRenderer, groupable: true }),
  col({ key: 'stake', renderer: currencyRenderer, aggregate: 'sum' }),
  col({
    key: 'placedAt',
    renderer: dateRenderer,
    groupable: true,
    groupValue: (b) => b.placedAt.slice(0, 7),
  }),
]
const groupBy = ref(['status', 'city'])
</script>

<template>
  <VGrid
    v-model:group-by="groupBy"
    :rows="bets"
    :columns="columns"
    row-key="id"
    totals
    :features="[rowGroupingFeature, aggregationFeature]"
  />
</template>
```

- **What a group shows.** The first column holds the expander, the grouped column's header, the
  value (with that column's renderer, so a status groups under its badge; a `groupValue` shows as
  text) and the row count. That cell runs across the columns after it up to the first one with
  an `aggregate`; those show the group's own aggregate. The `group-<key>` slot renders the value
  yourself (`{ value, count, rows, column, group }`); `total-<key>` also renders group cells
  (with `group` set). Empty values form a `(blank)` group, last.
- **In a narrow column** (a fixed-width first column followed by an aggregate) the label never
  widens the column: under 12rem the column name is dropped, then the value is cut with an
  ellipsis; the count stays. The whole label (“City: Novi Sad (12)”) is the cell's tooltip.
- **Keyboard.** ↑ / ↓ keep their column across a group row, even though its label spans several:
  from Stake up onto a group row lands on its Stake aggregate, and back down on Stake.
- **Order, filters, pages.** Groups follow the filters and are ordered by value, descending when
  the grid is sorted descending by the grouped column; sorting by any other column orders the
  rows inside each group. Pagination pages the top-level groups. With server data, the rows of
  the current page are grouped.
- **Expanding.** Groups start collapsed (`groups-expanded` opens them). Click a group's label or its
  arrow, or use →/← with keyboard navigation; `expandAll()` / `collapseAll()` include groups.
  Changing `group-by` starts over.
- **Selection.** A group's checkbox selects or clears every row in it, and shows partly
  selected groups as indeterminate.
- **Header menu.** Columns with `groupable: true` get _Group by_ (adds a level) / _Ungroup_, and
  _Ungroup all_. Any column can be grouped through `v-model:group-by`.
- **Virtual scrolling.** Group rows are part of the virtual layout: thousands of rows in a few
  groups render only what's in view.

Style group rows with `.vg-rowgroup` (and `[data-group-level]`), `.vg-rowgroup-name`,
`.vg-rowgroup-value`, `.vg-rowgroup-count` and the `--vg-rowgroup-bg` /
`--vg-rowgroup-font-weight` tokens. `groupRows()` and `isRowGroup()` are exported for using the
same grouping elsewhere.

## Export and copy

`exportFeature` turns the grid's rows into CSV and copies them to the clipboard.

```vue
<script setup lang="ts">
const grid = ref<VGridExposed>()
const columns = [
  col({ key: 'customer', field: 'customer.name' }),
  col({ key: 'total', renderer: currencyRenderer, aggregate: 'sum' }),
  col({ key: 'link', renderer: linkRenderer, exportValue: (o) => o.id }), // export the id, not the link
  col({ key: 'actions', renderer: actionsMenuRenderer, exportable: false }), // left out
]
</script>

<template>
  <button @click="grid?.exportCsv({ filename: 'orders.csv', totals: true })">Download CSV</button>
  <button @click="grid?.copyRows()">Copy selected</button>
  <VGrid
    ref="grid"
    :rows="orders"
    :columns="columns"
    row-key="id"
    selectable
    totals
    :features="[exportFeature, selectionFeature, aggregationFeature, keyboardNavigationFeature]"
    @copy="(e) => toast(`Copied ${e.rows.length} rows`)"
  />
</template>
```

- **`exportCsv(options)`** downloads a `.csv` file (`filename`, default `export.csv`) in UTF-8 with
  a BOM, so Excel shows accents right (`bom: false` to drop it). **`getCsv(options)`** returns the
  same text, for uploading or previewing.
- **`copyRows(options)`** copies rows as tab-separated text, which pastes as cells into Excel,
  Google Sheets or Numbers. It resolves `false` when nothing was copied.
- **Ctrl / ⌘ + C** inside the grid copies the selected rows; with none selected, the focused cell
  (cells take focus with `keyboardNavigationFeature`). A text selection, or focus in an input,
  is left to the browser.
- **Options** (all methods): `rows` — `'filtered'` (default for exports: the rows that pass the
  filters, sorted, every page), `'all'`, `'page'`, `'selected'` (default for copying, nested rows
  included); `children: true` adds the known sub-grid rows after their parent; `columns` — keys,
  in order, hidden columns allowed (default: the visible columns without `exportable: false`);
  `values` — `'raw'` (default for exports: numbers and ISO dates a spreadsheet can compute with)
  or `'formatted'` (default for copying: as the cells show them); `header` (default `true` for
  exports, `false` for copying); `totals: true` adds the totals row; `delimiter` (`,` / tab);
  `guard` (default `true`).
- **Values.** A column's `exportValue(row)` wins. Formatted values come from the renderer's
  `format` (numbers, currency, change, dates, date-times, booleans, status, chips and lists have
  one; your own renderers can add it); other values are written as text: dates in ISO 8601,
  arrays joined with `, `, objects as JSON. Grouped grids export their rows, not the group rows.
- **Safe for spreadsheets.** Fields are quoted per RFC 4180, and text that a spreadsheet would run
  as a formula (`=…`, `+…`, `-…`, `@…`) gets a leading `'`; numbers are left alone.
- **Clipboard.** Copying uses the Clipboard API and falls back to the browser's copy command where
  that API is missing or refused (pages served over plain http), as does the copy button of
  text cells.

Without the grid: `toCsv(rows, columns, { delimiter, header, guard })` writes CSV from any rows
and column definitions (raw values, `exportValue`, `exportable`); `toDelimited(table)`,
`plainText(value)` and `guardFormula(text)` are its parts.

## Virtual scrolling

```vue
<VGrid
  :rows="tenThousandRows"
  :columns
  row-key="id"
  :features="[virtualScrollingFeature]"
  :virtual="{ rowHeight: 40 }"
  style="height: 600px"
/>
```

Rows have a fixed height; only the visible window plus `overscan` is rendered.

Sub-grids and detail rows work in virtual mode too. The DOM keeps the same CSS grid / `subgrid`
structure as without it: expanded children stay inside their parent's `subgrid` container (lined up
with its columns), and at every level the rows out of view are replaced by spacers, so an expanded
tree of tens of thousands of rows still renders about a screenful.

- **Data rows** (children too) have `rowHeight`.
- **Detail rows** can be any height. They're measured once rendered; until then
  `virtual.detailHeight` is the estimate (default 4 × `rowHeight`).
- **Lazy children** (`load-sub-rows`) are requested only for expanded rows in view, once a scroll
  has settled, so flying past expanded rows doesn't fire their requests.
- **The view holds still** when rows above it change height (a detail row measured, children
  loaded): the grid keeps the first row in view where it was. It does this itself, the same in every
  browser, so virtual grids set `overflow-anchor: none` (browser scroll anchoring doesn't work
  reliably in a CSS grid like this one — Firefox doesn't anchor in it at all).
- `scrollToRow(key)` reaches child rows too; `aria-rowcount` / `aria-rowindex` count every
  rendered row (data, detail and loading / error rows).

## Performance

What the grid does for you, and what helps on your side. The repository README lists the
measurements.

**Many rows.** Above a few hundred rows, turn on `virtualScrollingFeature` and give the grid a
fixed height. Without it, every row is in the DOM, and restyling or relayout (resizing the window,
switching density) touches every cell. Tips:

- Keep `rowHeight` exact and cell content to one line (e.g. `rendererOptions: { ellipsis: true }`).
- Set `detailHeight` close to your typical detail row: rows that render near their estimate settle
  without visible correction.
- Raise `overscan` (default 6) only if fast scrolling shows blank rows on slow devices.

**Changing data.** Re-render only what changed:

- Reactive rows: assign the field (`row.status = 'Won'`); only that cell re-renders.
- Large immutable lists (`shallowRef`): `patchRows(rows, patches, rowKey)` replaces just the patched
  rows, and a batch that changes nothing returns the same array.
- Lazily loaded children live in the grid: use `grid.patchLoadedRows(patches)`.
- For a live feed, batch patches per animation frame rather than per message.

**Filtering and sorting** are built for large client-side data:

- Filtering is one pass over the tree. Date filters reuse one formatter per time zone, and text
  matching has an ASCII fast path.
- Value lists are counted once per column, and long lists render 300 values with a search to
  narrow them.
- Sorting computes each row's value once, with a shared collator.
- For much larger data, or data that lives on a server, use `data-source` (server mode).

**Lazy children** (`load-sub-rows`) are requested when an expanded row renders. Without virtual
scrolling that is every expanded row. With it, only expanded rows on screen, and only once a scroll
settles, so `expandAll()` on thousands of lazy rows sends a screenful of requests, not thousands.

**Motion** stays on the compositor: the change highlight (`flash`) fades an `opacity` layer, the
resize handle grows with `transform`, and spinners and progress bars use `transform`. Row
highlights appear instantly and fade out over `--vg-transition`.

**Bundle.** Import only the features and renderers you use. Everything else is tree-shaken, and
the filter popover, filter-row editors and pager are separate chunks loaded on first use.

## Keyboard

Every Storybook story is checked with axe-core against WCAG 2.1 A / AA, in light and dark mode,
in CI (`e2e/a11y.storybook.spec.ts`). Rows expose `aria-expanded` and `aria-level` in a `treegrid`;
in a plain `grid` or `table` the expander button carries `aria-expanded`. A column's resize grip is
a focusable `separator` whose value is the column's width.

Without `keyboardNavigationFeature` the grid is an ARIA `table`. The scroll area is one Tab stop,
and the grid's own controls (sort buttons, expanders, checkboxes, filter buttons) follow in the
normal Tab order.

With `keyboardNavigationFeature` it is an ARIA `grid` (`treegrid` with sub-grids). The grid is one tab stop. Arrow keys move between cells (header, rows, sub-grid rows, detail rows),
`Home`/`End`, `Ctrl+Home`/`Ctrl+End`, `PageUp`/`PageDown`; `ContextMenu` / `Shift+F10` opens the context menu. `Enter` sorts a header or activates the
cell's control; `Space` toggles row selection; `→`/`←` on a tree cell expands/collapses; `Alt+←/→` on a
header moves the column; `Alt+Shift+←/→` on a header resizes it (with `columnResizingFeature`).

## Touch, phones and tablets

- **Layout.** The grid scrolls its columns inside its own frame at any width; it doesn't widen
  the page, also inside flex and grid layouts (`.vg-root` has `min-width: 0`). If you wrap it in
  your own element inside a flex or grid layout, give that element `min-width: 0` too, or it
  grows to the columns' width. The toolbar wraps, and on narrow screens the pager drops its
  « / » buttons (page 1 and the last page stay).
- **Pinned columns** that would take more than half of a narrow grid (`pinned-max-share`)
  scroll like the others there, so the rest of the row stays readable; they pin again once the
  grid is wide enough. The pins stay in the column state; `pinned-max-share="false"` keeps them
  pinned at any width.
- **Swipes scroll** the grid, also when they start on a header (except on a column's narrow
  resize edge).
- **Hold a header** (about half a second) to pick the column up, then drag it to reorder
  (`columnReorderFeature`). Release it without moving to open the header menu (`menusFeature`).
- **Hold a body cell**, then release, to open its `context-menu`. This works on iOS, which fires no
  `contextmenu` event; the browser's own long-press menu is suppressed while the grid's menu
  takes over.
- Inputs (filters, search, pager) are 16 px on touch screens so iOS Safari doesn't zoom in, and
  row hover tints only apply where there is a real hover (a tapped row doesn't stay tinted).

## Built-in renderers

Screenshots of every renderer are in the repository README's
[renderer gallery](../../README.md#29-cell-renderers).

**Display**

| Name                      | Options                                                                                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text` (default)          | `ellipsis`, `lines`, `maxWidth`, `preserveNewlines`, `tooltip`, `placeholder`, `tone`, `toneMode` (`text`/`fill`), `bold`, `secondary` (muted suffix), `badge` + `badgePosition`, `icon`, `copyable` + `copyValue` → emits `copy` |
| `toggle-text`             | `clickable`, `highlighted` → emits `toggle`                                                                                                                                                                                       |
| `number`, `signed-number` | `format` (`Intl.NumberFormatOptions`), `placeholder`, `clickable` → emits `click`                                                                                                                                                 |
| `currency`                | `currency` (code or `(value, row) => code`), `format`, `placeholder`, `clickable` → emits `click`                                                                                                                                 |
| `change`                  | `direction`, `currency`, `format`, `iconOnly` (arrow + colour; booleans / `'true'` = trend)                                                                                                                                       |
| `date`, `datetime`        | `format`, `placeholder`; `datetime`: `milliseconds`, `twoLines`                                                                                                                                                                   |
| `boolean`                 | `trueLabel`, `falseLabel`, `nullLabel`, `display` (`text`/`icon`), `falseIcon`                                                                                                                                                    |
| `status`                  | `tone` (map / fn / constant), `label` (fn or value → label map), `dot`, `variant` (`soft`/`solid`/`outline`), `placeholder`, `clickable` → emits `click`                                                                          |
| `chip`                    | `color` (any CSS colour, contrast text picked), `tone`, `label`, `tooltip`, `shape` (`square`/`circle`/`pill`), `size`; accepts `{ label \| name, color, description }`                                                           |
| `multi-line`              | `lines` (builder; default: the value array), `boldLines`, `ellipsis`, `target`, `placeholder`; each line: `{ text, href, to, tone, fill, bold, muted, tooltip, trend, action, badge }`                                            |
| `list`                    | `items`, `itemLabel`, `max` (default 1), `placeholder` → “+N more” toggle, emits `expand`                                                                                                                                         |
| `link`                    | `href`, `to` (router location → `<RouterLink>` when vue-router is installed), `label`, `target`, `tooltip` → emits `click`                                                                                                        |
| `icon`                    | `icon` / `iconFor`, `show`, `label`, `tone`                                                                                                                                                                                       |
| `image`                   | `src`, `baseUrl`, `alt`, `size`, `fit`, `shape`; placeholder when empty or broken                                                                                                                                                 |
| `code`                    | `language` (`auto`/`json`/`text`), `lines`, `indent`, `highlight` (JSON token colours)                                                                                                                                            |
| `json`                    | `label`, `dialogTitle` (escaped JSON in a `<dialog>`)                                                                                                                                                                             |
| `json-tree`               | `collapseAt`, `maxDepth`, `parseNested`, `collapsed` + `toggleLabel`, `emptyText`                                                                                                                                                 |
| `details`                 | `tone`, `label`, `items` (`{ label, value, tone, detail, tooltip }[]`), `title`, `triggerLabel` → badge + info popover                                                                                                            |

**Actions and editing** — editable renderers are _controlled_: they show the data and emit the requested
change; your `@cell-action` handler updates the row.

| Name                 | Options → emits                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `actions-menu`       | `actions: MenuItem[] \| (row) => MenuItem[]`, `label` → the item's `name`                                                                |
| `action-button`      | `label`, `action`, `icon`, `tone`, `disabled`, `visible`, `variant` (`outline`/`solid`/`ghost`), `iconOnly` → `action` (default `click`) |
| `button-group`       | `buttons: ButtonSpec[] \| (row) => ButtonSpec[]` (`{ name, label, tone, variant, disabled, icon, hidden }`) → the button's `name`        |
| `copy`               | `copyValue`, `iconOnly`, `title`, `label`, `placeholder` → `copy` (payload: copied text) / `copy-error`                                  |
| `edit`               | `format`, `placeholder`, `label`, `disabled`, `bold` → `edit`                                                                            |
| `checkbox`, `switch` | `checked`, `disabled`, `disabledReason`, `label` → `change` (payload: the requested boolean)                                             |
| `radio`              | same + `name` → `select` (payload: the row key)                                                                                          |
| `icon-toggle`        | `active`, `icon`, `activeIcon`, `activeTone`, `label`, `disabled` → `toggle` (payload: next state)                                       |

```vue
<VGrid
  :rows="rows"
  :columns="[{ key: 'web', renderer: 'switch' }]"
  row-key="id"
  @cell-action="({ name, payload, rowKey }) => name === 'change' && setWeb(rowKey, payload)"
/>
```

Values option callbacks receive `(value, row)`. The component of every renderer is exported too
(`TextCell`, `CurrencyCell`, …) for composition.

## Writing a cell renderer (addons)

A renderer is a component plus a small definition. See
[`@nocopypaste/vue-grid-renderer-template`](../cell-renderer-template) for a complete, publishable example.

```vue
<!-- RatingCell.vue -->
<script setup lang="ts">
import type { CellRendererEmits, CellRendererProps } from '@nocopypaste/vue-grid'
const props = defineProps<CellRendererProps<unknown, number, { max?: number }>>()
const emit = defineEmits<CellRendererEmits>()
</script>
<template>
  <button v-for="n in options.max" :key="n" @click="emit('action', 'rate', n)">
    {{ n <= value ? '★' : '☆' }}
  </button>
</template>
```

```ts
import { defineCellRenderer } from '@nocopypaste/vue-grid'
declare module '@nocopypaste/vue-grid' {
  interface CellRendererRegistry {
    rating: { max?: number }
  } // typed `renderer: 'rating'`
}
export const ratingRenderer = defineCellRenderer<{ max?: number }>({
  name: 'rating',
  component: RatingCell,
  defaults: { max: 5 },
  sortValue: (v) => Number(v),
  // what Ctrl+C and formatted CSV exports copy (export feature); without it the raw value
  format: (v, options, ctx, row) => `${Number(v ?? 0)} of ${options.max ?? 5}`,
})
// app.use(createVueGrid({ renderers: [ratingRenderer] }))   or   <VGrid :renderers="[ratingRenderer]">
```

Renderer props: `value`, `row`, `rowKey`, `rowIndex`, `depth`, `column`, `options` (defaults merged
with `rendererOptions`). Emit `action(name, payload)`; the grid re-emits it as `cell-action` with the
row and column. `useGridContext()` gives `{ locale, currency, timeZone }`. Lookup order:
a definition or component on the column → `:renderers` → plugin → `text` (the only renderer built in).

## Theming

Override any token on `:root`, a wrapper, or the grid itself:

```css
.brand-grid {
  --vg-color-accent: #db2777;
  --vg-color-header-bg: #fdf2f8;
  --vg-radius: 1rem;
  --vg-cell-padding-x: 1.25rem;
  --vg-font-family: Georgia, serif;
}
```

| Group            | Tokens                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type             | `--vg-font-family` `--vg-font-size` `--vg-line-height` `--vg-header-font-size` `--vg-header-font-weight` `--vg-header-letter-spacing` `--vg-header-text-transform`                                                                                              |
| Colour           | `--vg-color-text` `-text-muted` `-surface` `-surface-raised` `-header-bg` `-header-text` `-border` `-border-strong` `-row-hover` `-row-selected` `-row-highlight` `-accent` `-accent-contrast` `-focus-ring` `-success` `-danger` `-warning` `-info` `-neutral` |
| Space & shape    | `--vg-cell-padding-x/y` `--vg-header-padding-x/y` `--vg-gap` `--vg-radius` `--vg-radius-sm` `--vg-radius-pill` `--vg-border-width` `--vg-row-border` `--vg-header-border` `--vg-outer-border` `--vg-select-column-width` `--vg-expander-size`                   |
| Sub-grid         | `--vg-subgrid-bg` `--vg-subgrid-indent` `--vg-subgrid-border` `--vg-subgrid-radius`                                                                                                                                                                             |
| Elevation        | `--vg-shadow-pinned` `--vg-shadow-popover` `--vg-z-header` `--vg-z-pinned` `--vg-z-pinned-header` `--vg-transition` `--vg-menu-gap`                                                                                                                             |
| Change highlight | `--vg-flash-color` `--vg-flash-up` `--vg-flash-down` `--vg-flash-duration`                                                                                                                                                                                      |

Motion stays on the compositor (`transform`, `opacity`) wherever layout would otherwise animate.
Row highlights (hover, selection) appear at once and fade out over `--vg-transition`, so the grid
responds the moment the pointer arrives.

Colours use `light-dark()`: set `color-scheme: light dark` on `html` to follow the OS, or
`color-scheme: dark` to force dark. Stable class names (`.vg-header-cell`, `.vg-cell`, `.vg-row`,
`.vg-subgrid`, `.vg-pin-left`, …) and the `ui` prop are there for anything tokens don't cover.

### Bring your own theme

The tokens above come from `theme.css`, which is optional. Import `base.css` instead and the grid
keeps its structure (columns, sub-grid alignment, sticky header and pins, tree indent, anchored
menus and popovers) with none of the default look. Then style the classes yourself:

```ts
import '@nocopypaste/vue-grid/base.css'
import './my-grid-theme.css'
```

```css
/* my-grid-theme.css — unlayered, or in your own layer after `vue-grid` */
.vg-viewport {
  border: 1px solid #ddd;
}
.vg-header-cell {
  padding: 0.5rem 0.75rem;
  background: #fafafa;
  font-weight: 600;
}
.vg-cell {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid #eee;
}
.vg-row:hover > .vg-cell {
  background: #f5f5f5;
}
```

Base only gives sticky header and pinned cells the system `Canvas` background, so content doesn't
show through them; everything else (colours, spacing, borders, fonts, focus rings, animation) is
yours. The structural tokens `--vg-select-column-width`, `--vg-expander-size`,
`--vg-subgrid-indent`, `--vg-z-*` and `--vg-menu-gap` live in `base.css` and can be overridden
the same way. `renderers.css` reads the theme's colour tokens; define them (or skip the file) when
you drop `theme.css`.

## For coding agents

[`AGENTS.md`](AGENTS.md) is the short guide for AI coding agents (rules, which feature and
renderer for what, recipes, pitfalls); [`llms.txt`](llms.txt) and `llms-full.txt` follow the
llms.txt convention. The API reference is generated from the sources into
[`agent/api.md`](agent/api.md) and `agent/api.json`, with a
[JSON Schema](agent/grid-config.schema.json) of a grid config. To check a config:

```ts
import { validateGridConfig } from '@nocopypaste/vue-grid/agent'

const { ok, diagnostics } = validateGridConfig({
  rowKey: 'id',
  features: ['sortingFeature'], // export names (or the feature objects); 'allFeatures' for all
  renderers: [], // registered renderer names / definitions
  columns: [{ key: 'total', renderer: 'currency', sortable: true, widht: '8rem' }],
})
// error   columns[0].widht     Columns have no option `widht`. Did you mean `width`?
// warning columns[0].renderer  Renderer name `currency` isn't registered … pass `renderer: currencyRenderer`
// warning props.sortMode       Sortable columns, but sorting is controlled … add `sort-mode="client"`
```

`@nocopypaste/vue-grid/agent` is a separate entry: apps that don't import it never bundle it. The
[`@nocopypaste/vue-grid-mcp`](../vue-grid-mcp) MCP server serves the same to agents as tools, and the
[Claude Code plugin](../../plugins/vue-grid) adds a skill with the full workflow.

## Browser support

Evergreen browsers: CSS `subgrid`, `light-dark()`, `@layer`, the Popover API and `<dialog>`
(Chrome/Edge 123+, Firefox 125+, Safari 17.5+).

**CSS first, JS only as a fallback.** Everything the browser can do in CSS / HTML is done there; a
small JS fallback runs only when a feature check (`CSS.supports`) says the browser can't:

| Behaviour                                                          | Done with                                | JS fallback when unsupported                                                                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu / popover placement, flipping, following the anchor on scroll | Popover API + CSS anchor positioning     | measured placement, re-run on scroll / resize                                                                                                                           |
| Hiding a popover once its anchor scrolls out of view               | `position-visibility: anchor-visible`    | IntersectionObserver, always on as well (Firefox 159 parses only an older value; WebKit / Safari 27 accepts it but keeps a popover whose anchor is clipped by the grid) |
| Sticky offsets of pinned columns                                   | `calc()` sums of the declared widths     | ResizeObserver, only for content-sized pinned columns                                                                                                                   |
| Which pinned column gets the edge shadow                           | `:has()` / sibling selectors             | a class                                                                                                                                                                 |
| Shadow only while content is scrolled under pinned columns         | `@container scroll-state(scrollable: …)` | scroll listener sets `data-vg-scrollable`                                                                                                                               |
| Readable text on data-coloured chips                               | `contrast-color()` / relative colours    | computed black / white                                                                                                                                                  |
| Expand / collapse (JSON tree, “More info”, list “+N more”)         | native `<details>` / `<summary>`         | —                                                                                                                                                                       |
| Closing the JSON dialog on a backdrop click                        | `<dialog closedby="any">`                | backdrop click handler                                                                                                                                                  |

What stays in JS is what CSS can't express: data (sorting, selection, expansion state), keyboard
navigation, column drag, virtual scrolling and lazy loading.
