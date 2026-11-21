# @eboye/vue-grid

A data grid for Vue 3 built on **CSS Grid** — with real `subgrid` sub-rows, pinned columns, column
reorder/visibility with persistence, selection, virtual scrolling, pagination, a pluggable
**cell-renderer registry** for 3rd-party addons, and a theme you customise with **CSS variables**.

- Vue `^3.5` peer dependency, zero runtime dependencies, fully typed (`<VGrid generic="T">`).
- Plain CSS in `@layer vue-grid` — your CSS / Tailwind utilities override it without `!important`.
- No `v-html` / `innerHTML` anywhere; link renderer drops `javascript:` URLs.

**New here? Start with the [examples cookbook](../../docs/examples.md)** — runnable snippets for every
feature. This README is the API reference.

## Install

```sh
npm i @eboye/vue-grid
```

```ts
// main.ts
import { createApp } from 'vue'
import { createVueGrid } from '@eboye/vue-grid'
import '@eboye/vue-grid/style.css'

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
} from '@eboye/vue-grid'

interface Order { id: number; customer: { name: string }; total: number; status: 'Paid' | 'Open'; placedAt: string }

const rows = ref<Order[]>([/* … */])
const sort = ref<SortState | null>(null)

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'id', header: '#', renderer: numberRenderer, width: 'min-content', pinned: 'left' }),
  col({ key: 'customer', header: 'Customer', field: 'customer.name', sortable: true, width: 'minmax(10rem, 1fr)' }),
  col({ key: 'total', header: 'Total', renderer: currencyRenderer, sortable: true }),
  col({ key: 'status', header: 'Status', renderer: statusRenderer, rendererOptions: { tone: { Paid: 'success', Open: 'info' } } }),
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
column visibility and persistence, detail rows, virtual scrolling, keyboard navigation and
theming. Everything else is an opt-in feature:

| Feature | Turns on |
|---|---|
| `sortingFeature` | Sort buttons on `sortable` headers, the header menu's sort items, `sort-mode="client"` sorting |
| `filteringFeature` | Funnels on `filterable` headers, `filter-row`, `<VGridSearch>`, `v-model:filters`, `filter-storage`, the header menu's filter items |
| `serverDataFeature` | `data-source`: the grid fetches sorted, filtered pages itself |
| `paginationFeature` | `pagination` and `v-model:page` / `v-model:page-size` (the standalone `<VGridPagination>` doesn't need it) |
| `selectionFeature` | `selectable` (multi or single), `v-model:selected`, `selection-mode`, `is-row-selectable`, select-all, Space to select |
| `subGridsFeature` | `sub-rows` / `load-sub-rows` / `has-sub-rows`: nested rows in a CSS `subgrid` (detail rows don't need it) |
| `menusFeature` | The header right-click menu (`header-menu`) and body-cell menus (`context-menu`); without it the browser's menu shows. The standalone `<VGridMenu>` and the `actions-menu` renderer don't need it |
| `columnReorderFeature` | Dragging headers to reorder (mouse, pen, touch), Alt+←/→ on a header, the header menu's Move items |
| `columnPinningFeature` | Sticky `pinned: 'left' \| 'right'` columns with edge shadows, the header menu's Pin items; without it pins are ignored |

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
- **CSS**: `@eboye/vue-grid/style.css` has everything. To trim it, import
  `@eboye/vue-grid/core.css` (grid, menus, pagination, column menu, text renderer) and add
  `@eboye/vue-grid/renderers.css` only if you use other renderers.

| Import (minified / gzip, Vue excluded) | Initial chunk |
|---|---|
| `VGrid` (no features) | 34.7 kB / 12.4 kB |
| `VGrid` + `sortingFeature` | 35.4 kB / 12.8 kB |
| `VGrid` + `filteringFeature` | 38.4 kB / 13.7 kB |
| `VGrid` + `serverDataFeature` | 36.1 kB / 13.0 kB |
| `VGrid` + `paginationFeature` | 34.8 kB / 12.5 kB |
| `VGrid` + `selectionFeature` | 36.6 kB / 13.1 kB |
| `VGrid` + `subGridsFeature` | 36.4 kB / 13.1 kB |
| `VGrid` + `menusFeature` | 43.5 kB / 15.5 kB |
| `VGrid` + `columnReorderFeature` | 36.6 kB / 13.2 kB |
| `VGrid` + `columnPinningFeature` | 36.8 kB / 13.3 kB |
| `VGrid` + `allFeatures` + `VGridSearch` | 56.4 kB / 19.9 kB |
| `VGrid` + `currencyRenderer` | 35.9 kB / 12.8 kB |
| `VGrid` + `VGridPagination` + `VGridColumnMenu` | 39.1 kB / 13.9 kB |
| `sortRows` only | 0.7 kB / 0.5 kB |
| everything | 100.0 kB / 32.2 kB |

With `filteringFeature`, the filter popover body and the filter-row editors are **on-demand
chunks**: they load the first time a popover opens or `filter-row` is on. With
`paginationFeature`, the pager is one too. Measured with esbuild (`--bundle --minify --splitting`,
`process.env.NODE_ENV` set to `production`, which also drops the dev warnings).

## `<VGrid>` API

### Props

| Prop | Type | Default | |
|---|---|---|---|
| `rows` | `T[]` | `[]` | Your data objects, used as-is (never mutated). Not needed with `dataSource`. |
| `features` | `GridFeature[]` | — | Opt-in features for this grid, added to the app-wide ones. See [Features](#features-everything-optional). |
| `dataSource` | `(query, { signal }) => Promise<{ rows, total? }>` | — | Server rows: the grid calls it whenever sort, filters or page change. Needs `serverDataFeature`. See [Server data](#server-data). |
| `columns` | `ColumnDef<T>[]` | — | See below. |
| `rowKey` | `keyof T \| (row) => string \| number` | — | Stable unique id; all row state is keyed by it. |
| `v-model:sort` | `{ key, dir: 'asc' \| 'desc' } \| null` | `null` | Header click cycles asc → desc → none. Needs `sortingFeature` for the header UI. |
| `sortMode` | `'controlled' \| 'client'` | `'controlled'` | `controlled` only emits (server-side sorting). Ignored with `dataSource`. |
| `v-model:filters` | `FilterState \| null` | `null` | `{ columns: Record<key, ColumnFilter>, search }`. Needs `filteringFeature` (as do the next four). See [Filtering](#filtering). |
| `filterMode` | `'client' \| 'controlled'` | `'client'` | `controlled` only emits (server-side filtering). Ignored with `dataSource`. |
| `filterRow` | `boolean` | `false` | A row of inline filter inputs under the headers. |
| `filterStorage` | `string \| FilterStateStorage` | — | Persist filters (`string` = localStorage key). |
| `noMatchText` | `string` | `'No rows match the current filters.'` | Shown, with a *Clear filters* button, when filters hide every row. |
| `pagination` | `boolean \| { pageSizes?: number[] }` | `false` | Built-in pagination bar: slices client rows, or asks the `dataSource` for pages. Needs `paginationFeature`. |
| `v-model:page` / `v-model:pageSize` | `number` | `1` / `25` | Reset to page 1 when sort or filters change. |
| `v-model:columnState` | `{ order: string[]; hidden: string[]; pinned?: Record<string, "left" \| "right" \| null> }` | derived | Column order, visibility and runtime pins. |
| `storage` | `string \| ColumnStateStorage` | — | Persist column state (`string` = localStorage key). |
| `v-model:expanded` | `RowKey[]` | `[]` | Expanded rows (sub-grids and detail rows). |
| `subRows` | `(row) => T[] \| undefined` | — | Synchronous children → sub-grid. Needs `subGridsFeature` (as do the next two). |
| `loadSubRows` | `(row) => Promise<T[]>` | — | Lazy children (cached, loading/error/retry). |
| `hasSubRows` | `(row) => boolean` | — | Which rows get an expander when lazy. |
| `rowExpandable` | `(row) => boolean` | — | Which rows can open the `#detail` slot. |
| `selectable` | `boolean \| 'single'` | `false` | Adds a selection column. Needs `selectionFeature` (as do the next three). |
| `v-model:selected` | `RowKey[]` | `[]` | |
| `selectionMode` | `'cascade' \| 'independent'` | `'cascade'` | Whether selecting a parent selects its children. |
| `isRowSelectable` | `(row) => boolean` | — | |
| `virtual` | `{ rowHeight: number; overscan?: number } \| false` | `false` | Fixed-height virtual scrolling. |
| `rowClickable` | `boolean` | `false` | Pointer cursor; `row-click` is always emitted. |
| `rowClass` | `(row, index) => ClassValue` | — | |
| `highlightedRows` | `RowKey[]` | — | |
| `flash` | `boolean \| 'direction'` | `false` | Briefly highlight cells whose value changes; `'direction'` = green up / red down. Columns override with `flash`. |
| `renderers` | `CellRendererDefinition[]` | — | Renderers usable by name in this grid (override plugin ones). |
| `locale` / `currency` / `timeZone` | `string` | plugin → browser | Formatting context for renderers. |
| `density` | `'compact' \| 'cozy' \| 'comfortable'` | `'cozy'` | Scales cell padding. |
| `loading` | `boolean` | `false` | Progress bar + `aria-busy`. |
| `emptyText` | `string` | `'No data to show.'` | |
| `ariaLabel` | `string` | — | |
| `contextMenu` | `(ctx: { row, rowKey, column, value }) => MenuItem[] \| null` | — | Right-click menu for body cells. Needs `menusFeature`. |
| `headerMenu` | `boolean \| ({ column, items }) => MenuItem[] \| null` | `true` | Built-in header menu (sort, pin, move, hide, reset). Needs `menusFeature`. |
| `ui` | `Partial<Record<'root' \| 'header' \| 'headerCell' \| 'row' \| 'cell' \| 'subgrid' \| 'detail' \| 'empty', ClassValue>>` | — | Extra classes per part (Tailwind-friendly). |

### Events

`row-click(row, event)` · `cell-click({ row, rowKey, column, value, event })` (columns with `clickable: true`) ·
`cell-action({ name, payload, row, rowKey, column })` (from renderers) · `sub-rows-error({ row, error })` · `context-action({ name, item, row, rowKey, column, value })` · `header-action({ name, item, column })` ·
`query-change(query: GridQuery)` (sort + filters + page as one object, on mount and on every real change) ·
`load-error(error)` (a `dataSource` call failed) ·
plus the `update:*` events of every `v-model`.

Clicks on links, buttons and inputs inside a cell never trigger `row-click`.

### Slots

`cell-<key>` (`{ row, value, rowKey, rowIndex, depth, column }`) · `header-<key>` (`{ column }`) ·
`detail` (`{ row, rowKey, depth }`) ·
`toolbar` (`{ columns, columnState, setColumnState, filters, setFilters, clearFilters, activeFilterCount }`) ·
`empty` · `loading` · `sub-rows-loading` (`{ row }`).

### Exposed methods

```ts
const grid = ref<VGridExposed>()
grid.value?.scrollToTop() / scrollToRow(key) / expandAll() / collapseAll() / setColumnState(state)
grid.value?.patchLoadedRows([{ id: 'c2', city: 'Niš' }]) // field updates for lazy children and dataSource rows
grid.value?.setFilters({ columns: { city: { type: 'text', op: 'contains', value: 'nis' } } })
grid.value?.clearFilters() / openFilter('city') / reload() // reload: re-run the dataSource query
```

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
  minWidth?: string              // combined into minmax(minWidth, width)
  align?: 'start' | 'center' | 'end'
  sortable?: boolean; sortValue?: (row) => unknown; sortFn?: (a, b) => number
  pinned?: 'left' | 'right'; pinnable?: boolean   // needs columnPinningFeature; pinnable: can the header menu change it (default true)
  hidden?: boolean; hideable?: boolean; reorderable?: boolean   // reorderable: needs columnReorderFeature (default true)
  clickable?: boolean
  flash?: boolean | 'direction'  // change highlight for this column (overrides the grid's `flash`)
  filterable?: boolean           // funnel button in the header (and an input in the filter row)
  filter?: 'text' | 'number' | 'date' | 'boolean' | 'set'
         | { type?, options?: FilterOption[] | ((search, { signal }) => Promise<FilterOption[]>), placeholder? }
  filterValue?: (row) => unknown // value filters compare (default: the cell value)
  filterFn?: (row, filter) => boolean            // replaces the built-in matching for this column
  filterComponent?: Component    // custom popover body: props { modelValue, column }, emits update:modelValue
  searchable?: boolean           // included in the quick search (default true for visible columns)
  cellClass?: ClassValue | ((row) => ClassValue); headerClass?: ClassValue
}
```

## Sub-grids (CSS `subgrid`)

```vue
<VGrid :rows="markets" :columns="columns" row-key="id" :sub-rows="(row) => row.children" selectable />
```

Expanded children render inside a `.vg-subgrid` element that spans every column and uses
`grid-template-columns: subgrid` — so each child cell sits exactly in its parent's column, at any
depth. Children reuse the parent's columns: reorder, hide and pin apply automatically. The first
column is indented per depth (`--vg-subgrid-indent`), rows get `aria-level`, the grid becomes a
`treegrid`. With `loadSubRows` children are fetched on first expand.

Need children with a **different** set of columns? Put another `<VGrid>` in the `#detail` slot.

## Column menu, reorder, persistence

```vue
<VGrid :rows :columns row-key="id" storage="orders-grid">
  <template #toolbar="{ columnState, setColumnState }">
    <VGridColumnMenu :columns="columns" :column-state="columnState" @update:column-state="setColumnState($event!)" />
  </template>
</VGrid>
```

With `columnReorderFeature`, drag a header to move it (pointer events: mouse, pen, touch), or focus a header and press
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
  :rows :columns row-key="id"
  :context-menu="({ row, column, value }) => column.key === 'link' ? [] : [
    { name: 'copy', label: 'Copy', hint: 'Ctrl+C' },
    { name: 'open', label: `Open #${row.id}` },
    { separator: true },
    { name: 'delete', label: 'Delete', tone: 'danger', disabled: !row.canDelete },
  ]"
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
Pin items need `columnPinningFeature`, move items `columnReorderFeature`. Runtime pins are stored in column state (`columnState.pinned`) and persisted with `storage`.

```vue
<!-- extend (or replace) the built-in items; custom items emit header-action -->
<VGrid :header-menu="({ column, items }) => [{ name: 'copy', label: 'Copy column' }, { separator: true }, ...items]"
       @header-action="({ name, column }) => …" />
<VGrid :header-menu="false" />                  <!-- off -->
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
import { VGrid, VGridSearch, filteringFeature, numberRenderer, statusRenderer, type FilterState } from '@eboye/vue-grid'

const filters = ref<FilterState | null>(null)
const columns = [
  { key: 'player', header: 'Player', filterable: true },                          // text
  { key: 'stake', header: 'Stake', filterable: true, renderer: numberRenderer },  // number (from the renderer)
  { key: 'status', header: 'Status', filterable: true, renderer: statusRenderer },// value list
  { key: 'placedAt', header: 'Placed', filterable: true, filter: 'date' },        // explicit type
]
</script>

<template>
  <VGrid v-model:filters="filters" :rows :columns row-key="id" :features="[filteringFeature]"
         filter-row filter-storage="bets-filters">
    <template #toolbar="{ activeFilterCount, clearFilters }">
      <VGridSearch />
      <button v-if="activeFilterCount" @click="clearFilters()">Clear {{ activeFilterCount }} filters</button>
    </template>
  </VGrid>
</template>
```

- **Header funnel.** Each `filterable` column gets a funnel button. It is hidden until you hover the
  header (on devices that can hover) and stays visible while a filter is active. It opens a
  popover through the Popover API and CSS anchor positioning, and the popover holds an editor for
  the column's type:

  | Type | Editor | Operators |
  |---|---|---|
  | `text` | operator + value | contains, does not contain, equals, does not equal, starts with, ends with, is empty, is not empty |
  | `number` | operator + value(s) | `=` `≠` `<` `≤` `>` `≥`, between, is empty, is not empty |
  | `date` | operator + date(s) | on, before, after, between, is empty, is not empty |
  | `boolean` | radio group | any, yes, no, empty |
  | `set` | searchable checkbox list with counts | (the selected values) |
  | `custom` | your `filterComponent` | (anything; match it with `filterFn`) |

  The type comes from `filter`, else from the renderer (number, currency, change → `number`;
  date, datetime → `date`; boolean, checkbox, switch → `boolean`; status, chip → `set`), else
  `text`.
- **Filter row** (`filter-row`). An inline input under each header that accepts shorthand:
  `>10`, `>=10`, `5..20`, `!=3` and `>2026-01-01` for numbers and dates, plain text for text
  columns. Boolean columns get a select; value-list and custom columns get a button that opens the
  popover.
- **Quick search.** `<VGridSearch>` inside the `#toolbar` slot drives that grid's search. Anywhere
  else, bind it with `v-model` to `filters.search`. The search matches any visible column that is
  not marked `searchable: false`.
- **Matching** is case- and accent-insensitive (`nis` finds *Niš*). Dates compare by calendar day
  in the grid's `timeZone`. Column filters combine with AND, and then the search must match too.
- **Trees.** A row shows when it matches, when a descendant matches (so the path stays visible), or
  when an ancestor matched (so a matching group keeps its children). Select-all and cascade only
  touch rows that are visible.
- **Value lists from a backend.** Pass `filter: { type: 'set', options: (search, { signal }) => fetch(…) }`.
  The list is fetched when the popover opens and again on every search (debounced). Superseded
  requests are cancelled.
- The header menu has **Filter… / Clear filter / Clear all filters** items. When filters hide
  every row, the grid shows `noMatchText` with a *Clear filters* button.

The model is plain JSON, so you can store it, put it in the URL or send it to an API as is:

```ts
interface FilterState { columns: Record<string, ColumnFilter>; search?: string }
type ColumnFilter =
  | { type: 'text'; op: 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty'; value?: string }
  | { type: 'number'; op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'empty' | 'notEmpty'; value?: number | null; to?: number | null }
  | { type: 'date'; op: 'on' | 'before' | 'after' | 'between' | 'empty' | 'notEmpty'; value?: string; to?: string } // YYYY-MM-DD
  | { type: 'boolean'; value: boolean | null }
  | { type: 'set'; values: string[] }        // '' stands for blank cells
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
import { filteringFeature, paginationFeature, serverDataFeature, sortingFeature, type DataSource } from '@eboye/vue-grid'

const fetchBets: DataSource<Bet> = async (query, { signal }) => {
  // query: { sort: { key, dir } | null, filters: FilterState, page: number, pageSize: number | null }
  const res = await fetch('/api/bets', { method: 'POST', body: JSON.stringify(query), signal })
  if (!res.ok) throw new Error(res.statusText)
  return res.json() // { rows: Bet[], total?: number }
}
</script>

<template>
  <VGrid ref="grid" :data-source="fetchBets" :columns row-key="id" pagination filter-row @load-error="toast"
         :features="[serverDataFeature, sortingFeature, filteringFeature, paginationFeature]" />
</template>
```

- **Cancellation.** A new query aborts the previous request through `signal`, and a late response
  from a superseded request is ignored, so fast typing never shows stale rows.
- **States.** The grid shows a progress bar while loading. If the function throws, it shows
  *Couldn't load the rows.* with a *Retry* button and emits `load-error`.
- **Paging.** `pagination` adds the pager and sends `page` / `pageSize`; return `total` so the
  pager knows how many pages there are. Without `pagination`, `pageSize` is `null` (fetch
  everything). The page resets to 1 when sort or filters change.
- `grid.reload()` re-runs the current query, and `grid.patchLoadedRows(patches)` updates fields of
  rows that are already loaded without a refetch.

**2. `@query-change`: you fetch.** Keep `rows` under your control, set `sort-mode="controlled"`
and `filter-mode="controlled"`, and handle one event. The grid emits the combined query on mount
and on every change, and skips duplicates:

```vue
<VGrid :rows="rows" :columns row-key="id" :loading="loading" :features="[sortingFeature, filteringFeature]"
       sort-mode="controlled" filter-mode="controlled" @query-change="load" />
```

Use this when the data comes from a store, a WebSocket or a GraphQL client that you already manage.

## Pagination

`pagination` gives you a built-in pager under the grid. With client rows it slices the sorted and
filtered rows; with a `dataSource` it requests pages.

```vue
<VGrid :rows :columns row-key="id" :features="[paginationFeature]" :pagination="{ pageSizes: [10, 25, 50] }" v-model:page="page" v-model:page-size="pageSize" />
```

Or place the standalone component yourself and feed the grid one page at a time:

```vue
<VGrid v-model:sort="sort" :rows="pageRows" :columns row-key="id" :loading="loading" :features="[sortingFeature]" />
<VGridPagination v-model:page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 25, 50]" />
```

## Virtual scrolling

```vue
<VGrid :rows="tenThousandRows" :columns row-key="id" :virtual="{ rowHeight: 40 }" style="height: 600px" />
```

Rows have a fixed height; only the visible window plus `overscan` is rendered. Sub-rows and detail
rows are disabled in virtual mode.

## Keyboard

The grid is one tab stop. Arrow keys move between cells (header, rows, sub-grid rows, detail rows),
`Home`/`End`, `Ctrl+Home`/`Ctrl+End`, `PageUp`/`PageDown`; `ContextMenu` / `Shift+F10` opens the context menu. `Enter` sorts a header or activates the
cell's control; `Space` toggles row selection; `→`/`←` on a tree cell expands/collapses; `Alt+←/→` on a
header moves the column.

## Built-in renderers

**Display**

| Name | Options |
|---|---|
| `text` (default) | `ellipsis`, `lines`, `maxWidth`, `preserveNewlines`, `tooltip`, `placeholder`, `tone`, `toneMode` (`text`/`fill`), `bold`, `secondary` (muted suffix), `badge` + `badgePosition`, `icon`, `copyable` + `copyValue` → emits `copy` |
| `toggle-text` | `clickable`, `highlighted` → emits `toggle` |
| `number`, `signed-number` | `format` (`Intl.NumberFormatOptions`), `placeholder`, `clickable` → emits `click` |
| `currency` | `currency` (code or `(value, row) => code`), `format`, `placeholder`, `clickable` → emits `click` |
| `change` | `direction`, `currency`, `format`, `iconOnly` (arrow + colour; booleans / `'true'` = trend) |
| `date`, `datetime` | `format`, `placeholder`; `datetime`: `milliseconds`, `twoLines` |
| `boolean` | `trueLabel`, `falseLabel`, `nullLabel`, `display` (`text`/`icon`), `falseIcon` |
| `status` | `tone` (map / fn / constant), `label` (fn or value → label map), `dot`, `variant` (`soft`/`solid`/`outline`), `placeholder`, `clickable` → emits `click` |
| `chip` | `color` (any CSS colour, contrast text picked), `tone`, `label`, `tooltip`, `shape` (`square`/`circle`/`pill`), `size`; accepts `{ label \| name, color, description }` |
| `multi-line` | `lines` (builder; default: the value array), `boldLines`, `ellipsis`, `target`, `placeholder`; each line: `{ text, href, to, tone, fill, bold, muted, tooltip, trend, action, badge }` |
| `list` | `items`, `itemLabel`, `max` (default 1), `placeholder` → “+N more” toggle, emits `expand` |
| `link` | `href`, `to` (router location → `<RouterLink>` when vue-router is installed), `label`, `target`, `tooltip` → emits `click` |
| `icon` | `icon` / `iconFor`, `show`, `label`, `tone` |
| `image` | `src`, `baseUrl`, `alt`, `size`, `fit`, `shape`; placeholder when empty or broken |
| `code` | `language` (`auto`/`json`/`text`), `lines`, `indent`, `highlight` (JSON token colours) |
| `json` | `label`, `dialogTitle` (escaped JSON in a `<dialog>`) |
| `json-tree` | `collapseAt`, `maxDepth`, `parseNested`, `collapsed` + `toggleLabel`, `emptyText` |
| `details` | `tone`, `label`, `items` (`{ label, value, tone, detail, tooltip }[]`), `title`, `triggerLabel` → badge + info popover |

**Actions and editing** — editable renderers are *controlled*: they show the data and emit the requested
change; your `@cell-action` handler updates the row.

| Name | Options → emits |
|---|---|
| `actions-menu` | `actions: MenuItem[] \| (row) => MenuItem[]`, `label` → the item's `name` |
| `action-button` | `label`, `action`, `icon`, `tone`, `disabled`, `visible`, `variant` (`outline`/`solid`/`ghost`), `iconOnly` → `action` (default `click`) |
| `button-group` | `buttons: ButtonSpec[] \| (row) => ButtonSpec[]` (`{ name, label, tone, variant, disabled, icon, hidden }`) → the button's `name` |
| `copy` | `copyValue`, `iconOnly`, `title`, `label`, `placeholder` → `copy` (payload: copied text) / `copy-error` |
| `edit` | `format`, `placeholder`, `label`, `disabled`, `bold` → `edit` |
| `checkbox`, `switch` | `checked`, `disabled`, `disabledReason`, `label` → `change` (payload: the requested boolean) |
| `radio` | same + `name` → `select` (payload: the row key) |
| `icon-toggle` | `active`, `icon`, `activeIcon`, `activeTone`, `label`, `disabled` → `toggle` (payload: next state) |

```vue
<VGrid :rows="rows" :columns="[{ key: 'web', renderer: 'switch' }]" row-key="id"
       @cell-action="({ name, payload, rowKey }) => name === 'change' && setWeb(rowKey, payload)" />
```

Values option callbacks receive `(value, row)`. The component of every renderer is exported too
(`TextCell`, `CurrencyCell`, …) for composition.

## Writing a cell renderer (addons)

A renderer is a component plus a small definition. See
[`@eboye/vue-grid-renderer-template`](../cell-renderer-template) for a complete, publishable example.

```vue
<!-- RatingCell.vue -->
<script setup lang="ts">
import type { CellRendererEmits, CellRendererProps } from '@eboye/vue-grid'
const props = defineProps<CellRendererProps<unknown, number, { max?: number }>>()
const emit = defineEmits<CellRendererEmits>()
</script>
<template>
  <button v-for="n in options.max" :key="n" @click="emit('action', 'rate', n)">{{ n <= value ? '★' : '☆' }}</button>
</template>
```

```ts
import { defineCellRenderer } from '@eboye/vue-grid'
declare module '@eboye/vue-grid' {
  interface CellRendererRegistry { rating: { max?: number } }   // typed `renderer: 'rating'`
}
export const ratingRenderer = defineCellRenderer<{ max?: number }>({
  name: 'rating', component: RatingCell, defaults: { max: 5 }, sortValue: (v) => Number(v),
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

| Group | Tokens |
|---|---|
| Type | `--vg-font-family` `--vg-font-size` `--vg-line-height` `--vg-header-font-size` `--vg-header-font-weight` `--vg-header-letter-spacing` `--vg-header-text-transform` |
| Colour | `--vg-color-text` `-text-muted` `-surface` `-surface-raised` `-header-bg` `-header-text` `-border` `-border-strong` `-row-hover` `-row-selected` `-row-highlight` `-accent` `-accent-contrast` `-focus-ring` `-success` `-danger` `-warning` `-info` `-neutral` |
| Space & shape | `--vg-cell-padding-x/y` `--vg-header-padding-x/y` `--vg-gap` `--vg-radius` `--vg-radius-sm` `--vg-radius-pill` `--vg-border-width` `--vg-row-border` `--vg-header-border` `--vg-outer-border` `--vg-select-column-width` `--vg-expander-size` |
| Sub-grid | `--vg-subgrid-bg` `--vg-subgrid-indent` `--vg-subgrid-border` `--vg-subgrid-radius` |
| Elevation | `--vg-shadow-pinned` `--vg-shadow-popover` `--vg-z-header` `--vg-z-pinned` `--vg-z-pinned-header` `--vg-transition` `--vg-menu-gap` |
| Change highlight | `--vg-flash-color` `--vg-flash-up` `--vg-flash-down` `--vg-flash-duration` |

Colours use `light-dark()`: set `color-scheme: light dark` on `html` to follow the OS, or
`color-scheme: dark` to force dark. Stable class names (`.vg-header-cell`, `.vg-cell`, `.vg-row`,
`.vg-subgrid`, `.vg-pin-left`, …) and the `ui` prop are there for anything tokens don't cover.

## Browser support

Evergreen browsers: CSS `subgrid`, `light-dark()`, `@layer`, the Popover API and `<dialog>`
(Chrome/Edge 123+, Firefox 125+, Safari 17.5+).

**CSS first, JS only as a fallback.** Everything the browser can do in CSS / HTML is done there; a
small JS fallback runs only when a feature check (`CSS.supports`) says the browser can't:

| Behaviour | Done with | JS fallback when unsupported |
|---|---|---|
| Menu / popover placement, flipping, following the anchor on scroll | Popover API + CSS anchor positioning | measured placement, re-run on scroll / resize |
| Hiding a popover once its anchor scrolls out of view | `position-visibility: anchor-visible` | IntersectionObserver (e.g. Firefox 159) |
| Sticky offsets of pinned columns | `calc()` sums of the declared widths | ResizeObserver, only for content-sized pinned columns |
| Which pinned column gets the edge shadow | `:has()` / sibling selectors | a class |
| Shadow only while content is scrolled under pinned columns | `@container scroll-state(scrollable: …)` | scroll listener sets `data-vg-scrollable` |
| Readable text on data-coloured chips | `contrast-color()` / relative colours | computed black / white |
| Expand / collapse (JSON tree, “More info”, list “+N more”) | native `<details>` / `<summary>` | — |
| Closing the JSON dialog on a backdrop click | `<dialog closedby="any">` | backdrop click handler |

What stays in JS is what CSS can't express: data (sorting, selection, expansion state), keyboard
navigation, column drag, virtual scrolling and lazy loading.
