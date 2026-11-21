# @eboye/vue-grid

A data grid for Vue 3 built on **CSS Grid** — with real `subgrid` sub-rows, pinned columns, column
reorder/visibility with persistence, selection, virtual scrolling, pagination, a pluggable
**cell-renderer registry** for 3rd-party addons, and a theme you customise with **CSS variables**.

- Vue `^3.5` peer dependency, zero runtime dependencies, fully typed (`<VGrid generic="T">`).
- Plain CSS in `@layer vue-grid` — your CSS / Tailwind utilities override it without `!important`.
- No `v-html` / `innerHTML` anywhere; link renderer drops `javascript:` URLs.

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
  .use(createVueGrid({ locale: 'en-US', currency: 'EUR' })) // optional: app-wide defaults + addon renderers
  .mount('#app')
```

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VGrid, createColumnHelper, type SortState } from '@eboye/vue-grid'

interface Order { id: number; customer: { name: string }; total: number; status: 'Paid' | 'Open'; placedAt: string }

const rows = ref<Order[]>([/* … */])
const sort = ref<SortState | null>(null)

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'id', header: '#', renderer: 'number', width: 'min-content', pinned: 'left' }),
  col({ key: 'customer', header: 'Customer', field: 'customer.name', sortable: true, width: 'minmax(10rem, 1fr)' }),
  col({ key: 'total', header: 'Total', renderer: 'currency', sortable: true }),
  col({ key: 'status', header: 'Status', renderer: 'status', rendererOptions: { tone: { Paid: 'success', Open: 'info' } } }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'datetime' }),
]
</script>

<template>
  <VGrid v-model:sort="sort" :rows="rows" :columns="columns" row-key="id" sort-mode="client" style="height: 480px" />
</template>
```

`createColumnHelper<T>()` is optional; it infers each column's `renderer` so `rendererOptions` is
type-checked against that renderer (including addon renderers).

## `<VGrid>` API

### Props

| Prop | Type | Default | |
|---|---|---|---|
| `rows` | `T[]` | — | Your data objects, used as-is (never mutated). |
| `columns` | `ColumnDef<T>[]` | — | See below. |
| `rowKey` | `keyof T \| (row) => string \| number` | — | Stable unique id; all row state is keyed by it. |
| `v-model:sort` | `{ key, dir: 'asc' \| 'desc' } \| null` | `null` | Header click cycles asc → desc → none. |
| `sortMode` | `'controlled' \| 'client'` | `'controlled'` | `controlled` only emits (server-side sorting). |
| `v-model:columnState` | `{ order: string[]; hidden: string[] }` | derived | Column order & visibility. |
| `storage` | `string \| ColumnStateStorage` | — | Persist column state (`string` = localStorage key). |
| `v-model:expanded` | `RowKey[]` | `[]` | Expanded rows (sub-grids and detail rows). |
| `subRows` | `(row) => T[] \| undefined` | — | Synchronous children → sub-grid. |
| `loadSubRows` | `(row) => Promise<T[]>` | — | Lazy children (cached, loading/error/retry). |
| `hasSubRows` | `(row) => boolean` | — | Which rows get an expander when lazy. |
| `rowExpandable` | `(row) => boolean` | — | Which rows can open the `#detail` slot. |
| `selectable` | `boolean \| 'single'` | `false` | Adds a selection column. |
| `v-model:selected` | `RowKey[]` | `[]` | |
| `selectionMode` | `'cascade' \| 'independent'` | `'cascade'` | Whether selecting a parent selects its children. |
| `isRowSelectable` | `(row) => boolean` | — | |
| `virtual` | `{ rowHeight: number; overscan?: number } \| false` | `false` | Fixed-height virtual scrolling. |
| `rowClickable` | `boolean` | `false` | Pointer cursor; `row-click` is always emitted. |
| `rowClass` | `(row, index) => ClassValue` | — | |
| `highlightedRows` | `RowKey[]` | — | |
| `renderers` | `CellRendererDefinition[]` | — | Local renderers (override plugin/built-ins by name). |
| `locale` / `currency` / `timeZone` | `string` | plugin → browser | Formatting context for renderers. |
| `density` | `'compact' \| 'cozy' \| 'comfortable'` | `'cozy'` | Scales cell padding. |
| `loading` | `boolean` | `false` | Progress bar + `aria-busy`. |
| `emptyText` | `string` | `'No data to show.'` | |
| `ariaLabel` | `string` | — | |
| `ui` | `Partial<Record<'root' \| 'header' \| 'headerCell' \| 'row' \| 'cell' \| 'subgrid' \| 'detail' \| 'empty', ClassValue>>` | — | Extra classes per part (Tailwind-friendly). |

### Events

`row-click(row, event)` · `cell-click({ row, rowKey, column, value, event })` (columns with `clickable: true`) ·
`cell-action({ name, payload, row, rowKey, column })` (from renderers) · `sub-rows-error({ row, error })` ·
plus the `update:*` events of every `v-model`.

Clicks on links, buttons and inputs inside a cell never trigger `row-click`.

### Slots

`cell-<key>` (`{ row, value, rowKey, rowIndex, depth, column }`) · `header-<key>` (`{ column }`) ·
`detail` (`{ row, rowKey, depth }`) · `toolbar` (`{ columns, columnState, setColumnState }`) ·
`empty` · `loading` · `sub-rows-loading` (`{ row }`).

### Exposed methods

```ts
const grid = ref<VGridExposed>()
grid.value?.scrollToTop() / scrollToRow(key) / expandAll() / collapseAll() / setColumnState(state)
```

### `ColumnDef<T>`

```ts
{
  key: string                    // unique; used by sort, column state and slot names
  header?: string; headerTooltip?: string
  field?: string                 // dot path, defaults to key
  value?: (row) => unknown       // computed value, wins over field
  renderer?: string | Component  // default 'text'
  rendererOptions?: object
  width?: string                 // any grid track: 'auto' (default), '8rem', '1fr', 'minmax(8rem, 2fr)', 'min-content'
  minWidth?: string              // combined into minmax(minWidth, width)
  align?: 'start' | 'center' | 'end'
  sortable?: boolean; sortValue?: (row) => unknown; sortFn?: (a, b) => number
  pinned?: 'left' | 'right'
  hidden?: boolean; hideable?: boolean; reorderable?: boolean
  clickable?: boolean
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

Drag a header to move it (pointer events: mouse, pen, touch), or focus a header and press
**Alt+←/→**. Pinned columns only move within their pin group. Stored state is reconciled with the
current column definitions (unknown keys dropped, new columns appended).

## Pagination

```vue
<VGrid v-model:sort="sort" :rows="pageRows" :columns row-key="id" :loading="loading" />
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
`Home`/`End`, `Ctrl+Home`/`Ctrl+End`, `PageUp`/`PageDown`. `Enter` sorts a header or activates the
cell's control; `Space` toggles row selection; `→`/`←` on a tree cell expands/collapses; `Alt+←/→` on a
header moves the column.

## Built-in renderers

| Name | Options |
|---|---|
| `text` (default) | `ellipsis`, `lines`, `maxWidth`, `tooltip`, `placeholder`, `tone` |
| `toggle-text` | `clickable`, `highlighted` → emits `toggle` |
| `number`, `signed-number` | `format` (`Intl.NumberFormatOptions`), `placeholder` |
| `currency` | `currency` (code or `(value, row) => code`), `format` |
| `change` | `direction`, `currency`, `format` (arrow + colour) |
| `date`, `datetime` | `format`, `placeholder`; `datetime`: `milliseconds`, `twoLines` |
| `boolean` | `trueLabel`, `falseLabel`, `nullLabel` |
| `status` | `tone` (map / fn / constant), `label`, `dot` |
| `link` | `href`, `label`, `target` → emits `click` |
| `icon` | `icon` / `iconFor`, `show`, `label`, `tone` |
| `json` | `label`, `dialogTitle` (escaped JSON in a `<dialog>`) |
| `json-tree` | `collapseAt` |
| `actions-menu` | `actions: [{ name, label, disabled?, tone? }] \| (row) => …`, `label` → emits the action name |
| `action-button` | `label`, `action`, `icon`, `tone`, `disabled` |

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
column component → `:renderers` → plugin → built-ins.

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
| Elevation | `--vg-shadow-pinned` `--vg-shadow-popover` `--vg-z-header` `--vg-z-pinned` `--vg-z-pinned-header` `--vg-transition` |

Colours use `light-dark()`: set `color-scheme: light dark` on `html` to follow the OS, or
`color-scheme: dark` to force dark. Stable class names (`.vg-header-cell`, `.vg-cell`, `.vg-row`,
`.vg-subgrid`, `.vg-pin-left`, …) and the `ui` prop are there for anything tokens don't cover.

## Browser support

Evergreen browsers: CSS `subgrid`, `light-dark()`, `@layer`, the Popover API and `<dialog>`
(Chrome/Edge 123+, Firefox 125+, Safari 17.5+).
