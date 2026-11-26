# Migrating from RevoGrid

This guide maps a RevoGrid (`@revolist/revogrid`, `@revolist/vue3-datagrid`) setup onto
`@nocopypaste/vue-grid`, one concept at a time, so a screen can move over a column at a time.
The two grids think differently in a few places, and those are the parts worth reading first:

- **Rows are your data.** vue-grid renders plain row objects and never writes into them. There is
  no `setDataAt` / `refresh()`: change a field on a reactive row (or replace the row, or use
  `patchRows`) and only that cell re-renders.
- **Everything beyond a read-only table is an opt-in feature** (`sortingFeature`,
  `columnPinningFeature`, …) and every cell type an opt-in renderer. An option whose feature isn't
  registered does nothing (dev builds warn), so list the features each grid uses.
- **Layout is CSS Grid.** Column widths are CSS track sizes (`'12rem'`, `'1fr'`,
  `'minmax(10rem, 2fr)'`, `'min-content'`), so stretching to the available width and fitting
  content need no plugin.
- **Sorting is controlled by default**, which is what a server-sorted screen wants: a header click
  updates `v-model:sort` and the grid leaves the rows alone. Client sorting is `sort-mode="client"`.

Read [`AGENTS.md`](../packages/vue-grid/AGENTS.md) for the rules and
[`examples.md`](examples.md) for a recipe per feature.

## Grid properties

| RevoGrid                                          | vue-grid                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `source`                                          | `:rows` (and `row-key`, required: a property name or `(row) => id`)                                          |
| `columns`                                         | `:columns` (see below)                                                                                       |
| `pinnedTopSource` / `pinnedBottomSource`          | `pinned-top-rows` / `pinned-bottom-rows`, or `v-model:pinned-rows` (`rowPinningFeature`)                     |
| `rowSize`                                         | `density` (`compact` / `cozy` / `comfortable`) or `--vg-*` padding tokens; virtual rows: `virtual.rowHeight` |
| `readonly`                                        | the default; editing is `editingFeature` + `editable` columns                                                |
| `resize`                                          | `columnResizingFeature` (and `resizable: false` per column)                                                  |
| `canMoveColumns`                                  | `columnReorderFeature` (and `reorderable: false` per column)                                                 |
| `stretch` (Pro `ColumnStretchPlugin`), `flexGrow` | `width: '1fr'` (or `'minmax(10rem, 2fr)'`) on the columns that should take the space                         |
| `autoSizeColumn`, `autoSize`                      | `width: 'auto'` / `'min-content'`; with resizing, double-click a column edge to fit it                       |
| `range`, `useClipboard`                           | `range-selection` + `rangeSelectionFeature` (copy, paste, fill, find and replace)                            |
| `canFocus`                                        | `keyboardNavigationFeature` (an ARIA grid with cell focus); without it, an ARIA table                        |
| `filter`                                          | `filteringFeature` + `filterable` columns, `filter-row`, `<VGridSearch>`                                     |
| `grouping`                                        | `v-model:group-by` + `rowGroupingFeature` (`groupable`, `groupValue` per column)                             |
| Pro `MasterRowPlugin` (expand to a detail row)    | the `#detail="{ row }"` slot (`row-expandable` to limit it); any Vue content, another grid included          |
| `exporting` (export plugin)                       | `exportFeature`: `exportCsv()`, `exportXlsx()`, `print()`, `copyRows()`                                      |
| `theme`                                           | `--vg-*` CSS variables; dark mode follows `color-scheme`                                                     |
| `hideAttribution`                                 | — (nothing to hide)                                                                                          |

## Column properties

| RevoGrid                               | vue-grid                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `prop`                                 | `key` (and `field: 'player.name'` for a nested path, or `value: (row) => …`)                                                   |
| `name`                                 | `header` (`headerTooltip` for a tooltip on it)                                                                                 |
| `size`, `minSize`, `maxSize`           | `width` (a CSS track, e.g. `'12rem'`), `minWidth`, `maxWidth`                                                                  |
| `pin: 'colPinStart'` / `'colPinEnd'`   | `pinned: 'left'` / `'right'` (`columnPinningFeature`)                                                                          |
| `sortable`                             | `sortable` (`sortingFeature`); a backend sort key: `sortField`                                                                 |
| `cellCompare`                          | `sortFn: (a, b) => number`, or `sortValue: (row) => …`                                                                         |
| `readonly`                             | the default; `editable: true \| (row) => boolean` to edit                                                                      |
| `cellTemplate`                         | `renderer: currencyRenderer` etc. with `rendererOptions`; or a `#cell-<key>` slot; or your own renderer (`defineCellRenderer`) |
| `columnTemplate`                       | `header`, `headerTooltip`; or a `#header-<key>` slot                                                                           |
| `cellProperties`                       | `cellClass: (row) => …`; row-level: `row-class`; test hooks: `cell-attrs` (`attributesFeature`)                                |
| `columnProperties`                     | `headerClass`                                                                                                                  |
| `children` (column groups)             | `group: 'Q1'` on each column of the group (`columnGroupsFeature`)                                                              |
| hiding by `size: -1` / `display: none` | `hidden: true` (`columnVisibilityFeature`); a picker with Reset: `<VGridColumnMenu>`; `hideable: false` keeps one out of it    |
| `filter` config                        | `filterable`, `filter: 'text' \| 'number' \| 'date' \| 'boolean' \| 'set'`, `filterValue`                                      |
| `rowDrag`                              | `row-reorder` + `rowReorderFeature`, `@row-move` (controlled)                                                                  |

Saving the column layout (order, visibility, widths, pins) needs no code: `storage="orders-grid"`
keeps it in `localStorage`, or pass a `{ load, save }` adapter to keep it per user on the server
(`load` is synchronous: return what you already fetched with the user's settings).

## Events and methods

| RevoGrid                                | vue-grid                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `beforesortingapply` (server sort)      | `v-model:sort` (`v-model:sorts` with `multi-sort`); with a `data-source`, `query.sort` |
| clearing a sort (third header click)    | the model becomes `null`: no special case                                              |
| `beforecolumndragend`                   | `v-model:column-state` (or just `storage`)                                             |
| `aftercolumnresize`                     | `v-model:column-state` (`widths`)                                                      |
| `beforeedit` / `afteredit`              | `@cell-edit` (store `e.value`), or `:save-cell` for async saves with errors            |
| `groupexpandclick`                      | `expandAll()` / `collapseAll()`, `groups-expanded`                                     |
| row click / dblclick via cell templates | `@row-click`, `@cell-click`, `row-clickable`                                           |
| `setDataAt` + `refresh()`               | assign the field on a reactive row, or `patchRows(rows, patches, rowKey)`              |
| `getSource()` / `getVisibleSource()`    | your `rows`; what is shown: `getCsv()` / `getRangeValues()`                            |
| `scrollToRow` / `scrollToColumnProp`    | `scrollToRow(key)` / `scrollToColumn(key)`                                             |
| `setCellsFocus` / `getSelectedRange`    | `selectRange()` / `v-model:range`                                                      |
| `updateColumns`                         | pass new `columns`; or `setColumnState()` for order, visibility, widths and pins       |

## Cells that carry their own look

RevoGrid templates often read a per-cell object: each cell is `{ value, color, tooltip, … }`
rather than a plain value. vue-grid's renderer options can be functions of `(value, row)`, so one
helper maps such objects onto the text renderer and the rows stay as the API sends them:

```ts
import type { ColumnDef, Tone } from '@nocopypaste/vue-grid'

/** One cell as the API sends it. */
interface CellObject {
  value: string | number | null
  tone?: Tone // the cell's background colour
  tooltip?: string | string[] // a tooltip, or several lines
  copy?: boolean | string // a copy button: true copies the value, a string copies that
}

/** A column for a `CellObject` field: value, colour, tooltip and copy button from the cell itself. */
function objectCell<T extends Record<K, CellObject | undefined>, K extends keyof T & string>(
  key: K,
  def: Omit<ColumnDef<T>, 'key'> = {},
): ColumnDef<T> {
  const cell = (row: T) => row[key] as CellObject | undefined
  return {
    key,
    ...def,
    value: (row) => cell(row)?.value,
    rendererOptions: {
      tone: (_v: unknown, row: T) => cell(row)?.tone,
      toneMode: 'fill',
      tooltip: (_v: unknown, row: T) => cell(row)?.tooltip,
      copyable: (_v: unknown, row: T) => !!cell(row)?.copy,
      copyValue: (_v: unknown, row: T) => {
        const c = cell(row)
        return typeof c?.copy === 'string' ? c.copy : String(c?.value ?? '')
      },
      ...(def.rendererOptions as object),
    },
  }
}

const columns = [
  objectCell<Row, 'player'>('player', {
    header: 'Player',
    sortable: true,
    sortField: 'PLAYER_NAME',
  }),
  objectCell<Row, 'status'>('status', { header: 'Status' }),
]
```

Map your own field names (`color` → `tone`, `enableCopy` / `copyData` → `copy`) in `cell()`. It
runs in Storybook as **Recipes → Cell objects**, with tests. Copy buttons emit `copy` through
`@cell-action`. For other cell types, the same idea works with their options (`status` takes
`tone`, `label`; `link` takes `href`, `to`; most options accept `(value, row) => …`).

## Cell templates → renderers

| A RevoGrid cell template that shows…              | vue-grid renderer                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| text, truncated, coloured, with a tooltip or copy | `text`: `ellipsis` (tooltip when cut off), `tone` + `toneMode: 'fill'`, `copyable` |
| a tooltip with several lines and copy buttons     | `text` with `hoverCard: (v, row) => ({ title, lines, copy: 'lines' })`             |
| money / dates / date-times                        | `currency`, `date`, `datetime` (locale, currency and time zone from the grid)      |
| a status badge                                    | `status` (`tone` map, `label` map, `variant`)                                      |
| yes / no / unknown                                | `boolean` (`nullLabel`, `display: 'icon'`)                                         |
| an up / down change                               | `change`                                                                           |
| a router link (new tab)                           | `link` (`to`, `target: '_blank'`)                                                  |
| several lines, or several links, in one cell      | `multi-line` (each line may have `href` / `to`)                                    |
| a `⋯` actions menu (with submenus)                | `actions-menu` (`actions`; items may have `items`, or `disabled: 'reason'`)        |
| buttons                                           | `action-button`, `button-group`                                                    |
| a switch / checkbox that calls the API            | `switch`, `checkbox` (controlled: handle `@cell-action`)                           |
| an icon with a tooltip                            | `icon`                                                                             |
| a badge with a popup of details                   | `details`                                                                          |
| preformatted text / JSON                          | `code`, `json`, `json-tree`; or `text` with `preserveNewlines`                     |
| a clickable amount that drills down               | `currency` with `clickable` (emits `click`)                                        |

Anything else: a `#cell-<key>="{ row, value }"` slot, or your own renderer with
`defineCellRenderer` (see the README's "Writing a cell renderer").

## States around the grid

- **Loading**: `loading` shows a progress bar; with no rows yet, `skeleton` draws placeholder rows
  in the grid's own columns. **Errors**: with a `data-source`, a failed request shows an error
  with Retry (`#load-error` to replace it). **Empty**: `empty-text` or the `#empty` slot (say "not
  searched yet" or "no results" there).
- **Paging**: `pagination` + `paginationFeature` (client or server), or keep your own pager below
  the grid and pass the page's rows.
- **Filters outside the grid** (a sidebar form): keep them; pass the filtered rows, or the
  filters into your `data-source` query. `v-model:filters` can be driven from outside too.
- **Hidden select-all**: `parts: { selectAll: false }` with `selectable`.

## Workarounds you can delete

- Re-mounting the grid with `:key` after a column change: columns, their order, visibility and
  widths are reactive; change `columns` or the column state.
- `display: none` callbacks for hidden columns, and index fix-ups for pinned columns during drag:
  `hidden`, `pinned` and `columnReorderFeature` handle them.
- Hand-positioned tooltips in `document.body`: tooltips (and hover cards) are popovers in the top
  layer, placed with CSS anchor positioning, shown on keyboard focus too.
- Mounting a Vue app per detail row: `#detail` is a normal slot in the same app (stores, i18n and
  router included).
- Collapsing detail rows around sorting or grouping to keep the data consistent: detail rows
  follow their row through sorting, grouping and virtual scrolling.
- CSS overrides of header internals after upgrades: style the `.vg-*` classes, which are part of
  the API, or the `--vg-*` tokens.
