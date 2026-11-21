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
  <VGrid v-model:sort="sort" :rows="rows" :columns="columns" row-key="id" sort-mode="client" style="height: 480px" />
</template>
```

`createColumnHelper<T>()` is optional; it types each column's `rendererOptions` from its renderer.

## Tree-shaking: import only what you use

The package is ESM, one file per module, with `sideEffects` limited to CSS — bundlers keep only
what you import.

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

| Import (minified / gzip, Vue excluded) | Bundled |
|---|---|
| `VGrid` | 41.2 kB / 14.5 kB |
| `VGrid` + `currencyRenderer` | 42.6 kB / 15.0 kB |
| `VGrid` + `VGridPagination` + `VGridColumnMenu` | 46.3 kB / 16.1 kB |
| `sortRows` only | 0.7 kB / 0.4 kB |
| everything | 81.4 kB / 25.4 kB |

## `<VGrid>` API

### Props

| Prop | Type | Default | |
|---|---|---|---|
| `rows` | `T[]` | — | Your data objects, used as-is (never mutated). |
| `columns` | `ColumnDef<T>[]` | — | See below. |
| `rowKey` | `keyof T \| (row) => string \| number` | — | Stable unique id; all row state is keyed by it. |
| `v-model:sort` | `{ key, dir: 'asc' \| 'desc' } \| null` | `null` | Header click cycles asc → desc → none. |
| `sortMode` | `'controlled' \| 'client'` | `'controlled'` | `controlled` only emits (server-side sorting). |
| `v-model:columnState` | `{ order: string[]; hidden: string[]; pinned?: Record<string, "left" \| "right" \| null> }` | derived | Column order, visibility and runtime pins. |
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
| `flash` | `boolean \| 'direction'` | `false` | Briefly highlight cells whose value changes; `'direction'` = green up / red down. Columns override with `flash`. |
| `renderers` | `CellRendererDefinition[]` | — | Renderers usable by name in this grid (override plugin ones). |
| `locale` / `currency` / `timeZone` | `string` | plugin → browser | Formatting context for renderers. |
| `density` | `'compact' \| 'cozy' \| 'comfortable'` | `'cozy'` | Scales cell padding. |
| `loading` | `boolean` | `false` | Progress bar + `aria-busy`. |
| `emptyText` | `string` | `'No data to show.'` | |
| `ariaLabel` | `string` | — | |
| `contextMenu` | `(ctx: { row, rowKey, column, value }) => MenuItem[] \| null` | — | Right-click menu for body cells. |
| `headerMenu` | `boolean \| ({ column, items }) => MenuItem[] \| null` | `true` | Built-in header menu (sort, pin, move, hide, reset). |
| `ui` | `Partial<Record<'root' \| 'header' \| 'headerCell' \| 'row' \| 'cell' \| 'subgrid' \| 'detail' \| 'empty', ClassValue>>` | — | Extra classes per part (Tailwind-friendly). |

### Events

`row-click(row, event)` · `cell-click({ row, rowKey, column, value, event })` (columns with `clickable: true`) ·
`cell-action({ name, payload, row, rowKey, column })` (from renderers) · `sub-rows-error({ row, error })` · `context-action({ name, item, row, rowKey, column, value })` · `header-action({ name, item, column })` ·
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
grid.value?.patchLoadedRows([{ id: 'c2', city: 'Niš' }]) // field updates for lazily loaded children
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
  pinned?: 'left' | 'right'; pinnable?: boolean   // pinnable: can the header menu change it (default true)
  hidden?: boolean; hideable?: boolean; reorderable?: boolean
  clickable?: boolean
  flash?: boolean | 'direction'  // change highlight for this column (overrides the grid's `flash`)
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
Runtime pins are stored in column state (`columnState.pinned`) and persisted with `storage`.

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
