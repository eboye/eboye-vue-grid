# @nocopypaste/vue-grid — guide for coding agents

`<VGrid>` is a Vue 3 data grid laid out with CSS Grid (nested rows use `subgrid`). Everything
beyond a read-only table is an opt-in **feature**, and every cell type is an opt-in **renderer**,
so an app only bundles what it imports. This file is the shortest path to correct code; the full,
generated reference is [`agent/api.md`](agent/api.md) (also inside `llms-full.txt`), and
[`README.md`](README.md) explains each area in depth.

Machine-checkable: `validateGridConfig()` from `@nocopypaste/vue-grid/agent` checks a grid config and
says how to fix each problem; [`agent/grid-config.schema.json`](agent/grid-config.schema.json) is its
JSON Schema. The `@nocopypaste/vue-grid-mcp` MCP server serves all of this as tools.

## Rules (each one is a bug when skipped)

1. **Import the CSS once**: `import '@nocopypaste/vue-grid/style.css'` (in `main.ts`). Without it the
   grid has no layout.
2. **Register every feature an option needs.** `sortable`, `filterable`, `pagination`,
   `selectable`, `sub-rows`, `virtual`, `pinned`, `hidden`, `group`, `aggregate`, `totals`, `group-by`,
   `pinned-rows`, `context-menu`… each needs its feature (table below). Without it the option
   **silently does nothing** (dev builds log a `[vue-grid]` warning naming the feature). Per grid:
   `:features="[sortingFeature, filteringFeature]"`; app-wide: `createVueGrid({ features: [...] })`;
   everything: `allFeatures`. `features` is read once, when the grid is created.
3. **Pass renderer definitions**: `renderer: currencyRenderer` (imported). A string name
   (`renderer: 'currency'`) only works after registering it (`createVueGrid({ renderers: [currencyRenderer] })`
   or `:renderers`); unknown names fall back to text with a dev warning.
4. **`row-key` is required** and must be unique and stable (a property name or `(row) => id`).
5. **Sorting is controlled by default.** `sortable: true` plus `sortingFeature` only updates
   `v-model:sort`. For the grid to sort rows itself, add `sort-mode="client"`.
6. **Give the grid a bounded height** (`style="height: 480px"`, or a flex child with
   `min-height: 0`). Sticky headers, pinned rows, virtual scrolling and scroll-into-view need it.
7. **Virtual scrolling** needs `virtualScrollingFeature`, `:virtual="{ rowHeight: 40 }"` (every
   row that height, px) and a bounded height. `pagination` is ignored while `virtual` is on.
8. **Rows are never mutated** by the grid. To change a cell: assign the field on a reactive row, or
   replace rows (`patchRows(rows, patches, rowKey)` keeps unchanged rows' identity).
9. **Editable renderers are controlled** (`checkbox`, `switch`, `radio`, `icon-toggle`, `edit`,
   buttons, menus): they emit `@cell-action="{ name, payload, row, rowKey, column }"`; your handler
   updates the data.
10. **Type columns** with `const col = createColumnHelper<Row>()` → `col({ ... })`: `rendererOptions`
    are then checked against the chosen renderer.
11. **Server data** (`:data-source` + `serverDataFeature`): don't also pass `rows`; pass the
    `signal` to `fetch`; return `{ rows, total }` (`total` drives the pager).
12. Width is any CSS grid track as a **string**: `'8rem'`, `'1fr'`, `'minmax(10rem, 2fr)'`,
    `'min-content'` (default `auto`). Numbers are not accepted.

## Which feature for what

| The user wants… | Feature(s) | Props / column options |
|---|---|---|
| Click a header to sort | `sortingFeature` | column `sortable: true`; `sort-mode="client"` (or handle `v-model:sort`) |
| Filters per column, a filter row, quick search | `filteringFeature` | column `filterable: true` (`filter: 'text' \| 'number' \| 'date' \| 'boolean' \| 'set'`); `filter-row`; `<VGridSearch />` in `#toolbar` |
| Pages | `paginationFeature` | `pagination` (or `{ pageSizes: [10, 25, 50] }`), `v-model:page`, `v-model:page-size` |
| Backend sorting / filtering / paging | `serverDataFeature` (+ the above) | `:data-source="(query, { signal }) => Promise<{ rows, total }>"` |
| Checkboxes / row selection | `selectionFeature` | `selectable` (or `'single'`), `v-model:selected`, `is-row-selectable` |
| Nested child rows aligned to the parent's columns | `subGridsFeature` | `:sub-rows="(row) => row.children"` or `:load-sub-rows` + `:has-sub-rows` |
| An expandable panel under a row | — | `#detail="{ row }"` slot (`row-expandable` to limit it) |
| 10,000+ rows | `virtualScrollingFeature` | `:virtual="{ rowHeight: 40 }"` + bounded height |
| Right-click menus (cells, headers) | `menusFeature` | `:context-menu="(ctx) => MenuItem[]"` + `@context-action`; header menu is on by default |
| Freeze columns left / right | `columnPinningFeature` | column `pinned: 'left' \| 'right'` |
| Show / hide columns | `columnVisibilityFeature` | column `hidden: true`; `<VGridColumnMenu>` in `#toolbar` |
| Drag columns to reorder | `columnReorderFeature` | column `reorderable: false` to lock one |
| Drag column edges to resize | `columnResizingFeature` | `minWidth` / `maxWidth`, `resizable: false` |
| Grouped headers ("Q1" over three columns) | `columnGroupsFeature` | column `group: 'Q1'` |
| Rows that stay on top / bottom | `rowPinningFeature` | `v-model:pinned-rows="{ top: [id], bottom: [] }"`, `pinRow()`, `pinned-top-rows` |
| A totals row (sum, avg, …) | `aggregationFeature` | column `aggregate: 'sum' \| 'avg' \| 'min' \| 'max' \| 'count' \| fn`; `totals` (or `'top'`) |
| Group rows by a column ("by status, then city") | `rowGroupingFeature` | `v-model:group-by="['status', 'city']"`, `groups-expanded`; column `groupable: true` (header menu), `groupValue: (row) => …` (e.g. month); `aggregate` shows per group |
| Arrow-key navigation (ARIA grid) | `keyboardNavigationFeature` | — |
| Remember column layout | — | `storage="orders-grid"` (localStorage key) |
| Cell type (money, date, badge, link, …) | — | `renderer: currencyRenderer` etc. (list below) |

## Renderers (pick by data)

| Data | Renderer export | Useful options |
|---|---|---|
| Plain / long text | default (`text`) | `ellipsis`, `lines`, `tone`, `badge`, `copyable`, `tooltip` |
| Numbers | `numberRenderer` | `format` (Intl), `clickable` |
| Money | `currencyRenderer` | `currency` (code or `(v, row) => code`) |
| Up / down change | `changeRenderer` | `direction`, `currency`, `iconOnly` |
| Dates / date-times | `dateRenderer` / `dateTimeRenderer` | `format`, `twoLines` |
| Yes / no | `booleanRenderer` | `display: 'icon'`, labels |
| Status badge | `statusRenderer` | `tone: { Paid: 'success', Open: 'info' }`, `label`, `variant` |
| Colour chip / tag | `chipRenderer` | `color`, `tone`, `shape` |
| Links | `linkRenderer` | `href` / `to` (vue-router), `label`, `target` |
| Several lines in one cell | `multiLineRenderer` | `lines: (v, row) => [...]` |
| Arrays | `listRenderer` | `max`, `itemLabel` |
| Images | `imageRenderer` | `src`, `size`, `shape` |
| JSON / code | `jsonTreeRenderer`, `jsonRenderer`, `codeRenderer` | `collapseAt`, `language` |
| Badge + info popover | `detailsRenderer` | `items: (v, row) => [{ label, value }]` |
| Buttons / menus | `actionButtonRenderer`, `buttonGroupRenderer`, `actionsMenuRenderer` | `action`, `buttons`, `actions` |
| Toggles / inputs (controlled) | `checkboxRenderer`, `switchRenderer`, `radioRenderer`, `iconToggleRenderer`, `editRenderer` | handle `@cell-action` |
| Copy to clipboard | `copyRenderer` | `copyValue`, `iconOnly` |

Every option is in `agent/api.md` → Renderers. Options typed `RowFn` / `RowOption` also take
`(value, row) => …`. Status / chip / details `tone`s: `success`, `danger`, `warning`, `info`,
`neutral`, `accent`.

## Recipes

### Basic sortable table

```vue
<script setup lang="ts">
import { VGrid, createColumnHelper, currencyRenderer, dateRenderer, sortingFeature, statusRenderer } from '@nocopypaste/vue-grid'

interface Order { id: number; customer: { name: string }; total: number; status: 'Paid' | 'Open'; placedAt: string }
defineProps<{ orders: Order[] }>()

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content' }),
  col({ key: 'customer', header: 'Customer', field: 'customer.name', sortable: true, width: 'minmax(10rem, 1fr)' }),
  col({ key: 'total', header: 'Total', renderer: currencyRenderer, sortable: true }),
  col({ key: 'status', header: 'Status', renderer: statusRenderer, rendererOptions: { tone: { Paid: 'success', Open: 'info' } } }),
  col({ key: 'placedAt', header: 'Placed', renderer: dateRenderer, sortable: true }),
]
</script>

<template>
  <VGrid :rows="orders" :columns="columns" row-key="id" :features="[sortingFeature]" sort-mode="client" style="height: 480px" />
</template>
```

### Filters, quick search, column picker and saved layout

```vue
<script setup lang="ts">
import {
  VGrid, VGridColumnMenu, VGridSearch,
  columnVisibilityFeature, filteringFeature, sortingFeature, type FilterState,
} from '@nocopypaste/vue-grid'
const filters = ref<FilterState | null>(null)
// columns: add `filterable: true` (type from the renderer, or `filter: 'date'` etc.)
</script>

<template>
  <VGrid v-model:filters="filters" :rows="rows" :columns="columns" row-key="id" filter-row sort-mode="client"
         storage="orders-grid" filter-storage="orders-filters"
         :features="[sortingFeature, filteringFeature, columnVisibilityFeature]" style="height: 480px">
    <template #toolbar="{ columnState, setColumnState, activeFilterCount, clearFilters }">
      <VGridSearch />
      <button v-if="activeFilterCount" @click="clearFilters()">Clear {{ activeFilterCount }}</button>
      <VGridColumnMenu :columns="columns" :column-state="columnState" @update:column-state="setColumnState($event!)" />
    </template>
  </VGrid>
</template>
```

### Server data with paging

```ts
import { filteringFeature, paginationFeature, serverDataFeature, sortingFeature, type DataSource } from '@nocopypaste/vue-grid'

const fetchOrders: DataSource<Order> = async (query, { signal }) => {
  // query: { sort: { key, dir } | null, filters: { columns, search }, page, pageSize }
  const res = await fetch('/api/orders/search', { method: 'POST', body: JSON.stringify(query), signal })
  if (!res.ok) throw new Error(res.statusText) // the grid shows an error with Retry, emits load-error
  return res.json() as Promise<{ rows: Order[]; total: number }>
}
```

```vue
<VGrid :data-source="fetchOrders" :columns="columns" row-key="id" pagination filter-row
       :features="[serverDataFeature, sortingFeature, filteringFeature, paginationFeature]" style="height: 520px" />
```

Server totals: pass them as `:aggregates="{ total: 125000 }"` with `totals` and `aggregationFeature`.

### Tree: nested and lazy child rows

```vue
<!-- synchronous children -->
<VGrid :rows="markets" :columns="columns" row-key="id" :sub-rows="(m) => m.children" :features="[subGridsFeature]" />
<!-- lazy children, fetched on first expand -->
<VGrid :rows="folders" :columns="columns" row-key="id" :load-sub-rows="loadChildren" :has-sub-rows="(f) => f.hasChildren"
       v-model:expanded="expanded" :features="[subGridsFeature]" />
```

Children share the parent's columns. For a different set of columns, use the `#detail` slot with
another `<VGrid>` inside.

### Detail row

```vue
<VGrid :rows="orders" :columns="columns" row-key="id">
  <template #detail="{ row }"><OrderLines :order-id="row.id" /></template>
</VGrid>
```

### Selection

```vue
<VGrid v-model:selected="selected" :rows="rows" :columns="columns" row-key="id" selectable
       :is-row-selectable="(r) => r.status !== 'locked'" :features="[selectionFeature]" />
```

### 10,000+ rows

```vue
<VGrid :rows="bigList" :columns="columns" row-key="id" :virtual="{ rowHeight: 40 }" sort-mode="client"
       :features="[virtualScrollingFeature, sortingFeature]" style="height: 600px" />
```

### Totals and pinned rows

```ts
const columns = [
  col({ key: 'customer', aggregate: 'count' }),
  col({ key: 'total', renderer: currencyRenderer, aggregate: 'sum' }),
]
const pinned = ref<PinnedRowsState>({ top: [42] })
```

```vue
<VGrid ref="grid" v-model:pinned-rows="pinned" :rows="rows" :columns="columns" row-key="id" totals
       :features="[aggregationFeature, rowPinningFeature]" style="height: 480px" />
<!-- grid.value.pinRow(key, 'top' | 'bottom' | null) from your own button or context menu -->
```

### Row grouping

```ts
const columns = [
  col({ key: 'customer', field: 'customer.name' }),
  col({ key: 'status', renderer: statusRenderer, groupable: true }),
  col({ key: 'placedAt', renderer: dateRenderer, groupable: true, groupValue: (o) => o.placedAt.slice(0, 7) }),
  col({ key: 'total', renderer: currencyRenderer, aggregate: 'sum' }), // shown in every group row
]
const groupBy = ref(['status'])
```

```vue
<VGrid v-model:group-by="groupBy" :rows="orders" :columns="columns" row-key="id" sort-mode="client"
       :features="[rowGroupingFeature, sortingFeature, menusFeature]" style="height: 480px" />
```

Groups start collapsed (`groups-expanded` to open them); the group label sits in the first
visible column, so keep that column wide enough (or give the next columns no `aggregate`, so the
label runs across them). `#group-<key>="{ value, count }"` renders a group's value yourself.

### Row actions and context menu

```vue
<script setup lang="ts">
import { actionsMenuRenderer, menusFeature, type CellActionEvent, type CellContext, type MenuItem } from '@nocopypaste/vue-grid'
const columns = [
  /* … */
  col({ key: 'actions', header: '', width: 'min-content', renderer: actionsMenuRenderer,
        rendererOptions: { actions: [{ name: 'edit', label: 'Edit' }, { separator: true }, { name: 'delete', label: 'Delete', tone: 'danger' }] } }),
]
const cellMenu = (ctx: CellContext<Order>): MenuItem[] => [{ name: 'copy', label: `Copy ${ctx.column.header}` }]
function onAction(e: CellActionEvent<Order>) { if (e.name === 'delete') remove(e.rowKey) }
</script>

<template>
  <VGrid :rows :columns row-key="id" :context-menu="cellMenu" :features="[menusFeature]"
         @cell-action="onAction" @context-action="(e) => copy(String(e.value))" />
</template>
```

### Editable checkbox (controlled)

```ts
col({ key: 'active', renderer: switchRenderer })
// <VGrid … @cell-action="(e) => { if (e.column.key === 'active') e.row.active = e.payload }" />
```

### Your own renderer

```ts
import { defineCellRenderer } from '@nocopypaste/vue-grid'
import RatingCell from './RatingCell.vue' // props: CellRendererProps<Row, number, { max?: number }>; emit('action', 'rate', n)
export const ratingRenderer = defineCellRenderer<{ max?: number }>({ name: 'rating', component: RatingCell, defaults: { max: 5 } })
// column: { key: 'rating', renderer: ratingRenderer, rendererOptions: { max: 10 } }
```

### Theming

```css
.my-grid { --vg-color-accent: #db2777; --vg-radius: 1rem; --vg-font-size: 0.8125rem; }
```

Tokens: `--vg-*` (see README → Theming). Dark mode follows `color-scheme`. Density:
`density="compact" | "cozy" | "comfortable"`. Utility classes per part: `:ui="{ cell: 'px-2' }"`.

## Check your work

1. Validate the config: `validateGridConfig({ columns, rowKey: 'id', features: ['sortingFeature'], sortMode: 'client' })`
   from `@nocopypaste/vue-grid/agent` (or the MCP tool `vue_grid_validate`). Fix every `error`; read the
   `warning`s.
2. Run the app in dev mode and read the console: `[vue-grid]` warnings name a missing feature, an
   unknown renderer or a duplicate row key.
3. Look at it in a browser: the header sticks, rows scroll inside the grid, the features you added
   respond (sort a column, open a filter, expand a row).

## Pitfalls

- Nothing sorts → `sort-mode="client"` missing (or `sortingFeature` missing).
- Columns are squeezed / the page scrolls sideways → give `width`s (`minmax(8rem, 1fr)`); the grid
  scrolls horizontally inside itself when columns are wider than it.
- Grid grows forever / no sticky header → no bounded height.
- The page scrolls sideways on a phone → an element you wrapped the grid in sits in a flex or grid
  layout without `min-width: 0` (so it grows to the columns' width). Add `min-width: 0` to it;
  `<VGrid>`'s own root already has it.
- `renderer: 'currency'` shows plain text → the renderer isn't registered; import and pass `currencyRenderer`.
- Changing `:features` later does nothing → features are read at creation; re-create with `:key`.
- Virtual grid with variable row content → rows must share `rowHeight`; use `lines`/`ellipsis` to keep them uniform.
- `dataSource` plus `rows` → `rows` is ignored with a data source.
- A nested child with different columns → not a sub-grid; use `#detail` with another `<VGrid>`.
- One group per date or timestamp → group by a coarser value: `groupValue: (row) => row.date.slice(0, 7)`.
- `group-by` names a field, not a column → it takes column `key`s; add a (hidden) column for it.
