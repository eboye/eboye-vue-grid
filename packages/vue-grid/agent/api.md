# @nocopypaste/vue-grid 0.29.0 — API reference

> Generated from the TypeScript sources (`scripts/gen-agent.mjs`). Machine-readable: `agent/api.json`, `agent/grid-config.schema.json`.

## Features

Opt-in: pass them as `:features="[…]"` on `<VGrid>` or once via `createVueGrid({ features })` (`allFeatures` = all). An option whose feature is missing does nothing.

| Export | What it enables | Props | Column options |
|---|---|---|---|
| `aggregationFeature` | Aggregates and the totals row: columns with an `aggregate` (`sum`, `avg`, `min`, `max`, `count` or a function) and `totals` (`true` / `'bottom'` or `'top'`) show a sticky totals row over the rows that pass the filters, on every page. `aggregates` supplies the values instead (e.g. from a server). Without it, `aggregate` and `totals` are ignored. | `totals` `totalsLabel` `aggregates` | `aggregate` |
| `attributesFeature` | Your own attributes on rows and cells (`row-attrs`, `cell-attrs`), such as test hooks: `:row-attrs="({ rowIndex }) => ({ 'data-test': `row-${rowIndex}` })"`. Each gets the row, its key and its position as shown (cells also the column and its position). The grid's own attributes (role, ARIA, `tabindex`, classes, styles, its `data-*` hooks) and `on…` handlers are left alone. | `treeExpanderAttrs` `detailExpanderAttrs` `columnHeaderAttrs` `rowAttrs` `cellAttrs` |  |
| `columnGroupsFeature` | Grouped column headers: give columns a `group` or a `groupPath`. Adjacent visible columns with the same group and ancestors share a sticky header cell. Reordering, hiding, and pin boundaries affect the spans. |  | `group` `groupPath` |
| `columnPinningFeature` | Pinned columns: `pinned: 'left' \| 'right'` columns stay put (sticky) while the grid scrolls sideways, with edge shadows; runtime pins from the header menu (Pin left / Pin right / Unpin) are kept in `v-model:column-state` and persisted with `storage`. While the pinned columns would take more than `pinned-max-share` of the grid's width (half, by default), they scroll like the others. Without it, pins are ignored. | `pinnedMaxShare` | `pinned` `pinnable` |
| `columnReorderFeature` | Column reordering: drag a header (mouse, pen, touch), Alt+←/→ on a focused header, and the header menu's Move left / Move right. Columns opt out with `reorderable: false`. The order is part of `v-model:column-state` and persisted with `storage`; `<VGridColumnMenu>` works without it. |  | `reorderable` |
| `columnResizingFeature` | Column resizing: drag a header's edge (mouse, pen, touch), use ←/→ on the focused edge (Alt+Shift+←/→ on a header with keyboard navigation), or double-click the edge to fit the content. `initialAutoSize` fits a column when real rows first render. `minWidth` / `maxWidth` bound sizing, and `resizable: false` disables manual resizing. Explicit widths are kept in `columnState.widths` and persisted with `storage`. The header menu gains Fit width / Reset width. |  | `maxWidth` `resizable` `initialAutoSize` |
| `columnVirtualizationFeature` | Column virtualization (`virtual-columns`): for grids with many columns, only the columns in view (plus `overscan`) render their cells, alongside the pinned ones and the checkbox. Every column keeps its place in the CSS grid, so widths, pinning, resizing and sub-grids work as before. Columns sized by their content (`auto`, `min-content`) get a definite width while it's on (`{ width: '10rem' }`). Combines with `virtual` (rows) for large sheets both ways. | `virtualColumns` |  |
| `columnVisibilityFeature` | Column visibility: `hidden: true` columns, `columnState.hidden` (persisted with `storage`), the header menu's Hide column item and `<VGridColumnMenu>`'s checkboxes. Columns opt out with `hideable: false`. Without it, every column shows. |  | `hidden` `hideable` |
| `editingFeature` |  | `saveCell` `undoLimit` | `editable` `editor` `editorOptions` `validate` |
| `exportFeature` | CSV and Excel export and copying: `grid.exportCsv()` downloads the filtered, sorted rows as a CSV file, `grid.getCsv()` returns the text, `grid.exportXlsx()` / `grid.getXlsx()` write an Excel workbook with typed cells (the writer loads on demand), `grid.print()` prints every matching row as a table with the header on each page, `grid.copyRows()` copies rows as tab-separated text, and Ctrl/⌘+C copies the selected rows, else the focused cell, as displayed. Columns can set `exportValue` and `exportable: false`. Without it those methods only warn. |  | `exportValue` `exportable` |
| `filteringFeature` | Filtering: header funnels with typed filter popovers on `filterable` columns, the filter row, `<VGridSearch>`, the filter items of the header menu, `v-model:filters` and filter persistence. The popover body and the filter-row editors load on demand (own chunks). | `filterMode` `filterRow` `filterStorage` `noMatchText` `filters` | `filterable` `filter` `filterValue` `filterFn` `filterComponent` `searchable` |
| `keyboardNavigationFeature` | Keyboard navigation (the ARIA grid pattern): the grid is one tab stop, arrow keys / Home / End / PageUp / PageDown move between cells, Enter activates a cell's control, Space selects a row, →/← expand and collapse, Alt+←/→ move a column, ContextMenu / Shift+F10 open the cell menu. Without it the grid is an ARIA `table`: its own controls (sort buttons, expanders, checkboxes, filter buttons) sit in the normal Tab order instead. |  |  |
| `menusFeature` | Context menus: the built-in header menu (sort, filter, pin, move, hide, reset, your own items via `header-menu`) and body-cell menus (`context-menu`), opened by right-click, the ContextMenu key or Shift+F10. Without it the browser's own menu shows. The standalone `<VGridMenu>` and the `actions-menu` renderer don't need it. | `contextMenu` `headerMenu` |  |
| `paginationFeature` | Built-in pagination: the `pagination` prop and `v-model:page` / `v-model:page-size`. Pages the client rows, or asks the `dataSource` for pages. The pager loads on demand (own chunk). Not needed for the standalone `<VGridPagination>` component. | `pagination` `page` `pageSize` |  |
| `rangeSelectionFeature` |  | `rangeSelection` `range` |  |
| `rowGroupingFeature` | Row grouping: `v-model:group-by="['region', 'status']"` groups the rows by those columns into collapsible group rows with their value, row count and the aggregates of columns with an `aggregate`. Columns with `groupable: true` get Group by / Ungroup items in the header menu. Without it, `group-by` is ignored. | `groupsExpanded` `groupBy` | `groupable` `groupValue` |
| `rowPinningFeature` | Pinned rows: `v-model:pinned-rows` (`{ top, bottom }` row keys), `pinned-top-rows` / `pinned-bottom-rows` (extra rows that aren't in the data) and the `pinRow()` method. Pinned rows stay in view (sticky) under the header or at the bottom while the body scrolls, and aren't filtered, sorted or paged. Without it, those options are ignored. | `pinnedTopRows` `pinnedBottomRows` `pinnedRows` |  |
| `rowReorderFeature` | Row reordering (`row-reorder`): a handle column to drag rows by (mouse, pen, touch), and Alt+↑ / Alt+↓ on a row's cells. Rows move among their siblings (a nested row stays under its parent). Controlled, like editing: the grid emits `row-move` and your handler moves the row (`moveRow(rows, event)`). The handles are off while rows are sorted or grouped. | `rowReorder` |  |
| `selectionFeature` | Row selection: the `selectable` prop (multi or single), `v-model:selected`, `selection-mode` (cascade through sub-grids), `is-row-selectable`, Space on a row, shift-click (or Shift+Space) for a range, the select-all checkbox, `prune-selection`, and with server data a "select all N matching rows" banner (`v-model:select-all-matching`; it loads on demand, its own chunk). | `selectable` `selectionMode` `isRowSelectable` `pruneSelection` `selected` `selectAllMatching` |  |
| `serverDataFeature` | Server data: the `dataSource` prop. The grid sends sort, filters and page to your function, cancels superseded requests, and shows loading, error and retry states. | `dataSource` |  |
| `serverGroupingFeature` | Row grouping with server data: with `group-by` and a `data-source`, the query carries `groupBy` and `groupPath`, the server answers with groups (value, count, aggregates), and each group's contents load when it expands. A group's checkbox selects it by query (`v-model:selected-groups`), without loading its rows. Needs the row grouping and server data features too. Without it, a grouped server grid groups only the rows it has loaded. | `selectedGroups` |  |
| `sortingFeature` | Sorting: the sort button on `sortable` column headers, the sort items of the header menu and, with `sort-mode="client"`, sorting the rows in the browser. | `multiSort` `sorts` | `sortable` `sortValue` `sortFn` |
| `statusBarFeature` | A status bar under the grid (`status-bar`): how many rows pass the filters ("84 of 200 rows"), how many are selected, how many filters are on (with Clear), and with `{ summary: ['total'] }` the sum and average of those columns over the selected rows, as the cells show them. The `#status-bar` slot replaces its content. Its component loads on demand (own chunk). | `statusBar` |  |
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
| `pagination` | `boolean \| PaginationOptions` | `false` | `paginationFeature` | Built-in pagination under the grid (server-side with `dataSource`, client-side otherwise). |
| `statusBar` | `boolean \| StatusBarOptions` |  | `statusBarFeature` | A status bar under the grid (status bar feature): rows that pass the filters ("84 of 200 rows"), selected rows, active filters with Clear; `{ summary: ['total'] }` adds the sum and average of those columns over the selected rows. Set `rowCountMode: 'visible'` for the shown tree rows, `fullyExpandedCount` for a supplied total, `groupCounts: true` to announce both counts together, or `backToTop: true` for a scroll button. `#status-bar` replaces its content. |
| `saveCell` | `(event: CellEditEvent<T>) => unknown` |  | `editingFeature` | Saves an edited cell (editing feature), after `cell-edit`: return a Promise and the cell shows it saving; a rejection keeps the editor open with the error's message. Without it, `cell-edit` alone carries the change. |
| `rangeSelection` | `boolean` |  | `rangeSelectionFeature` | Cell-range selection (range selection feature), as in a spreadsheet: drag across cells or Shift+click to select a block, Shift+arrows to extend it, Ctrl/⌘+A for every cell, Esc to clear; Ctrl/⌘+C copies it. Bind `v-model:range` to read or set it. |
| `undoLimit` | `number` |  | `editingFeature` | How many changes undo remembers (editing feature): each edit, checkbox flip or paste is one. Ctrl/⌘+Z undoes, Ctrl+Y / Ctrl/⌘+Shift+Z redo; `0` turns undo off. Default `100`. |
| `messages` | `GridMessages` |  |  | Built-in text (translations, wording), over `createVueGrid({ messages })`. |
| `parts` | `GridParts` |  |  | Built-in parts to leave out (`{ progressBar: false }`), over `createVueGrid({ parts })`. |
| `sortMode` | `'controlled' \| 'client'` | `'controlled'` |  | `controlled` (default): a header click only updates `v-model:sort` (sort on the server or in your own code). `client`: the grid sorts the rows itself. Ignored with `dataSource`. |
| `filterMode` | `'client' \| 'controlled'` | `'client'` | `filteringFeature` | `client` (default): the grid filters its rows. `controlled`: it only emits `update:filters`. |
| `filterRow` | `boolean` | `false` | `filteringFeature` | Show the filter row: an input under each filterable column's header. |
| `filterStorage` | `FilterStateStorage \| string` |  | `filteringFeature` | Persist the filter model (`string` = localStorage key). |
| `noMatchText` | `string` |  | `filteringFeature` | Shown when filters hide every row. Default: `messages.noMatch`, else `No rows match the current filters.` |
| `selectable` | `boolean \| 'single'` | `false` | `selectionFeature` | A selection column: `true` = multi-select (with select-all), `'single'` = one row. |
| `selectionMode` | `'cascade' \| 'independent'` | `'cascade'` | `selectionFeature` | `cascade` (default): selecting a parent selects its children. `independent`: rows alone. |
| `isRowSelectable` | `(row: T) => boolean` |  | `selectionFeature` | Rows that can't be selected get a disabled checkbox. |
| `pruneSelection` | `boolean` | `false` | `selectionFeature` | Drop selected keys whose rows are no longer in the data (after a reload, a delete, a new server page). Default: keys are kept, so a selection can span server pages. |
| `subRows` | `(row: T) => T[] \| undefined \| null` |  | `subGridsFeature` | Synchronous child rows of a row: shown in a nested sub-grid when expanded. |
| `loadSubRows` | `(row: T) => Promise<T[]>` |  | `subGridsFeature` | Lazy child rows, loaded on first expand (cached, with loading / error / retry). |
| `hasSubRows` | `(row: T) => boolean` |  | `subGridsFeature` | With `loadSubRows`: which rows get an expander (default: every row). |
| `rowExpandable` | `(row: T) => boolean` |  |  | With a `#detail` slot: which rows can expand to show it (default: every row). |
| `treeColumnKey` | `string` |  |  | Column for tree indentation and the tree or shared expander. Defaults to the first visible data column. |
| `detailExpanderColumnKey` | `string` |  |  | Column for the separate detail expander. Defaults to the first visible data column. |
| `treeExpanderAttrs` | `(ctx: ExpanderAttrsContext<T>) => ExpanderAttrs \| null \| undefined` |  | `attributesFeature` | Accessible name and data attributes for the tree or shared row expander (attributes feature). |
| `detailExpanderAttrs` | `(ctx: ExpanderAttrsContext<T>) => ExpanderAttrs \| null \| undefined` |  | `attributesFeature` | Accessible name and data attributes for the separate detail expander (attributes feature). |
| `columnHeaderAttrs` | `(ctx: ColumnHeaderAttrsContext<T>) => DataAttrs \| null \| undefined` |  | `attributesFeature` | Application data attributes for each native data column header (attributes feature). |
| `rowClickable` | `boolean` | `false` |  | Pointer cursor on rows (`row-click` is emitted either way). |
| `rowClass` | `(row: T, index: number) => ClassValue` |  |  | Extra classes for a row. |
| `rowAttrs` | `(ctx: RowAttrsContext<T>) => ExtraAttrs \| null \| undefined` |  | `attributesFeature` | Extra attributes for each data row, such as test hooks (`{ 'data-test': ... }`). |
| `rowReorder` | `boolean` |  | `rowReorderFeature` | Rows can be moved: a handle column to drag them by, and Alt+↑ / Alt+↓. The grid emits `row-move`; your handler moves the row (`moveRow`). Needs the row reorder feature. |
| `cellAttrs` | `(ctx: CellAttrsContext<T>) => ExtraAttrs \| null \| undefined` |  | `attributesFeature` | Extra attributes for each cell of a data row, such as test hooks. |
| `highlightedRows` | `readonly RowKey[]` |  |  | Keys of rows to highlight (e.g. the row being edited). |
| `flash` | `FlashMode` |  |  | Briefly highlight cells whose value changes (live data, enrichment). Columns can override. |
| `virtual` | `VirtualOptions \| false` | `false` | `virtualScrollingFeature` | Virtual scrolling: only the rows in view render. Rows share one height (`rowHeight`, px) and the grid needs a bounded height. Needs the virtual scrolling feature. |
| `virtualColumns` | `VirtualColumnsOptions \| boolean` |  | `columnVirtualizationFeature` | Column virtualization: only the columns in view (plus `overscan`) render cells, besides the pinned ones and the checkbox. `true` or `{ overscan, width }`. Needs the column virtualization feature. |
| `storage` | `ColumnStateStorage \| string` |  |  | Persist column state (order, hidden, pins, widths): a localStorage key or your own storage. |
| `pinnedMaxShare` | `number \| false` | `0.5` | `columnPinningFeature` | Pinned columns scroll like the others while together they'd take more than this share of the grid's width (a phone, a narrow panel); pinned again once there's room. `false`: always pinned. Column pinning feature. |
| `renderers` | `CellRendererDefinition[]` |  |  | Renderers usable by name in this grid (merged over the app-wide ones). |
| `locale` | `string` |  |  | Locale for number / date renderers (default: the plugin's, else the browser's). |
| `currency` | `string` |  |  | Default ISO 4217 currency for currency renderers. |
| `timeZone` | `string` |  |  | IANA time zone for date renderers and date filters. |
| `density` | `Density` |  |  | Cell padding scale. |
| `loading` | `boolean` | `false` |  | Shows a progress bar and sets `aria-busy` (server data sets it by itself). |
| `skeleton` | `boolean \| number` |  |  | While loading with no rows to show yet: placeholder rows in the grid's own columns instead of the `Loading…` line (still read out to screen readers). `true` = 8 rows, or a number. |
| `emptyText` | `string` |  |  | Shown when there are no rows. Default: `messages.empty`, else `No data to show.` |
| `ariaLabel` | `string` |  |  | Accessible name of the grid. |
| `ui` | `Partial<Record<GridPart, ClassValue>>` |  |  | Extra classes per part (`root`, `header`, `headerCell`, `row`, `cell`, `subgrid`, `detail`, `empty`), e.g. Tailwind utilities. |
| `contextMenu` | `(ctx: CellContext<T>) => MenuItem[] \| null \| undefined` |  | `menusFeature` | Right-click menu items for a body cell. Return `null`/`[]` to keep the browser's menu. |
| `headerMenu` | `boolean \| ((ctx: HeaderMenuContext<T>) => MenuItem[] \| null \| undefined)` | `true` | `menusFeature` | Header right-click menu: `true` = built-in items (sort, pin, move, hide, reset), `false` = off, or a function that receives the built-in items and returns the items to show. |
| `pinnedTopRows` | `readonly T[]` |  | `rowPinningFeature` | Extra rows above the body, not part of the data (row pinning feature). |
| `pinnedBottomRows` | `readonly T[]` |  | `rowPinningFeature` | Extra rows below the body, not part of the data (row pinning feature). |
| `totals` | `boolean \| 'top' \| 'bottom'` | `false` | `aggregationFeature` | A totals row with each column's `aggregate` (aggregation feature): `true` / `'bottom'` sticks it to the bottom, `'top'` under the header. |
| `totalsLabel` | `string` |  | `aggregationFeature` | The totals row's label, in its first column (unless that column has an aggregate). Default: `messages.total`, else `Total`. |
| `aggregates` | `Record<string, unknown>` |  | `aggregationFeature` | Totals row values by column key, instead of computing them (e.g. totals from a server). |
| `groupsExpanded` | `boolean` | `false` | `rowGroupingFeature` | Groups start expanded (row grouping feature). Default: collapsed. |
| `multiSort` | `boolean` |  | `sortingFeature` | Multi-column sort (sorting feature): Shift-click (or Shift+Enter) on a header adds it as the next key, Shift-click again turns it descending, then removes it. `v-model:sorts` holds every key, `v-model:sort` the first; server queries get `sorts` too. |

## `v-model`s

| Model | Type | Default | Needs | Description |
|---|---|---|---|---|
| `v-model:sort` | `SortState \| null` | `null` |  | Sort state: a header click cycles asc → desc → none. Header UI needs the sorting feature. |
| `v-model:sorts` | `SortState[]` | `[]` | `sortingFeature` | Every sort key, the first one first (`multi-sort`). `sort` is the first of them. |
| `v-model:columnState` | `ColumnState \| undefined` | `undefined` |  | Column order, hidden columns, runtime pins and resized widths (persisted with `storage`). |
| `v-model:expanded` | `RowKey[]` | `[]` |  | Keys of expanded rows. Controls both sub-grids and details unless `detailExpanded` is set. |
| `v-model:detailExpanded` | `RowKey[]` |  |  | Keys of open detail panels. Pass an array (including `[]`) to control details separately. |
| `v-model:selected` | `RowKey[]` | `[]` | `selectionFeature` | Keys of selected rows. Needs the selection feature. |
| `v-model:filters` | `FilterState \| null` | `null` | `filteringFeature` | Column filters and quick search: `{ columns: Record<key, ColumnFilter>, search }`. Needs the filtering feature. |
| `v-model:page` | `number` | `1` | `paginationFeature` | Current page (1-based); resets to 1 when sort or filters change. Needs the pagination feature. |
| `v-model:pageSize` | `number` | `25` | `paginationFeature` | Rows per page. Needs the pagination feature. |
| `v-model:pinnedRows` | `PinnedRowsState \| null` | `null` | `rowPinningFeature` | Top-level rows pinned above / below the body, by key: `{ top, bottom }`. Needs the row pinning feature. |
| `v-model:groupBy` | `readonly string[] \| string \| null` | `null` | `rowGroupingFeature` | Column keys to group the rows by, outermost first (`['region', 'status']`, or one key). Group rows show the value, the row count and the columns' aggregates. Needs the row grouping feature. |
| `v-model:selectAllMatching` | `boolean` | `false` | `selectionFeature` | Server data: every row matching the query is selected, not just the loaded ones (set from the "Select all N rows" banner; ends when filters change or a row is unticked). Act on the query then, not on `selected`. Needs the selection feature. |
| `v-model:selectedGroups` | `GroupPath[]` | `[]` | `serverGroupingFeature` | Server data with row grouping: groups selected by query, by their paths, without loading their rows (a group's checkbox). Act on these with `selected` and the filters. Ends when the filters or the grouping change. Needs the selection and row grouping features. |
| `v-model:range` | `CellRange \| null` | `null` | `rangeSelectionFeature` | The selected block of cells (`range-selection`): `{ start, end }` corner cells by row key and column key, or null. One cell alone is no range. Needs the range selection feature. |

## Events

| Event | Payload | Description |
|---|---|---|
| `query-change` | `[query: GridQuery]` | The combined query (sort, filters, search, page) — on mount and whenever it changes. |
| `load-error` | `[error: unknown]` | A `dataSource` call failed. The grid shows an error with Retry, above the rows from before if any. |
| `row-click` | `[row: T, event: MouseEvent \| KeyboardEvent]` | A row was clicked (not on a link, button or input inside it, nor a `clickable` column). |
| `cell-click` | `[event: CellClickEvent<T>]` | A cell of a `clickable: true` column was clicked. |
| `cell-action` | `[event: CellActionEvent<T>]` | A renderer emitted an action (buttons, toggles, menus, edit, copy). |
| `cell-edit` | `[event: CellEditEvent<T>]` | A cell was edited (editing feature): update your data with `value`. The grid doesn't. |
| `cells-paste` | `[event: CellsPasteEvent<T>]` | A paste finished (range selection + editing): every changed cell (each also a `cell-edit`), the cells left alone and why, and the `save-cell` calls that failed. |
| `cells-fill` | `[event: CellsPasteEvent<T>]` | A fill finished (the fill handle, Ctrl/⌘+D): every changed cell (each also a `cell-edit`, `source: 'fill'`), the cells left alone and why, and the saves that failed. |
| `cells-replace` | `[event: CellsPasteEvent<T>]` | A replace in the find bar finished: every changed cell (each also a `cell-edit`, `source: 'replace'`), the cells left alone and why, and the saves that failed. |
| `cells-clear` | `[event: CellsPasteEvent<T>]` | Cells were cleared (Delete / Backspace, or Ctrl/⌘+X after copying them): every changed cell (each also a `cell-edit`, `source: 'clear'` / `'cut'`), the cells left alone and why, and the saves that failed. |
| `row-move` | `[event: RowMoveEvent<T>]` | A row was dragged or moved with Alt+↑ / Alt+↓ (row reorder feature): move it in your rows. |
| `sub-rows-error` | `[event: { row: T; error: unknown }]` | `loadSubRows` rejected for a row. |
| `context-action` | `[event: ContextActionEvent<T>]` | An item of the body-cell context menu was chosen. |
| `header-action` | `[event: HeaderActionEvent<T>]` | A custom item of the header menu was chosen (built-in items act by themselves). |
| `copy` | `[event: CopyEvent<T>]` | Rows or a cell were copied to the clipboard (export feature: `copyRows()`, Ctrl/⌘+C). |

## Slots

| Slot | Scope | Description |
|---|---|---|
| `cell-<key>` | `{ row: T; value: unknown; rowKey: RowKey; rowIndex: number; depth: number; column: ColumnDef<T> }` | A column's body cell, replacing its renderer: `#cell-<key>`. |
| `header-<key>` | `{ column: ColumnDef<T> }` | A column's header label: `#header-<key>`. For controls use `#column-actions-<key>`. |
| `column-actions-<key>` | `{ column: ColumnDef<T> }` | Interactive content beside the header label and sort button: `#column-actions-<key>`. |
| `sort-icon` | `{ column: ColumnDef<T>; direction: SortDir \| null }` | Decorative artwork for sortable headers. Direction is null when the column is unsorted. |
| `column-group` | `{ group: ColumnHeaderGroup; level: number }` | Content of a grouped column header. The top group row is level 0. |
| `total-<key>` | `{ value: unknown; column: ColumnDef<T>; group?: RowGroup<T> }` | A column's cell in the totals row and in group rows (aggregation, row grouping); `group` in group rows. |
| `group-<key>` | `{ value: unknown; count: number; rows: readonly T[]; column: ColumnDef<T>; group: RowGroup<T> }` | The value of a group row grouped by this column (row grouping feature): `#group-<key>`. |
| `detail` | `{ row: T; rowKey: RowKey; depth: number; close: () => void }` | Expandable detail row. `close()` collapses the panel and returns focus to its row expander. |
| `empty` |  | Shown when there are no rows. |
| `no-match` | `{ clearFilters: () => void; filterCount: number }` | Shown when filters hide every row, instead of the message and its Clear filters button. |
| `load-error` | `{ error: unknown; retry: () => Promise<void>; stale: boolean }` | A failed server request (server data): `stale` when the rows from before stay on screen (the notice above them), else in place of the rows. `retry()` asks again. |
| `select-all-banner` | `{ total: number; page: number; all: boolean; selectAll: () => void; clearSelection: () => void }` | Selection with server data: the "Select all N rows" banner. |
| `status-bar` | `StatusBarScope` | The status bar's content (status bar feature): replaces the counts and the summary. |
| `loading` |  | Shown while loading with no rows yet. |
| `sub-rows-loading` | `{ row: T }` | Shown while a row's lazy children load. |
| `toolbar` | `{ columns: readonly ColumnDef<T>[]; columnState: ColumnState; setColumnState: (state: ColumnState) => void; filters: FilterState; setFilters: (state: FilterState) => void; clearFilters: () => void; activeFilterCount: number; selected: readonly RowKey[]; selectedCount: number; selectedGroups: GroupPath[]; selectAllMatching: boolean; clearSelection: () => void; openFind: (options?: { replace?: boolean; text?: string }) => void; undo: () => Promise<boolean>; redo: () => Promise<boolean>; canUndo: boolean; canRedo: boolean }` | Above the grid: put a search box, column menu, filter summary or batch actions here. |

## Exposed methods (`ref<VGridExposed>()`)

| Method | Signature | Needs | Description |
|---|---|---|---|
| `scrollToTop` | `void` |  | Scrolls the grid back to its first row. |
| `scrollToRow` | `void` |  | Scrolls a row (top-level or nested, also in virtual mode) into view. |
| `scrollToColumn` | `Promise<void>` |  | Scrolls a column into view sideways (with `virtual-columns`, renders it first). |
| `getVisibleRows` | `readonly T[]` |  | Current page's visible body data in display order, including expanded children and rows outside the virtual viewport. Omits generated group headers, details, totals, and pinned rows. Reactive when called in a computed. Treat the returned rows as read-only. |
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
| `clearSelection` | `void` |  | Clears the selection, "all matching rows" included. Selection feature. |
| `getCsv` | `string` |  | The rows as CSV text: the filtered, sorted rows, visible columns, raw values. Export feature. |
| `exportCsv` | `void` |  | Downloads the rows as a CSV file (`filename`, default `export.csv`; UTF-8 with a BOM). Export feature. |
| `getXlsx` | `Promise<Blob>` |  | The rows as an Excel workbook (.xlsx): typed cells (numbers, dates, booleans), number formats from the columns' renderers, a bold frozen header. The writer loads on demand. Export feature. |
| `exportXlsx` | `Promise<void>` |  | Downloads the rows as an Excel file (`filename`, default `export.xlsx`). Export feature. |
| `print` | `Promise<void>` |  | Prints the rows as a table (the browser's print dialog): the filtered, sorted rows on every page (not just those in view), as the cells show them, the header repeated on each printed page, numbers right-aligned, the totals in bold. Resolves when printing is over. Export feature. |
| `copyRows` | `Promise<boolean>` |  | Copies rows to the clipboard as tab-separated text (pastes as cells into spreadsheets): the selected rows by default, as displayed, no header. Resolves `false` if nothing was copied. Export feature. |
| `startEdit` | `boolean` |  | Opens the editor of a cell (editing feature), if the column is `editable` for that row and the row is on screen. Returns whether it opened. |
| `stopEdit` | `void` |  | Closes the open editor: saves its value, or with `cancel` drops it. Editing feature. |
| `selectRange` | `void` |  | Selects a block of cells (`null` clears it), as `v-model:range` does. Range selection feature, with `range-selection`. |
| `getRangeValues` | `unknown[][]` |  | The selected range's raw values, row by row (`[]` without a range). Range selection feature. |
| `copyRange` | `Promise<boolean>` |  | Copies the selected range as tab-separated text, as the cells show it (Ctrl/⌘+C does the same). Resolves `false` without a range. Range selection feature. |
| `pasteText` | `Promise<CellsPasteEvent \| null>` |  | Pastes tab-separated text (what spreadsheets copy) into the editable cells from the selected range's top-left cell, as Ctrl/⌘+V does; a range a whole number of blocks in size is filled. Resolves the `cells-paste` event, or `null` with nowhere to paste. Range selection and editing features. |
| `fillDown` | `Promise<CellsPasteEvent \| null>` |  | Fills the selected range down from its top row, as Ctrl/⌘+D does (the fill handle's rules: one value repeats). Resolves the `cells-fill` event, or `null` without a range of two or more rows. Range selection and editing features. |
| `openFind` | `void` |  | Opens the find bar (Ctrl/⌘+F in the grid; `replace: true` also shows the replace row, as Ctrl/⌘+H does), searching the selected range if there is one, else every cell. Range selection feature (replacing needs the editing feature too). |
| `closeFind` | `void` |  | Closes Find and focuses the current match, or returns focus to the opener when available. |
| `clearRange` | `Promise<CellsPasteEvent \| null>` |  | Clears the selected range's editable cells (else the selected cell's), as Delete / Backspace do: blank text, no number or date, an unticked checkbox. Resolves the `cells-clear` event, or `null` with nothing selected. Range selection and editing features. |
| `cutRange` | `Promise<CellsPasteEvent \| null>` |  | Copies the selected cells, then clears them (Ctrl/⌘+X). Range selection and editing features. |
| `undo` | `Promise<boolean>` |  | Undoes the last change made in the grid (an edit, a checkbox, a whole paste): each cell gets its value back through `cell-edit` (`source: 'undo'`) and `save-cell`, as Ctrl/⌘+Z does. Cells changed since by something else are left alone. Resolves whether anything changed. Editing feature. |
| `redo` | `Promise<boolean>` |  | Redoes the last undone change (Ctrl+Y, Ctrl/⌘+Shift+Z). Editing feature. |
| `canUndo` | `boolean` |  | Whether there's a change to undo (for your own buttons; reactive). |
| `canRedo` | `boolean` |  | Whether there's an undone change to redo (for your own buttons; reactive). |
| `clearHistory` | `void` |  | Forgets every change (e.g. after saving or reloading). |

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
| `initialAutoSize` | `boolean` | `columnResizingFeature` | Fit the column to its first rendered data and header, within the resize bounds (column resizing feature). |
| `group` | `string` | `columnGroupsFeature` | Header group label (column groups feature): adjacent visible columns with the same `group` share one header cell above their own headers. |
| `groupPath` | `readonly ColumnHeaderGroup[]` | `columnGroupsFeature` | Column header groups from outermost to innermost. Takes precedence over `group`. |
| `align` | `Align` |  | Cell and header alignment (default: the renderer's, e.g. `end` for numbers, else `start`). |
| `sortable` | `boolean` | `sortingFeature` | A sort button in the header (sorting feature). Client sorting needs `sort-mode="client"`. |
| `sortField` | `string` |  | Server sorting: the name the backend sorts this column by, when it isn't the column key (e.g. `'player.lastName'` or `'PLACED_AT'`). It arrives as `field` in `query.sort` / `query.sorts`; `v-model:sort` keeps the column key. |
| `sortValue` | `(row: T) => unknown` | `sortingFeature` | The value client sorting compares (default: the renderer's sort value, else the cell value). |
| `sortFn` | `(a: T, b: T) => number` | `sortingFeature` | A full comparator for client sorting; wins over `sortValue`. |
| `pinned` | `PinSide` | `columnPinningFeature` | Initial pin side (the header menu can change it at runtime unless `pinnable: false`). |
| `pinnable` | `boolean` | `columnPinningFeature` | Allow runtime pin changes. `false` keeps the definition's pin and ignores saved overrides. |
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
| `exportValue` | `(row: T) => unknown` | `exportFeature` | The value exports and copying use (export feature), e.g. a plain id for a link or an object. Wins over the cell value and the renderer's text. |
| `exportable` | `boolean` | `exportFeature` | Included in CSV exports and copied rows (export feature)? Default `true`; set `false` on action columns. |
| `editable` | `boolean \| ((row: T) => boolean)` | `editingFeature` | Cells can be edited in place (editing feature): `true`, or per row. Double-click, Enter or F2 on a focused cell, or typing, opens the editor; the grid emits `cell-edit` and your handler updates the data (the grid never changes rows itself). |
| `editor` | `EditorName \| Component` | `editingFeature` | The editor (editing feature): `text`, `number`, `date`, `datetime`, `select`, `checkbox`, or your own component (`CellEditorProps`). Default from the renderer: numbers and money → number, dates → date, booleans → checkbox, status / chip → select, else text. |
| `editorOptions` | `EditorOptions` | `editingFeature` | Options of the editor: the choices of a select, a number's `min` / `max`, a `placeholder`. |
| `validate` | `(value: unknown, row: T) => string \| null \| undefined \| void` | `editingFeature` | Checks an edited value before it is saved (editing feature): return an error message to keep the editor open with it, or nothing to accept the value. |
| `cellClass` | `ClassValue \| ((row: T) => ClassValue)` |  | Extra classes for the column's body cells (or a function of the row). |
| `headerClass` | `ClassValue` |  | Extra classes for the column's header cell. |

## Renderers

Set `renderer` to the definition (`renderer: currencyRenderer`, tree-shakeable) or to a name registered with `createVueGrid({ renderers })` / `:renderers`; `rendererOptions` are typed against it. Option values marked `RowFn` / `RowOption` may also be `(value, row) => …`.

### `text` — `textRenderer`

Text, the default renderer (the only one `<VGrid>` bundles): ellipsis, line clamp, tone, badge, icon, secondary text, copy button. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `ellipsis` | `boolean` | Single line with ellipsis (the full text as a tooltip while it is cut off). |
| `lines` | `number` | Clamp to N lines (the full text as a tooltip while it is cut off). |
| `maxWidth` | `string` | CSS max width of the text, e.g. `'16rem'`: longer text wraps or, with `ellipsis`, is cut. |
| `preserveNewlines` | `boolean` | Keep line breaks in the value (`white-space: pre-line`). |
| `tooltip` | `boolean \| 'always' \| 'overflow' \| RowFn<string \| readonly string[] \| undefined>` | The full text as a tooltip: `'always'` (or `true`), or `'overflow'` only while it is cut off (the default with `ellipsis` / `lines`); `false` = none. A function returns its own text, which is also read out as the cell text's description. |
| `hoverCard` | `RowFn<HoverCardSpec \| readonly (string \| HoverCardLine)[] \| null \| undefined>` | A hover card instead of a tooltip: lines (and copy buttons) in a small popup that opens on hover, or on click / Enter, which also moves focus into it. `(value, row) => ({ title, lines, copy })`, or just the lines. Copy buttons emit `copy` with the copied text, like `copyable`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `tone` | `RowOption<Tone \| undefined>` | Colour of the text (`success`, `danger`, `warning`, `info`, `neutral`, `accent`), or `(value, row) => tone`. |
| `toneMode` | `'text' \| 'fill'` | `text` (default) colours the text; `fill` colours the badge-like background. |
| `bold` | `RowOption<boolean>` | Bold text, for every row or `(value, row) => boolean`. |
| `secondary` | `RowFn<string \| null \| undefined>` | Muted text after the value, e.g. a half-time score: `2:1 (1:0)`. |
| `badge` | `RowFn<BadgeSpec \| string \| null \| undefined>` | Badge before (default) or after the value. |
| `badgePosition` | `'start' \| 'end'` | Where `badge` goes: `start` (default, before the value) or `end`. |
| `icon` | `RowFn<IconSpec \| null \| undefined>` | Icon before the value, e.g. `{ icon: BellIcon, tone: 'warning', label: 'Notify' }`. |
| `copyable` | `RowOption<boolean>` | Adds a copy-to-clipboard button, for every row or `(value, row) => boolean`; emits `copy` with the copied text. |
| `copyValue` | `RowFn<string>` | What gets copied (default: the displayed text). |

### `toggle-text` — `toggleTextRenderer`

Text that toggles a highlight when clicked. Emits `toggle` (with `clickable`). Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `clickable` | `boolean \| RowFn<boolean>` | When true, the text is a button that emits action `toggle`. |
| `highlighted` | `boolean \| RowFn<boolean>` | Shown as switched on (highlighted, `aria-pressed`), e.g. `(v, row) => row.starred`. |
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
| `signed` | `boolean` | Always show the sign (`+3`, `−2`). Default `true` for `signed-number`; `false` formats like `number`. |
| `format` | `Intl.NumberFormatOptions` | `Intl.NumberFormat` options, e.g. `{ maximumFractionDigits: 0 }` or `{ style: 'percent' }`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `clickable` | `RowOption<boolean>` | Renders the number as a link-style button that emits `click` (drill-down). |

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
| `milliseconds` | `boolean` | Show milliseconds in the time (`12:30:05.123`). |
| `twoLines` | `boolean` | Date and time on two lines (default true). |
| `format` | `Intl.DateTimeFormatOptions` | `Intl.DateTimeFormat` options, e.g. `{ dateStyle: 'medium' }`. |
| `placeholder` | `string` | Shown when the value is empty. |

### `boolean` — `booleanRenderer`

Yes / no as text labels or icons. Align: `start` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `trueLabel` | `string` | Text for `true` (and its accessible name in icon mode). Default “Yes”. |
| `falseLabel` | `string` | Text for `false`. Default “No”. |
| `nullLabel` | `string` | Text for `null` / `undefined`. Default: nothing. |
| `display` | `'text' \| 'icon'` | `text` (default): labels. `icon`: a check for true, nothing (or a cross) for false. |
| `falseIcon` | `boolean` | In icon mode, show a cross for false (default: nothing). |

### `status` — `statusRenderer`

A coloured status badge (tone from a map, a function or a constant). With `clickable`, emits `click`. Align: `start` · filter type: `set`.

| Option | Type | Description |
|---|---|---|
| `tone` | `ToneOption` | Badge colour: one tone, a value → tone map (`{ Paid: 'success', Open: 'info' }`), or `(value, row) => tone`. Default `neutral`. |
| `label` | `RowFn<string> \| Record<string, string>` | Label from a function, or a value → label map. |
| `dot` | `boolean` | A coloured dot before the label. Default `true`; `false` hides it. |
| `variant` | `'soft' \| 'solid' \| 'outline'` | `soft` (default, tinted), `solid` (filled) or `outline`. |
| `placeholder` | `string` | Shown when the value is empty. |
| `clickable` | `RowOption<boolean>` | Badge becomes a button that emits `click`. |

### `link` — `linkRenderer`

A safe link (http(s), mailto, tel only), or a `<RouterLink>` with `to` when vue-router is installed. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `href` | `RowFn<string \| undefined>` | The URL, from the value and row (default: the value). Only http(s), mailto and tel are linked; wins over `to`. |
| `to` | `RowFn<RouteTarget \| null \| undefined>` | Router location; rendered with `<RouterLink>` when vue-router is installed, else as an href. |
| `label` | `RowFn<string>` | Link text (default: the value). |
| `target` | `'_self' \| '_blank'` | `_blank` opens a new tab (with `rel="noopener noreferrer"`). |
| `tooltip` | `RowFn<string \| undefined>` | Hover text of the link. |

### `icon` — `iconRenderer`

An icon component, fixed or picked per row. Align: `center` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `icon` | `Component` | Static icon component. |
| `iconFor` | `RowFn<Component \| undefined>` | Picks the icon per row (wins over `icon`). Kept separate because functional components are functions too. |
| `show` | `RowFn<boolean>` | Show the icon for this row (default: always). A hidden icon keeps its space, so columns stay aligned. |
| `label` | `string \| RowFn<string>` | Accessible name and tooltip. Without one the icon is decorative. |
| `tone` | `Tone \| RowFn<Tone \| undefined>` | Icon colour, or `(value, row) => tone`. |

### `json` — `jsonRenderer`

A button that opens the value as escaped JSON in a dialog. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `label` | `string` | Text of the button that opens the JSON in a dialog. Default “View”. |
| `dialogTitle` | `string \| RowFn<string>` | Heading of the dialog (default: the column header). |

### `json-tree` — `jsonTreeRenderer`

A collapsible tree of nested data. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `collapseAt` | `number` | Nodes deeper than this start collapsed. Default 1. |
| `maxDepth` | `number` | Deeper nodes are summarised (“3 items”) instead of expanded. Default unlimited. |
| `parseNested` | `boolean` | String values that contain JSON are shown as nested trees. |
| `collapsed` | `boolean` | Starts hidden behind a toggle button (labelled `toggleLabel`, default “More info”). |
| `toggleLabel` | `string` | Text of the `collapsed` toggle. Default “More info”. |
| `emptyText` | `string` | Shown for null / empty values. Default: nothing. |

### `actions-menu` — `actionsMenuRenderer`

A `⋯` button with a keyboard-friendly menu. Emits the chosen item's `name`. Align: `center` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `actions` | `MenuItem[] \| ((row: any) => MenuItem[])` | Menu items (actions and `{ separator: true }`), or a function of the row. |
| `label` | `string` | Accessible name of the `⋯` button and the menu. Default “Actions”. |

### `action-button` — `actionButtonRenderer`

One button per row. Emits its `action` (default `click`). Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `label` | `string \| RowFn<string>` | Button text (default: the value), or `(value, row) => text`. |
| `action` | `string` | Action name emitted on click. Default `click`. |
| `icon` | `Component` | An icon component before the label. |
| `tone` | `Tone` | Button colour, e.g. `danger` for a delete button. |
| `disabled` | `RowFn<boolean>` | Disable the button for some rows: `(value, row) => boolean`. |
| `visible` | `RowFn<boolean>` | Hide the button for some rows. |
| `variant` | `ButtonVariant` | `outline` (default), `solid` or `ghost`. |
| `iconOnly` | `boolean` | Only the icon; the label becomes its accessible name and tooltip. |

### `multi-line` — `multiLineRenderer`

Stacked lines, each with its own style, link, badge, trend or action. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `lines` | `RowFn<LineInput[] \| null \| undefined>` | Builds the lines; default: the value itself when it's an array. |
| `boldLines` | `number[]` | Indexes of lines to show in bold. |
| `ellipsis` | `boolean` | Each line on one row with ellipsis (default true). |
| `target` | `'_self' \| '_blank'` | `_blank` opens linked lines in a new tab. |
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
| `label` | `RowFn<string>` | Chip text (default: the value, or its `label` / `name` / `text` field). A tone map is keyed by this label. |
| `tooltip` | `RowFn<string \| null \| undefined>` | Hover text (default: the value's `description` field, if any). |
| `shape` | `'square' \| 'circle' \| 'pill'` | `square` (default), `circle` or `pill`. |
| `size` | `string` | Box size for square/circle. Default `1.75rem`. |
| `placeholder` | `string` | Shown when the value is empty. |

### `checkbox` — `checkboxRenderer`

A controlled checkbox, with a tooltip when disabled. Emits `change` with the requested state. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `checked` | `RowFn<boolean>` | Default: the value is truthy. |
| `disabled` | `RowOption<boolean>` | Disabled for every row, or `(value, row) => boolean`. |
| `disabledReason` | `RowFn<string \| null \| undefined>` | Tooltip explaining why it's disabled. |
| `label` | `RowOption<string>` | Accessible name. Default: the column header. |

### `switch` — `switchRenderer`

A controlled on / off switch. Emits `change` with the requested state. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `checked` | `RowFn<boolean>` | Default: the value is truthy. |
| `disabled` | `RowOption<boolean>` | Disabled for every row, or `(value, row) => boolean`. |
| `disabledReason` | `RowFn<string \| null \| undefined>` | Tooltip explaining why it's disabled. |
| `label` | `RowOption<string>` | Accessible name. Default: the column header. |

### `radio` — `radioRenderer`

One selected row across the column (controlled). Emits `select`. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `name` | `string` | Radio group name. Default: the column key. |
| `checked` | `RowFn<boolean>` | Default: the value is truthy. |
| `disabled` | `RowOption<boolean>` | Disabled for every row, or `(value, row) => boolean`. |
| `disabledReason` | `RowFn<string \| null \| undefined>` | Tooltip explaining why it's disabled. |
| `label` | `RowOption<string>` | Accessible name. Default: the column header. |

### `edit` — `editRenderer`

A value with an edit button, for opening your own editor. Emits `edit`. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `format` | `RowFn<string>` | Text shown next to the edit button (default: the value). |
| `placeholder` | `string` | Shown when the value is empty. |
| `label` | `string` | Accessible name of the button. Default “Edit”. |
| `disabled` | `RowOption<boolean>` | Disables the edit button, for every row or `(value, row) => boolean`. |
| `bold` | `boolean` | Bold text. |

### `image` — `imageRenderer`

A thumbnail, with a placeholder when empty or broken. Align: `center` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `src` | `RowFn<string \| null \| undefined>` | Default: the value. |
| `baseUrl` | `string` | Prefixed to relative paths (e.g. a CDN). |
| `alt` | `RowOption<string>` | Alternative text (default: none, a decorative image), or `(value, row) => text`. |
| `size` | `string` | Default `2.5rem`. |
| `fit` | `'contain' \| 'cover'` | `contain` (default) shows the whole image; `cover` fills the box and crops. |
| `shape` | `'rounded' \| 'circle' \| 'square'` | `rounded` (default), `circle` (avatars) or `square`. |

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
| `buttons` | `ButtonSpec[] \| ((row: any) => ButtonSpec[])` | The buttons (`{ name, label, tone?, variant?, disabled?, icon?, hidden? }`), or a function of the row. A click emits the button's `name`. |

### `icon-toggle` — `iconToggleRenderer`

A star / flag style on-off button (controlled). Emits `toggle`. Align: `center` · filter type: `boolean`.

| Option | Type | Description |
|---|---|---|
| `active` | `RowFn<boolean>` | Default: the value is truthy. |
| `icon` | `Component` | Default: an outlined star. |
| `activeIcon` | `Component` | Default: a filled star (or `icon`). |
| `label` | `RowOption<string>` | Accessible name. Default “Toggle”. |
| `activeTone` | `Tone` | Tone when active. Default `warning`. |
| `disabled` | `RowOption<boolean>` | Disabled for every row, or `(value, row) => boolean`. |

### `details` — `detailsRenderer`

A status badge plus an info button with an anchored popover of label / value rows. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `tone` | `ToneOption` | Summary badge tone, like `status`. |
| `label` | `RowFn<string>` | Badge text (default: the value). |
| `items` | `RowFn<DetailItem[] \| null \| undefined>` | Popover rows. Empty → no info button. |
| `title` | `RowOption<string>` | Popover heading. Default: the column header. |
| `triggerLabel` | `string` | Accessible name of the info button. Default “Details”. |

### `list` — `listRenderer`

The first items of a list, with a “+N more” toggle. Emits `expand`. Align: `start` · filter type: `text`.

| Option | Type | Description |
|---|---|---|
| `items` | `RowFn<unknown[] \| null \| undefined>` | Default: the value when it's an array. |
| `itemLabel` | `RowFn<string>` | Text of one item, `(item, row) => string` (default: the item, objects as JSON). |
| `max` | `number` | Items shown before “+N more”. Default 1. |
| `placeholder` | `string` | Shown when the value is empty. |

## Types

### `VirtualOptions`

| Field | Type | Description |
|---|---|---|
| `rowHeight` | `number` | Fixed row height in px. Default text uses one line. Allow room for multiline or custom cells. |
| `overscan`? | `number` | Extra rows rendered above/below the viewport. Default 6. |
| `detailHeight`? | `number` | Estimated height in px of a detail row (`#detail` slot) until it has been rendered and measured. Default 4 × `rowHeight`. Data rows always have `rowHeight`. |

### `PinnedRowsState`

| Field | Type | Description |
|---|---|---|
| `top`? | `RowKey[]` | Keys of the rows pinned above the body, in display order. |
| `bottom`? | `RowKey[]` | Keys of the rows pinned below the body, in display order. |

### `ColumnState`

| Field | Type | Description |
|---|---|---|
| `order` | `string[]` | Column keys in display order (all known columns, visible or not). |
| `hidden` | `string[]` | Keys of hidden columns. |
| `pinned`? | `Record<string, PinSide \| null>` | Runtime pin overrides (e.g. from the header menu). `null` = explicitly unpinned; a missing key falls back to the column's `pinned` definition. Optional so older persisted state still loads. |
| `widths`? | `Record<string, string>` | Widths the user resized columns to (CSS lengths, e.g. `'240px'`). Column resizing feature. |

### `ColumnHeaderGroup`

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Stable identifier within the parent group. |
| `label` | `string` | Visible label, which can change without changing the key. |

### `SortState`

| Field | Type | Description |
|---|---|---|
| `key` | `string` | The sorted column’s `key`. |
| `dir` | `SortDir` | `asc` or `desc`. |
| `field`? | `string` | In a server query (`query.sort`, `query.sorts`, `query-change`): what the backend sorts by, the column's `sortField`, else its key. The grid adds it; you don't pass it. |

### `ColumnFilterOptions`

| Field | Type | Description |
|---|---|---|
| `type`? | `FilterType` | `text`, `number`, `date`, `boolean` or `set` (default: from the renderer). |
| `options`? | `readonly FilterOption[] \| FilterOptionsLoader` | Choices for a `set` filter: a list, or a loader called with the search text (e.g. from a backend — honour `signal`). Default: distinct values from the rows. |
| `placeholder`? | `string` | Placeholder of the filter-row input. |

### `FilterOption`

| Field | Type | Description |
|---|---|---|
| `value` | `unknown` | The value rows are matched against. |
| `label`? | `string` | Text shown for the option (default: the value). |
| `count`? | `number` | Shown next to the option (e.g. number of rows). |

### `MenuAction`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Emitted as the action name. |
| `label` | `string` | Text of the item. |
| `disabled`? | `boolean \| string` | Shown but can’t be chosen. A string also says why (“Settled bets can’t be voided”): shown under the label and read out as the item’s description. Such an item stays focusable, so keyboard and screen reader users reach the reason too. |
| `tone`? | `MenuTone` | Colour, e.g. `danger` for a delete item. |
| `icon`? | `Component` | An icon component before the label. |
| `hint`? | `string` | Shown right-aligned, e.g. a shortcut hint. |
| `items`? | `readonly MenuItem[]` | A submenu: this item opens these items beside it (hover, click, → / Enter / Space) instead of being chosen; ← or Esc goes back. Choosing one of them emits it like any other item. |

### `CellContext`

| Field | Type | Description |
|---|---|---|
| `row` | `T` | The row the cell belongs to. |
| `rowKey` | `RowKey` | The row’s key (`row-key`). |
| `column` | `ColumnDef<T>` | The cell’s column definition. |
| `value` | `unknown` | The cell value (`value` / `field` / `key`). |

### `CellActionEvent`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | The action, e.g. `click`, `change`, `toggle`, `copy` or a button’s `name`. |
| `payload` | `unknown` | Action data: the new value of a toggle or input, the copied text, a line index… |
| `row` | `T` | The row the cell belongs to. |
| `rowKey` | `RowKey` | The row’s key (`row-key`). |
| `column` | `ColumnDef<T>` | The cell’s column definition. |

### `CellClickEvent`

| Field | Type | Description |
|---|---|---|
| `row` | `T` | The row the cell belongs to. |
| `rowKey` | `RowKey` | The row’s key (`row-key`). |
| `column` | `ColumnDef<T>` | The clicked column (one with `clickable: true`). |
| `value` | `unknown` | The cell value. |
| `event` | `MouseEvent \| KeyboardEvent` | The DOM event of the click (Enter on a focused cell clicks it too). |

### `ContextActionEvent`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | The chosen item’s `name`. |
| `item` | `MenuAction` | The chosen item. |
| `row` | `T` | The row the cell belongs to. |
| `rowKey` | `RowKey` | The row’s key (`row-key`). |
| `column` | `ColumnDef<T>` | The cell’s column definition. |
| `value` | `unknown` | The cell value (`value` / `field` / `key`). |

### `HeaderActionEvent`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | The chosen item’s `name`. |
| `item` | `MenuAction` | The chosen item. |
| `column` | `ColumnDef<T>` | The column whose header menu it was. |

### `VueGridConfig`

| Field | Type | Description |
|---|---|---|
| `renderers`? | `CellRendererDefinition[]` | Renderers every grid can use by name (`renderer: 'currency'`); `allRenderers` for all of them. |
| `features`? | `readonly GridFeature[]` | Features every grid in the app gets (`allFeatures` for all of them). |
| `locale`? | `string` | Default locale for number and date renderers (default: the browser’s). |
| `currency`? | `string` | Default ISO 4217 currency for currency renderers. |
| `timeZone`? | `string` | Default IANA time zone for date renderers and date filters. |
| `density`? | `Density` | Default density: `compact`, `cozy` (default) or `comfortable`. |
| `messages`? | `GridMessages` | Built-in text for every grid (translations, wording); a grid's own `messages` win. |
| `parts`? | `GridParts` | Built-in parts to turn off in every grid; a grid's own `parts` win. |

### `HoverCardSpec`

| Field | Type | Description |
|---|---|---|
| `title`? | `string` | Heading, and the card's accessible name (default: the cell text). |
| `lines` | `readonly (string \| HoverCardLine)[]` | The lines, in order: text, or `{ text, label, copy }`. |
| `copy`? | `'lines' \| 'all'` | Copy buttons: one per line (`'lines'`), one for every line (`'all'`), or none (default). |

### `HoverCardLine`

| Field | Type | Description |
|---|---|---|
| `text` | `string` | The line's text. |
| `label`? | `string` | Shown before the text, muted, e.g. `IBAN`. |
| `copy`? | `string \| false` | What its copy button copies (default: `text`); `false`: no button on this line. |

### `BadgeSpec`

| Field | Type | Description |
|---|---|---|
| `text` | `string` | What the badge shows, e.g. `A`. |
| `tone`? | `Tone` | Its colour (`success`, `danger`, …); default `neutral`. |
| `title`? | `string` | Accessible / hover text. |

### `IconSpec`

| Field | Type | Description |
|---|---|---|
| `icon` | `Component` | The icon component (any SVG component). |
| `tone`? | `Tone` | Its colour (`success`, `danger`, …). |
| `label`? | `string` | Accessible label; without one the icon is decorative. |

