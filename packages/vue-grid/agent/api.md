# @nocopypaste/vue-grid 0.2.0 — API reference

> Generated from the TypeScript sources (`scripts/gen-agent.mjs`). Machine-readable: `agent/api.json`, `agent/grid-config.schema.json`.

## Features

Opt-in: pass them as `:features="[…]"` on `<VGrid>` or once via `createVueGrid({ features })` (`allFeatures` = all). An option whose feature is missing does nothing.

| Export | What it enables | Props | Column options |
|---|---|---|---|
| `aggregationFeature` | Aggregates and the totals row: columns with an `aggregate` (`sum`, `avg`, `min`, `max`, `count` or a function) and `totals` (`true` / `'bottom'` or `'top'`) show a sticky totals row over the rows that pass the filters, on every page. `aggregates` supplies the values instead (e.g. from a server). Without it, `aggregate` and `totals` are ignored. | `totals` `totalsLabel` `aggregates` | `aggregate` |
| `columnGroupsFeature` | Grouped column headers: give columns a `group` and adjacent visible columns of the same group get one header cell spanning them, in a sticky row above the column headers. Groups follow reordering, hiding and pinning (a pin boundary splits a group). Without it, `group` is ignored. |  | `group` |
| `columnPinningFeature` | Pinned columns: `pinned: 'left' \| 'right'` columns stay put (sticky) while the grid scrolls sideways, with edge shadows; runtime pins from the header menu (Pin left / Pin right / Unpin) are kept in `v-model:column-state` and persisted with `storage`. Without it, pins are ignored. |  | `pinned` `pinnable` |
| `columnReorderFeature` | Column reordering: drag a header (mouse, pen, touch), Alt+←/→ on a focused header, and the header menu's Move left / Move right. Columns opt out with `reorderable: false`. The order is part of `v-model:column-state` and persisted with `storage`; `<VGridColumnMenu>` works without it. |  | `reorderable` |
| `columnResizingFeature` | Column resizing: drag a header's edge (mouse, pen, touch), use ←/→ on the focused edge (Alt+Shift+←/→ on a header with keyboard navigation), or double-click the edge to fit the content. `minWidth` / `maxWidth` bound it; columns opt out with `resizable: false`. Widths are kept in `columnState.widths` and persisted with `storage`. The header menu gains Fit width / Reset width. |  | `maxWidth` `resizable` |
| `columnVisibilityFeature` | Column visibility: `hidden: true` columns, `columnState.hidden` (persisted with `storage`), the header menu's Hide column item and `<VGridColumnMenu>`'s checkboxes. Columns opt out with `hideable: false`. Without it, every column shows. |  | `hidden` `hideable` |
| `filteringFeature` | Filtering: header funnels with typed filter popovers on `filterable` columns, the filter row, `<VGridSearch>`, the filter items of the header menu, `v-model:filters` and filter persistence. The popover body and the filter-row editors load on demand (own chunks). | `filterMode` `filterRow` `filterStorage` `noMatchText` `filters` | `filterable` `filter` `filterValue` `filterFn` `filterComponent` `searchable` |
| `keyboardNavigationFeature` | Keyboard navigation (the ARIA grid pattern): the grid is one tab stop, arrow keys / Home / End / PageUp / PageDown move between cells, Enter activates a cell's control, Space selects a row, →/← expand and collapse, Alt+←/→ move a column, ContextMenu / Shift+F10 open the cell menu. Without it the grid is an ARIA `table`: its own controls (sort buttons, expanders, checkboxes, filter buttons) sit in the normal Tab order instead. |  |  |
| `menusFeature` | Context menus: the built-in header menu (sort, filter, pin, move, hide, reset, your own items via `header-menu`) and body-cell menus (`context-menu`), opened by right-click, the ContextMenu key or Shift+F10. Without it the browser's own menu shows. The standalone `<VGridMenu>` and the `actions-menu` renderer don't need it. | `contextMenu` `headerMenu` |  |
| `paginationFeature` | Built-in pagination: the `pagination` prop and `v-model:page` / `v-model:page-size`. Pages the client rows, or asks the `dataSource` for pages. The pager loads on demand (own chunk). Not needed for the standalone `<VGridPagination>` component. | `pagination` `page` `pageSize` |  |
| `rowGroupingFeature` | Row grouping: `v-model:group-by="['region', 'status']"` groups the rows by those columns into collapsible group rows with their value, row count and the aggregates of columns with an `aggregate`. Columns with `groupable: true` get Group by / Ungroup items in the header menu. Without it, `group-by` is ignored. | `groupsExpanded` `groupBy` | `groupable` `groupValue` |
| `rowPinningFeature` | Pinned rows: `v-model:pinned-rows` (`{ top, bottom }` row keys), `pinned-top-rows` / `pinned-bottom-rows` (extra rows that aren't in the data) and the `pinRow()` method. Pinned rows stay in view (sticky) under the header or at the bottom while the body scrolls, and aren't filtered, sorted or paged. Without it, those options are ignored. | `pinnedTopRows` `pinnedBottomRows` `pinnedRows` |  |
| `selectionFeature` | Row selection: the `selectable` prop (multi or single), `v-model:selected`, `selection-mode` (cascade through sub-grids), `is-row-selectable`, Space on a row and the select-all checkbox. | `selectable` `selectionMode` `isRowSelectable` `selected` |  |
| `serverDataFeature` | Server data: the `dataSource` prop. The grid sends sort, filters and page to your function, cancels superseded requests, and shows loading, error and retry states. | `dataSource` |  |
| `sortingFeature` | Sorting: the sort button on `sortable` column headers, the sort items of the header menu and, with `sort-mode="client"`, sorting the rows in the browser. |  | `sortable` `sortValue` `sortFn` |
| `subGridsFeature` | Sub-grids: nested child rows in a CSS `subgrid`, from `sub-rows` (synchronous) or `load-sub-rows` (lazy, cached, with loading / error / retry). Detail rows (`#detail` slot) don't need it. | `subRows` `loadSubRows` `hasSubRows` |  |
| `virtualScrollingFeature` | Virtual scrolling: `:virtual="{ rowHeight, overscan?, detailHeight? }"` renders only the rows in view (plus `overscan`), so tens of thousands of rows stay fast — sub-grids and detail rows included, inside the same CSS grid / subgrid layout. Without it, `virtual` is ignored and every row renders. | `virtual` |  |

## `<VGrid>` props

| Prop | Type | Default | Needs | Description |
|---|---|---|---|---|
| `rows` | `readonly T[]` | `[]` |  | The rows (client data), used as-is and never mutated. Omit when using `dataSource`. |
| `columns` (required) | `readonly ColumnDef<T>[]` |  |  | Column definitions, in default display order (see `ColumnDef`). |
| `rowKey` (required) | `RowKeyGetter<T>` |  |  | Stable unique id of a row: a property name or `(row) => string \| number`. All row state is keyed by it. |
| `features` | `readonly GridFeature[]` |  |  | Opt-in features for this grid (added to the app-wide `createVueGrid({ features })`): `sortingFeature`, `filteringFeature`, `serverDataFeature`, `paginationFeature`, or `allFeatures`. Read once, when the grid is created. |
| `dataSource` | `DataSource<T>` |  | `serverDataFeature` | Server data: called with the current query (sort, filters, search, page) whenever it changes. The grid cancels superseded requests, shows loading and errors, and sorts / filters / pages nothing itself. |
| `pagination` | `boolean \| { pageSizes?: number[] }` | `false` | `paginationFeature` | Built-in pagination under the grid (server-side with `dataSource`, client-side otherwise). |
| `sortMode` | `'controlled' \| 'client'` | `'controlled'` |  | `controlled` (default): a header click only updates `v-model:sort` (sort on the server or in your own code). `client`: the grid sorts the rows itself. Ignored with `dataSource`. |
| `filterMode` | `'client' \| 'controlled'` | `'client'` | `filteringFeature` | `client` (default): the grid filters its rows. `controlled`: it only emits `update:filters`. |
| `filterRow` | `boolean` | `false` | `filteringFeature` | Show the filter row: an input under each filterable column's header. |
| `filterStorage` | `FilterStateStorage \| string` |  | `filteringFeature` | Persist the filter model (`string` = localStorage key). |
| `noMatchText` | `string` | `'No rows match the current filters.'` | `filteringFeature` | Shown when filters hide every row. |
| `selectable` | `boolean \| 'single'` | `false` | `selectionFeature` | A selection column: `true` = multi-select (with select-all), `'single'` = one row. |
| `selectionMode` | `'cascade' \| 'independent'` | `'cascade'` | `selectionFeature` | `cascade` (default): selecting a parent selects its children. `independent`: rows alone. |
| `isRowSelectable` | `(row: T) => boolean` |  | `selectionFeature` | Rows that can't be selected get a disabled checkbox. |
| `subRows` | `(row: T) => T[] \| undefined \| null` |  | `subGridsFeature` | Synchronous child rows of a row: shown in a nested sub-grid when expanded. |
| `loadSubRows` | `(row: T) => Promise<T[]>` |  | `subGridsFeature` | Lazy child rows, loaded on first expand (cached, with loading / error / retry). |
| `hasSubRows` | `(row: T) => boolean` |  | `subGridsFeature` | With `loadSubRows`: which rows get an expander (default: every row). |
| `rowExpandable` | `(row: T) => boolean` |  |  | With a `#detail` slot: which rows can expand to show it (default: every row). |
| `rowClickable` | `boolean` | `false` |  | Pointer cursor on rows (`row-click` is emitted either way). |
| `rowClass` | `(row: T, index: number) => ClassValue` |  |  | Extra classes for a row. |
| `highlightedRows` | `readonly RowKey[]` |  |  | Keys of rows to highlight (e.g. the row being edited). |
| `flash` | `FlashMode` |  |  | Briefly highlight cells whose value changes (live data, enrichment). Columns can override. |
| `virtual` | `VirtualOptions \| false` | `false` | `virtualScrollingFeature` | Virtual scrolling: only the rows in view render. Rows share one height (`rowHeight`, px) and the grid needs a bounded height. Needs the virtual scrolling feature. |
| `storage` | `ColumnStateStorage \| string` |  |  | Persist column state (order, hidden, pins, widths): a localStorage key or your own storage. |
| `renderers` | `CellRendererDefinition[]` |  |  | Renderers usable by name in this grid (merged over the app-wide ones). |
| `locale` | `string` |  |  | Locale for number / date renderers (default: the plugin's, else the browser's). |
| `currency` | `string` |  |  | Default ISO 4217 currency for currency renderers. |
| `timeZone` | `string` |  |  | IANA time zone for date renderers and date filters. |
| `density` | `Density` |  |  | Cell padding scale. |
| `loading` | `boolean` | `false` |  | Shows a progress bar and sets `aria-busy` (server data sets it by itself). |
| `emptyText` | `string` | `'No data to show.'` |  | Shown when there are no rows. |
| `ariaLabel` | `string` |  |  | Accessible name of the grid. |
| `ui` | `Partial<Record<GridPart, ClassValue>>` |  |  | Extra classes per part (`root`, `header`, `headerCell`, `row`, `cell`, `subgrid`, `detail`, `empty`), e.g. Tailwind utilities. |
| `contextMenu` | `(ctx: CellContext<T>) => MenuItem[] \| null \| undefined` |  | `menusFeature` | Right-click menu items for a body cell. Return `null`/`[]` to keep the browser's menu. |
| `headerMenu` | `boolean \| ((ctx: HeaderMenuContext<T>) => MenuItem[] \| null \| undefined)` | `true` | `menusFeature` | Header right-click menu: `true` = built-in items (sort, pin, move, hide, reset), `false` = off, or a function that receives the built-in items and returns the items to show. |
| `pinnedTopRows` | `readonly T[]` |  | `rowPinningFeature` | Extra rows above the body, not part of the data (row pinning feature). |
| `pinnedBottomRows` | `readonly T[]` |  | `rowPinningFeature` | Extra rows below the body, not part of the data (row pinning feature). |
| `totals` | `boolean \| 'top' \| 'bottom'` | `false` | `aggregationFeature` | A totals row with each column's `aggregate` (aggregation feature): `true` / `'bottom'` sticks it to the bottom, `'top'` under the header. |
| `totalsLabel` | `string` | `'Total'` | `aggregationFeature` | The totals row's label, in its first column (unless that column has an aggregate). |
| `aggregates` | `Record<string, unknown>` |  | `aggregationFeature` | Totals row values by column key, instead of computing them (e.g. totals from a server). |
| `groupsExpanded` | `boolean` | `false` | `rowGroupingFeature` | Groups start expanded (row grouping feature). Default: collapsed. |

## `v-model`s

| Model | Type | Default | Needs | Description |
|---|---|---|---|---|
| `v-model:sort` | `SortState \| null` | `null` |  | Sort state: a header click cycles asc → desc → none. Header UI needs the sorting feature. |
| `v-model:columnState` | `ColumnState \| undefined` | `undefined` |  | Column order, hidden columns, runtime pins and resized widths (persisted with `storage`). |
| `v-model:expanded` | `RowKey[]` | `[]` |  | Keys of expanded rows (sub-grids and detail rows). |
| `v-model:selected` | `RowKey[]` | `[]` | `selectionFeature` | Keys of selected rows. Needs the selection feature. |
| `v-model:filters` | `FilterState \| null` | `null` | `filteringFeature` | Column filters and quick search: `{ columns: Record<key, ColumnFilter>, search }`. Needs the filtering feature. |
| `v-model:page` | `number` | `1` | `paginationFeature` | Current page (1-based); resets to 1 when sort or filters change. Needs the pagination feature. |
| `v-model:pageSize` | `number` | `25` | `paginationFeature` | Rows per page. Needs the pagination feature. |
| `v-model:pinnedRows` | `PinnedRowsState \| null` | `null` | `rowPinningFeature` | Top-level rows pinned above / below the body, by key: `{ top, bottom }`. Needs the row pinning feature. |
| `v-model:groupBy` | `readonly string[] \| string \| null` | `null` | `rowGroupingFeature` | Column keys to group the rows by, outermost first (`['region', 'status']`, or one key). Group rows show the value, the row count and the columns' aggregates. Needs the row grouping feature. |

## Events

| Event | Payload | Description |
|---|---|---|
| `query-change` | `[query: GridQuery]` | The combined query (sort, filters, search, page) — on mount and whenever it changes. |
| `load-error` | `[error: unknown]` | A `dataSource` call failed (the grid shows an error with Retry). |
| `row-click` | `[row: T, event: MouseEvent \| KeyboardEvent]` | A row was clicked (not on a link, button or input inside it, nor a `clickable` column). |
| `cell-click` | `[event: CellClickEvent<T>]` | A cell of a `clickable: true` column was clicked. |
| `cell-action` | `[event: CellActionEvent<T>]` | A renderer emitted an action (buttons, toggles, menus, edit, copy). |
| `sub-rows-error` | `[event: { row: T; error: unknown }]` | `loadSubRows` rejected for a row. |
| `context-action` | `[event: ContextActionEvent<T>]` | An item of the body-cell context menu was chosen. |
| `header-action` | `[event: HeaderActionEvent<T>]` | A custom item of the header menu was chosen (built-in items act by themselves). |

## Slots

| Slot | Scope | Description |
|---|---|---|
| `cell-<key>` | `{ row: T; value: unknown; rowKey: RowKey; rowIndex: number; depth: number; column: ColumnDef<T> }` | A column's body cell, replacing its renderer: `#cell-<key>`. |
| `header-<key>` | `{ column: ColumnDef<T> }` | A column's header content: `#header-<key>`. |
| `total-<key>` | `{ value: unknown; column: ColumnDef<T>; group?: RowGroup<T> }` | A column's cell in the totals row and in group rows (aggregation, row grouping); `group` in group rows. |
| `group-<key>` | `{ value: unknown; count: number; rows: readonly T[]; column: ColumnDef<T>; group: RowGroup<T> }` | The value of a group row grouped by this column (row grouping feature): `#group-<key>`. |
| `detail` | `{ row: T; rowKey: RowKey; depth: number }` | Expandable detail row under a row: any content, even another grid. |
| `empty` |  | Shown when there are no rows. |
| `loading` |  | Shown while loading with no rows yet. |
| `sub-rows-loading` | `{ row: T }` | Shown while a row's lazy children load. |
| `toolbar` | `{ columns: readonly ColumnDef<T>[]; columnState: ColumnState; setColumnState: (state: ColumnState) => void; filters: FilterState; setFilters: (state: FilterState) => void; clearFilters: () => void; activeFilterCount: number }` | Above the grid: put a search box, column menu or filter summary here. |

## Exposed methods (`ref<VGridExposed>()`)

| Method | Signature | Needs | Description |
|---|---|---|---|
| `scrollToTop` | `void` |  | Scrolls the grid back to its first row. |
| `scrollToRow` | `void` |  | Scrolls a row (top-level or nested, also in virtual mode) into view. |
| `expandAll` | `void` |  | Expands every expandable row (sub-grids and detail rows) that passes the filters. |
| `collapseAll` | `void` |  | Collapses every row. |
| `setColumnState` | `void` |  | Replaces the column state (order, hidden, pins, widths), and saves it with `storage`. |
| `patchLoadedRows` | `number` |  | Applies field patches to lazily loaded child rows (`loadSubRows`), which the grid caches and the app can't reach. Top-level and synchronous `subRows` data belong to the app: update them there (assign fields on reactive rows, or use `patchRows`). Returns the number of rows patched. |
| `setFilters` | `void` | `filteringFeature` | Replaces the filter model (also persisted with `filter-storage`). |
| `clearFilters` | `void` | `filteringFeature` | Removes every column filter and the search. |
| `openFilter` | `void` | `filteringFeature` | Opens a column's filter popover. |
| `reload` | `Promise<void>` | `serverDataFeature` | Re-runs the `dataSource` with the current query; lazily loaded child rows load again too. |
| `reloadSubRows` | `void` |  | Forgets lazily loaded child rows (one row's, or all): expanded rows load them again. |
| `pinRow` | `void` | `rowPinningFeature` | Pins a top-level row above or below the body, or unpins it (`null`). Row pinning feature. |

## `ColumnDef<T>`

| Option | Type | Needs | Description |
|---|---|---|---|
| `key` (required) | `string` |  | Unique, stable column id. Also used for sort state, column state and slot names. |
| `header` | `string` |  | Header text (default: the key). |
| `headerTooltip` | `string` |  | Tooltip on the header cell. |
| `field` | `string` |  | Dot path into the row, e.g. `user.address.city`. Defaults to `key`. |
| `value` | `(row: T) => unknown` |  | Computes the cell value; wins over `field`. |
| `renderer` | `R \| Component` |  | A renderer definition (`currencyRenderer`), a registered renderer name, or a component. Defaults to `text`. |
| `rendererOptions` | `RendererOptions<R>` |  | Options of the column's renderer, typed against it (merged over the renderer's defaults). |
| `width` | `string` |  | Any CSS grid track size. Defaults to `auto`. |
| `minWidth` | `string` |  | Lower bound; combined with `width` into `minmax(minWidth, width)`, and the resize minimum. |
| `maxWidth` | `string` | `columnResizingFeature` | Upper bound when the user resizes the column (column resizing feature). |
| `resizable` | `boolean` | `columnResizingFeature` | Can the user resize this column (column resizing feature)? Default `true`. |
| `group` | `string` | `columnGroupsFeature` | Header group label (column groups feature): adjacent visible columns with the same `group` share one header cell above their own headers. |
| `align` | `Align` |  | Cell and header alignment (default: the renderer's, e.g. `end` for numbers, else `start`). |
| `sortable` | `boolean` | `sortingFeature` | A sort button in the header (sorting feature). Client sorting needs `sort-mode="client"`. |
| `sortValue` | `(row: T) => unknown` | `sortingFeature` | The value client sorting compares (default: the renderer's sort value, else the cell value). |
| `sortFn` | `(a: T, b: T) => number` | `sortingFeature` | A full comparator for client sorting; wins over `sortValue`. |
| `pinned` | `PinSide` | `columnPinningFeature` | Initial pin side (the header menu can change it at runtime unless `pinnable: false`). |
| `pinnable` | `boolean` | `columnPinningFeature` | Can the user pin/unpin it from the header menu? Default `true`. |
| `hidden` | `boolean` | `columnVisibilityFeature` | Initial visibility (column state wins once it exists). |
| `hideable` | `boolean` | `columnVisibilityFeature` | Can the user hide it from the column menu? Default `true`. |
| `reorderable` | `boolean` | `columnReorderFeature` | Can the user move it? Default `true`. |
| `clickable` | `boolean` |  | Cell click emits `cell-click` instead of `row-click`. |
| `filterable` | `boolean` | `filteringFeature` | Show a filter for this column (funnel in the header, and an input in the filter row). |
| `filter` | `FilterType \| ColumnFilterOptions` | `filteringFeature` | Filter type — default from the renderer (number, date, boolean, set for status/chip, else text) — or options. |
| `filterValue` | `(row: T) => unknown` | `filteringFeature` | Value used for filtering (default: the cell value). |
| `filterFn` | `(row: T, filter: ColumnFilter, value: unknown) => boolean` | `filteringFeature` | Custom predicate; replaces the built-in matching for this column. |
| `filterComponent` | `Component` | `filteringFeature` | Custom filter UI (popover), receives `modelValue` / emits `update:modelValue` with a filter. |
| `searchable` | `boolean` | `filteringFeature` | Include in the quick search. Default `true` for visible columns. |
| `flash` | `FlashMode` |  | Briefly highlight the cell when its value changes (overrides the grid's `flash` prop). `'direction'`: green when a number goes up, red when it goes down. |
| `aggregate` | `AggregateName \| AggregateFn<T>` | `aggregationFeature` | The column's value in the totals row (aggregation feature): `'sum' \| 'avg' \| 'min' \| 'max'` over the cell values (empty values skipped), `'count'` of rows, or a function of the values and the rows. Shown with the column's renderer (`count` as a plain number). |
| `groupable` | `boolean` | `rowGroupingFeature` | The header menu offers Group by / Ungroup for this column (row grouping feature). Any column can be grouped through `v-model:group-by`; this only adds the menu items. |
| `groupValue` | `(row: T) => unknown` | `rowGroupingFeature` | The value rows are grouped by (row grouping feature), e.g. `(row) => row.placedAt.slice(0, 7)` for months. Default: the cell value, shown with the column's renderer; a `groupValue` is shown as text (or with the `#group-<key>` slot). |
| `cellClass` | `ClassValue \| ((row: T) => ClassValue)` |  | Extra classes for the column's body cells (or a function of the row). |
| `headerClass` | `ClassValue` |  | Extra classes for the column's header cell. |

## Renderers

Set `renderer` to the definition (`renderer: currencyRenderer`, tree-shakeable) or to a name registered with `createVueGrid({ renderers })` / `:renderers`; `rendererOptions` are typed against it. Option values marked `RowFn` / `RowOption` may also be `(value, row) => …`.

### `text` — `textRenderer`

Text, the default renderer (the only one `<VGrid>` bundles): ellipsis, line clamp, tone, badge, icon, secondary text, copy button. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `ellipsis` | `boolean` | Single line with ellipsis (full text in a tooltip). |
| `lines` | `number` | Clamp to N lines. |
| `maxWidth` | `string` |  |
| `preserveNewlines` | `boolean` | Keep line breaks in the value (`white-space: pre-line`). |
| `tooltip` | `boolean \| RowFn<string \| undefined>` | `true` = value as tooltip; a function computes it. |
| `placeholder` | `string` | Shown when the value is empty. |
| `tone` | `RowOption<Tone \| undefined>` |  |
| `toneMode` | `'text' \| 'fill'` | `text` (default) colours the text; `fill` colours the badge-like background. |
| `bold` | `RowOption<boolean>` |  |
| `secondary` | `RowFn<string \| null \| undefined>` | Muted text after the value, e.g. a half-time score: `2:1 (1:0)`. |
| `badge` | `RowFn<BadgeSpec \| string \| null \| undefined>` | Badge before (default) or after the value. |
| `badgePosition` | `'start' \| 'end'` |  |
| `icon` | `RowFn<IconSpec \| null \| undefined>` | Icon before the value, e.g. `{ icon: BellIcon, tone: 'warning', label: 'Notify' }`. |
| `copyable` | `boolean` | Adds a copy-to-clipboard button; emits `copy` with the copied text. |
| `copyValue` | `RowFn<string>` | What gets copied (default: the displayed text). |

### `toggle-text` — `toggleTextRenderer`

Text that toggles a highlight when clicked. Emits `toggle` (with `clickable`). Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `clickable` | `boolean \| RowFn<boolean>` | When true, the text is a button that emits action `toggle`. |
| `highlighted` | `boolean \| RowFn<boolean>` |  |
| `placeholder` | `string` | Shown when the value is empty. |

### `number` — `numberRenderer`

Locale-formatted numbers. With `clickable`, a link-style button that emits `click`. Align: `end` · filter type: `number`.

| Option | Type | Description |
|---|---|---|
| `format` | `Intl.NumberFormatOptions` | `Intl.NumberFormat` options, e.g. `{ maximumFractionDigits: 0 }` or `{ style: 'percent' }`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `clickable` | `RowOption<boolean>` | Renders the number as a link-style button that emits `click` (drill-down). |

### `signed-number` — `signedNumberRenderer`

Numbers that always show their sign (+ / −). With `clickable`, emits `click`. Align: `end` · filter type: `number` · defaults: `{ signed: true }`.

| Option | Type | Description |
|---|---|---|
| `format` | `Intl.NumberFormatOptions` | `Intl.NumberFormat` options, e.g. `{ maximumFractionDigits: 0 }` or `{ style: 'percent' }`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `clickable` | `RowOption<boolean>` | Renders the number as a link-style button that emits `click` (drill-down). |
| `signed` | `boolean` |  |

### `currency` — `currencyRenderer`

Money in a fixed or per-row currency (default: the grid's `currency`). With `clickable`, emits `click`. Align: `end` · filter type: `number`.

| Option | Type | Description |
|---|---|---|
| `currency` | `string \| RowFn<string \| undefined>` | ISO 4217 code, or derived from the row. Defaults to the grid context currency. |
| `format` | `Intl.NumberFormatOptions` | `Intl.NumberFormat` options, e.g. `{ maximumFractionDigits: 0 }` or `{ style: 'percent' }`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `clickable` | `RowOption<boolean>` | Renders the number as a link-style button that emits `click` (drill-down). |

### `change` — `changeRenderer`

A rise or fall: the value with an up / down arrow, green or red. Align: `end` · filter type: `number`.

| Option | Type | Description |
|---|---|---|
| `direction` | `RowFn<'up' \| 'down' \| 'equal' \| undefined>` | Defaults to the sign of a numeric value, or `true` / `false` (also as strings) → up / down. |
| `currency` | `boolean \| string` | Format as currency (`true` = context currency). |
| `iconOnly` | `boolean` | Only the arrow (the value becomes its accessible label). |
| `format` | `Intl.NumberFormatOptions` | `Intl.NumberFormat` options, e.g. `{ maximumFractionDigits: 0 }` or `{ style: 'percent' }`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `clickable` | `RowOption<boolean>` | Renders the number as a link-style button that emits `click` (drill-down). |

### `date` — `dateRenderer`

A calendar day, in the grid's locale and time zone (date-only strings never shift a day). Align: `start` · filter type: `date`.

| Option | Type | Description |
|---|---|---|
| `format` | `Intl.DateTimeFormatOptions` | `Intl.DateTimeFormat` options, e.g. `{ dateStyle: 'medium' }`. |
| `placeholder` | `string` | Shown when the value is empty. |

### `datetime` — `dateTimeRenderer`

Date and time, on two lines by default. Align: `start` · filter type: `date`.

| Option | Type | Description |
|---|---|---|
| `milliseconds` | `boolean` |  |
| `twoLines` | `boolean` | Date and time on two lines (default true). |
| `format` | `Intl.DateTimeFormatOptions` | `Intl.DateTimeFormat` options, e.g. `{ dateStyle: 'medium' }`. |
| `placeholder` | `string` | Shown when the value is empty. |

### `boolean` — `booleanRenderer`

Yes / no as text labels or icons. Align: `start` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `trueLabel` | `string` |  |
| `falseLabel` | `string` |  |
| `nullLabel` | `string` |  |
| `display` | `'text' \| 'icon'` | `text` (default): labels. `icon`: a check for true, nothing (or a cross) for false. |
| `falseIcon` | `boolean` | In icon mode, show a cross for false (default: nothing). |

### `status` — `statusRenderer`

A coloured status badge (tone from a map, a function or a constant). With `clickable`, emits `click`. Align: `start` · filter type: `set`.

| Option | Type | Description |
|---|---|---|
| `tone` | `ToneOption` |  |
| `label` | `RowFn<string> \| Record<string, string>` | Label from a function, or a value → label map. |
| `dot` | `boolean` |  |
| `variant` | `'soft' \| 'solid' \| 'outline'` | `soft` (default, tinted), `solid` (filled) or `outline`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `clickable` | `RowOption<boolean>` | Badge becomes a button that emits `click`. |

### `link` — `linkRenderer`

A safe link (http(s), mailto, tel only), or a `<RouterLink>` with `to` when vue-router is installed. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `href` | `RowFn<string \| undefined>` |  |
| `to` | `RowFn<RouteTarget \| null \| undefined>` | Router location; rendered with `<RouterLink>` when vue-router is installed, else as an href. |
| `label` | `RowFn<string>` |  |
| `target` | `'_self' \| '_blank'` |  |
| `tooltip` | `RowFn<string \| undefined>` |  |

### `icon` — `iconRenderer`

An icon component, fixed or picked per row. Align: `center` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `icon` | `Component` | Static icon component. |
| `iconFor` | `RowFn<Component \| undefined>` | Picks the icon per row (wins over `icon`). Kept separate because functional components are functions too. |
| `show` | `RowFn<boolean>` |  |
| `label` | `string \| RowFn<string>` |  |
| `tone` | `Tone \| RowFn<Tone \| undefined>` |  |

### `json` — `jsonRenderer`

A button that opens the value as escaped JSON in a dialog. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `label` | `string` |  |
| `dialogTitle` | `string \| RowFn<string>` |  |

### `json-tree` — `jsonTreeRenderer`

A collapsible tree of nested data. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `collapseAt` | `number` | Nodes deeper than this start collapsed. Default 1. |
| `maxDepth` | `number` | Deeper nodes are summarised (“3 items”) instead of expanded. Default unlimited. |
| `parseNested` | `boolean` | String values that contain JSON are shown as nested trees. |
| `collapsed` | `boolean` | Starts hidden behind a toggle button (labelled `toggleLabel`, default “More info”). |
| `toggleLabel` | `string` |  |
| `emptyText` | `string` | Shown for null / empty values. Default: nothing. |

### `actions-menu` — `actionsMenuRenderer`

A `⋯` button with a keyboard-friendly menu. Emits the chosen item's `name`. Align: `center` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `actions` | `MenuItem[] \| ((row: any) => MenuItem[])` | Menu items (actions and `{ separator: true }`), or a function of the row. |
| `label` | `string` |  |

### `action-button` — `actionButtonRenderer`

One button per row. Emits its `action` (default `click`). Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `label` | `string \| RowFn<string>` |  |
| `action` | `string` | Action name emitted on click. Default `click`. |
| `icon` | `Component` |  |
| `tone` | `Tone` |  |
| `disabled` | `RowFn<boolean>` |  |
| `visible` | `RowFn<boolean>` | Hide the button for some rows. |
| `variant` | `ButtonVariant` |  |
| `iconOnly` | `boolean` | Only the icon; the label becomes its accessible name and tooltip. |

### `multi-line` — `multiLineRenderer`

Stacked lines, each with its own style, link, badge, trend or action. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `lines` | `RowFn<LineInput[] \| null \| undefined>` | Builds the lines; default: the value itself when it's an array. |
| `boldLines` | `number[]` | Indexes of lines to show in bold. |
| `ellipsis` | `boolean` | Each line on one row with ellipsis (default true). |
| `target` | `'_self' \| '_blank'` |  |
| `placeholder` | `string` | Shown when the value is empty. |

### `copy` — `copyRenderer`

A value with a copy-to-clipboard button. Emits `copy` / `copy-error`. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `copyValue` | `RowFn<string>` | What gets copied (default: the displayed text). |
| `iconOnly` | `boolean` | Only the copy button; the value becomes its tooltip. |
| `label` | `string` | Accessible name of the button. Default “Copy”. |
| `title` | `string` | Shown before the value in the tooltip, e.g. “Serial number”. |
| `placeholder` | `string` | Shown when the value is empty. |

### `chip` — `chipRenderer`

A chip in any colour (readable text picked by contrast), square, circle or pill. Align: `start` · filter type: `set`.

| Option | Type | Description |
|---|---|---|
| `color` | `RowOption<string \| null \| undefined>` | Any CSS colour (e.g. from an API); text colour is picked for contrast. |
| `tone` | `ToneOption` | Named tone instead of a raw colour. |
| `label` | `RowFn<string>` |  |
| `tooltip` | `RowFn<string \| null \| undefined>` |  |
| `shape` | `'square' \| 'circle' \| 'pill'` |  |
| `size` | `string` | Box size for square/circle. Default `1.75rem`. |
| `placeholder` | `string` | Shown when the value is empty. |

### `checkbox` — `checkboxRenderer`

A controlled checkbox, with a tooltip when disabled. Emits `change` with the requested state. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `checked` | `RowFn<boolean>` | Default: the value is truthy. |
| `disabled` | `RowOption<boolean>` |  |
| `disabledReason` | `RowFn<string \| null \| undefined>` | Tooltip explaining why it's disabled. |
| `label` | `RowOption<string>` | Accessible name. Default: the column header. |

### `switch` — `switchRenderer`

A controlled on / off switch. Emits `change` with the requested state. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `checked` | `RowFn<boolean>` | Default: the value is truthy. |
| `disabled` | `RowOption<boolean>` |  |
| `disabledReason` | `RowFn<string \| null \| undefined>` | Tooltip explaining why it's disabled. |
| `label` | `RowOption<string>` | Accessible name. Default: the column header. |

### `radio` — `radioRenderer`

One selected row across the column (controlled). Emits `select`. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `name` | `string` | Radio group name. Default: the column key. |
| `checked` | `RowFn<boolean>` | Default: the value is truthy. |
| `disabled` | `RowOption<boolean>` |  |
| `disabledReason` | `RowFn<string \| null \| undefined>` | Tooltip explaining why it's disabled. |
| `label` | `RowOption<string>` | Accessible name. Default: the column header. |

### `edit` — `editRenderer`

A value with an edit button, for opening your own editor. Emits `edit`. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `format` | `RowFn<string>` | Text shown next to the edit button (default: the value). |
| `placeholder` | `string` | Shown when the value is empty. |
| `label` | `string` | Accessible name of the button. Default “Edit”. |
| `disabled` | `RowOption<boolean>` |  |
| `bold` | `boolean` |  |

### `image` — `imageRenderer`

A thumbnail, with a placeholder when empty or broken. Align: `center` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `src` | `RowFn<string \| null \| undefined>` | Default: the value. |
| `baseUrl` | `string` | Prefixed to relative paths (e.g. a CDN). |
| `alt` | `RowOption<string>` |  |
| `size` | `string` | Default `2.5rem`. |
| `fit` | `'contain' \| 'cover'` |  |
| `shape` | `'rounded' \| 'circle' \| 'square'` |  |

### `code` — `codeRenderer`

Monospaced code, with JSON pretty-printing and highlighting. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `language` | `'auto' \| 'json' \| 'text'` | `auto` (default): JSON for objects and JSON strings, plain text otherwise. |
| `lines` | `number` | Clamp to N lines (full text in a tooltip). |
| `indent` | `number` | JSON indent. Default 2. |
| `highlight` | `boolean` | Colour JSON tokens. Default true. |

### `button-group` — `buttonGroupRenderer`

Several buttons, fixed or per row. Emits the clicked button's `name`. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `buttons` | `ButtonSpec[] \| ((row: any) => ButtonSpec[])` |  |

### `icon-toggle` — `iconToggleRenderer`

A star / flag style on-off button (controlled). Emits `toggle`. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `active` | `RowFn<boolean>` | Default: the value is truthy. |
| `icon` | `Component` | Default: an outlined star. |
| `activeIcon` | `Component` | Default: a filled star (or `icon`). |
| `label` | `RowOption<string>` | Accessible name. Default “Toggle”. |
| `activeTone` | `Tone` | Tone when active. Default `warning`. |
| `disabled` | `RowOption<boolean>` |  |

### `details` — `detailsRenderer`

A status badge plus an info button with an anchored popover of label / value rows. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `tone` | `ToneOption` | Summary badge tone, like `status`. |
| `label` | `RowFn<string>` |  |
| `items` | `RowFn<DetailItem[] \| null \| undefined>` | Popover rows. Empty → no info button. |
| `title` | `RowOption<string>` | Popover heading. Default: the column header. |
| `triggerLabel` | `string` | Accessible name of the info button. Default “Details”. |

### `list` — `listRenderer`

The first items of a list, with a “+N more” toggle. Emits `expand`. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `items` | `RowFn<unknown[] \| null \| undefined>` | Default: the value when it's an array. |
| `itemLabel` | `RowFn<string>` |  |
| `max` | `number` | Items shown before “+N more”. Default 1. |
| `placeholder` | `string` | Shown when the value is empty. |

## Types

### `VirtualOptions`

| Field | Type | Description |
|---|---|---|
| `rowHeight` | `number` | Fixed row height in px. |
| `overscan`? | `number` | Extra rows rendered above/below the viewport. Default 6. |
| `detailHeight`? | `number` | Estimated height in px of a detail row (`#detail` slot) until it has been rendered and measured. Default 4 × `rowHeight`. Data rows always have `rowHeight`. |

### `PinnedRowsState`

| Field | Type | Description |
|---|---|---|
| `top`? | `RowKey[]` |  |
| `bottom`? | `RowKey[]` |  |

### `ColumnState`

| Field | Type | Description |
|---|---|---|
| `order` | `string[]` | Column keys in display order (all known columns, visible or not). |
| `hidden` | `string[]` | Keys of hidden columns. |
| `pinned`? | `Record<string, PinSide \| null>` | Runtime pin overrides (e.g. from the header menu). `null` = explicitly unpinned; a missing key falls back to the column's `pinned` definition. Optional so older persisted state still loads. |
| `widths`? | `Record<string, string>` | Widths the user resized columns to (CSS lengths, e.g. `'240px'`). Column resizing feature. |

### `SortState`

| Field | Type | Description |
|---|---|---|
| `key` | `string` |  |
| `dir` | `SortDir` |  |

### `ColumnFilterOptions`

| Field | Type | Description |
|---|---|---|
| `type`? | `FilterType` |  |
| `options`? | `readonly FilterOption[] \| FilterOptionsLoader` | Choices for a `set` filter: a list, or a loader called with the search text (e.g. from a backend — honour `signal`). Default: distinct values from the rows. |
| `placeholder`? | `string` | Placeholder of the filter-row input. |

### `FilterOption`

| Field | Type | Description |
|---|---|---|
| `value` | `unknown` |  |
| `label`? | `string` |  |
| `count`? | `number` | Shown next to the option (e.g. number of rows). |

### `MenuAction`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Emitted as the action name. |
| `label` | `string` |  |
| `disabled`? | `boolean` |  |
| `tone`? | `MenuTone` |  |
| `icon`? | `Component` |  |
| `hint`? | `string` | Shown right-aligned, e.g. a shortcut hint. |

### `CellContext`

| Field | Type | Description |
|---|---|---|
| `row` | `T` |  |
| `rowKey` | `RowKey` |  |
| `column` | `ColumnDef<T>` |  |
| `value` | `unknown` |  |

### `CellActionEvent`

| Field | Type | Description |
|---|---|---|
| `name` | `string` |  |
| `payload` | `unknown` |  |
| `row` | `T` |  |
| `rowKey` | `RowKey` |  |
| `column` | `ColumnDef<T>` |  |

### `CellClickEvent`

| Field | Type | Description |
|---|---|---|
| `row` | `T` |  |
| `rowKey` | `RowKey` |  |
| `column` | `ColumnDef<T>` |  |
| `value` | `unknown` |  |
| `event` | `MouseEvent \| KeyboardEvent` |  |

### `ContextActionEvent`

| Field | Type | Description |
|---|---|---|
| `name` | `string` |  |
| `item` | `MenuAction` |  |
| `row` | `T` |  |
| `rowKey` | `RowKey` |  |
| `column` | `ColumnDef<T>` |  |
| `value` | `unknown` |  |

### `HeaderActionEvent`

| Field | Type | Description |
|---|---|---|
| `name` | `string` |  |
| `item` | `MenuAction` |  |
| `column` | `ColumnDef<T>` |  |

### `VueGridConfig`

| Field | Type | Description |
|---|---|---|
| `renderers`? | `CellRendererDefinition[]` |  |
| `features`? | `readonly GridFeature[]` | Features every grid in the app gets (`allFeatures` for all of them). |
| `locale`? | `string` |  |
| `currency`? | `string` |  |
| `timeZone`? | `string` |  |
| `density`? | `Density` |  |

