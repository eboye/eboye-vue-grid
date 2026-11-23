# vue-grid — design spec

Date: 2026-11-21 · Status: approved

A Vue 3 data-grid library built on CSS Grid. Publishable to npm, extensible with 3rd-party
cell-renderer addons, themeable through CSS custom properties.

## 1. Design principles

| Concern | Approach |
|---|---|
| Data model | Plain row objects `T[]`; columns read via `field`/`value`; column state is separate and never touches data; props never mutated |
| Cell rendering | Renderer registry (`defineCellRenderer`, plugin + local), plus per-column slots |
| Layout cost | Pinned offsets measured with one `ResizeObserver` on header cells and exposed as CSS vars; nothing measured during render |
| Row identity | All row state (selection, expansion, focus) keyed by `rowKey`, so it survives sorting and paging |
| Expansion | One `expanded` model, two presentations: sub-rows (CSS subgrid) and a detail slot |
| Accessibility | `role="grid"` semantics, `aria-sort`, real buttons, keyboard navigation, keyboard column reorder |
| Selection | Computed state, tri-state select-all |
| Safety | No `innerHTML` / `document.write`: JSON shown as text nodes / `<pre>` textContent and a recursive Vue tree component |
| Styling | Plain CSS + `--vg-*` tokens in `@layer vue-grid`; locale/currency via props or `provide`; no design-system or store coupling |

## 2. Packages & tooling

npm workspaces, Node ≥ 20, Vue `^3.5` peer, TypeScript 6 strict (`vue-tsc` needs the JS compiler
API, so not TS 7), ESLint (flat config) + Prettier, Vitest, Playwright.

- `packages/vue-grid` — the library, name `@nocopypaste/vue-grid`. Vite library mode (ESM), declarations by
  `vue-tsc --emitDeclarationOnly`. Exports:
  - `.` — `VGrid`, `VGridPagination`, `VGridColumnMenu`, `createVueGrid`, `defineCellRenderer`,
    `createColumnHelper`, core helpers, types, and the built-in renderers (definitions + components).
    _Implementation decision:_ built-ins are always registered in `<VGrid>` (best DX, ~18 kB gzip for
    the whole library), so a separate `./renderers` entry was dropped.
  - `./style.css` — the theme.
  - `sideEffects: ["**/*.css"]`.
- `packages/cell-renderer-template` — boilerplate addon (`@nocopypaste/vue-grid-renderer-template`),
  standalone and publishable; `@nocopypaste/vue-grid` is a peer dependency.
- `playground/` — Vite app demoing every feature; the target of Playwright browser tests.

## 3. Public API

### 3.1 `<VGrid>` props

```ts
interface VGridProps<T> {
  rows: T[]
  columns: ColumnDef<T>[]
  rowKey: keyof T | ((row: T) => RowKey)          // RowKey = string | number
  // v-model
  sort?: SortState | null                         // { key: string; dir: 'asc' | 'desc' }
  columnState?: ColumnState                       // { order: string[]; hidden: string[] }
  expanded?: RowKey[]
  selected?: RowKey[]
  // behaviour
  sortMode?: 'controlled' | 'client'              // default 'controlled' (emit only)
  selectable?: boolean | 'single'                 // adds the selection column
  selectionMode?: 'cascade' | 'independent'       // sub-row selection propagation, default 'cascade'
  isRowSelectable?: (row: T) => boolean
  subRows?: (row: T) => T[] | undefined | null
  loadSubRows?: (row: T) => Promise<T[]>
  hasSubRows?: (row: T) => boolean                // hint for lazy rows
  rowExpandable?: (row: T) => boolean             // for #detail
  rowClickable?: boolean
  rowClass?: (row: T, index: number) => ClassValue
  highlightedRows?: RowKey[]
  virtual?: { rowHeight: number; overscan?: number } | false
  storage?: ColumnStateStorage | string           // string = localStorage key
  renderers?: CellRendererDefinition[]            // local registrations, override plugin ones
  locale?: string; currency?: string; timeZone?: string
  density?: 'compact' | 'cozy' | 'comfortable'
  loading?: boolean
  emptyText?: string
  ariaLabel?: string
  ui?: Partial<Record<'root'|'header'|'headerCell'|'row'|'cell'|'subgrid'|'detail'|'empty', ClassValue>>
}
```

Events: `update:sort`, `update:columnState`, `update:expanded`, `update:selected`,
`row-click(row, event)`, `cell-click({ row, column, value, event })`,
`cell-action({ name, payload, row, column })`, `sub-rows-error({ row, error })`.

Slots: `cell-<key>`, `header-<key>`, `detail({ row })`, `empty`, `loading`, `toolbar`.

Exposed: `scrollToTop()`, `scrollToRow(key)`, `expandAll()`, `collapseAll()`.

### 3.2 `ColumnDef<T>`

```ts
interface ColumnDef<T, R extends RendererName = RendererName> {
  key: string
  header?: string
  headerTooltip?: string
  field?: string                      // dot path, e.g. 'user.name'
  value?: (row: T) => unknown         // wins over field
  renderer?: R | Component            // default 'text'
  rendererOptions?: RendererOptions<R>
  width?: string                      // any grid track size, default 'auto'
  minWidth?: string
  align?: 'start' | 'center' | 'end'
  sortable?: boolean
  sortValue?: (row: T) => unknown
  sortFn?: (a: T, b: T) => number
  pinned?: 'left' | 'right'
  hidden?: boolean                    // initial visibility
  hideable?: boolean                  // default true
  reorderable?: boolean               // default true
  clickable?: boolean                 // emits cell-click instead of row-click
  cellClass?: ClassValue | ((row: T) => ClassValue)
  headerClass?: ClassValue
}
```

### 3.3 Renderer contract (extension point)

```ts
interface CellRendererProps<T = unknown, V = unknown, O = Record<string, unknown>> {
  value: V; row: T; rowKey: RowKey; rowIndex: number; depth: number
  column: ResolvedColumn<T>; options: O
}
// renderer emits: action(name: string, payload?: unknown)

function defineCellRenderer<O>(def: {
  name: string
  component: Component
  defaults?: Partial<O>
  align?: 'start' | 'center' | 'end'
  sortValue?: (value: unknown, options: O) => unknown
  format?: (value: unknown, options: O, ctx: FormatContext) => string   // text form (tooltips, a11y)
}): CellRendererDefinition<O>

// typing renderer names/options for consumers:
declare module '@nocopypaste/vue-grid' {
  interface CellRendererRegistry { rating: { max?: number } }
}
```

Registration: `app.use(createVueGrid({ renderers, locale, currency, timeZone }))` provides a global
registry; `<VGrid :renderers>` adds local ones. Lookup order: column component → local → plugin →
built-ins. Unknown renderer name: `console.warn` in dev once, fall back to `text`.

Formatting context (`locale`, `currency`, `timeZone`) resolves prop → plugin config → browser default
and is available to renderers through `useGridContext()`.

### 3.4 Built-in renderers

`text` (options `ellipsis`, `lines`, `maxWidth`, `tooltip`), `toggle-text`, `signed-number`,
`number`, `currency`, `change` (direction from `options.direction(value,row)` or sign), `date`,
`datetime` (`milliseconds`), `boolean` (labels), `status` (`tone(value,row)` → success/danger/
warning/info/neutral/accent, dot), `link` (`href(row)`, `target`, emits action `click`), `icon`
(`icon(value,row)` → icon component — no raw SVG strings, so no HTML sink — plus `show(value,row)`
and `label` for a11y),
`json` (button opening a `<dialog>` with pretty-printed JSON via textContent), `json-tree`
(recursive collapsible tree, `collapseAt`), `actions-menu` (menu button + `role="menu"` popover,
`actions(row) → {label, name, disabled?}[]`, emits action `name`), `action-button` (`label`, emits
action). Selection checkbox is built into the grid, not a renderer.

## 4. Rendering model

- Root: `div.vg[role=grid]` with `display:grid; grid-template-columns: var(--vg-columns)`, computed
  from visible columns in current order (selection/expander columns prepended, `auto`/`min-content`).
- Header row and body rows are `div[role=row]` with `display: contents`; cells `div[role=columnheader
  |gridcell]`. Header cells `position: sticky; top: 0`.
- Pinned columns: one `ResizeObserver` on header cells → cumulative left/right offsets written as
  `--vg-pin-offset` on each column's cells via a per-column style object computed once per resize.
- Row state (expanded, selected, loading sub-rows, errors) lives in `Set<RowKey>`-backed reactive
  state keyed by `rowKey`.
- **Sub-rows (subgrid):** an expanded row with children renders, right after its row, a
  `div.vg-subgrid[role=rowgroup]` with `grid-column: 1 / -1; display: grid;
  grid-template-columns: subgrid`, containing the children (recursively, any depth). Children use
  the parent's resolved columns, so reorder/hide/pin apply automatically. Depth exposed as
  `data-depth` and `--vg-depth`; the first data column is indented by
  `calc(var(--vg-depth) * var(--vg-subgrid-indent))`. Async `loadSubRows` runs on first expand, shows
  a loading row, caches by key, error row with retry + `sub-rows-error` event.
- **Detail rows:** `#detail` slot rendered in a full-width `div.vg-detail` (`grid-column: 1 / -1`).
  A different column set = a nested `<VGrid>` inside the detail slot.
- **Selection:** tri-state header checkbox over selectable rows (including loaded sub-rows in
  cascade mode); parent indeterminate when children partly selected.
- **Client sort:** stable sort by `sortFn` → `sortValue` → renderer `sortValue` → raw value;
  children sorted within their parent.
- **Virtual mode:** fixed `rowHeight`; scroll container renders top spacer + window of rows + bottom
  spacer (spacers span `1 / -1`); `aria-rowcount`/`aria-rowindex` set. Sub-rows and detail rows are
  disabled in virtual mode in v1 (dev warning if configured).
- **Column reorder:** pointer-based drag on header cells (with drop indicator), and keyboard:
  focus a header, `Alt+←/→` moves it. Pinned columns reorder only within their pin group.
- **Column menu:** `<VGridColumnMenu>` (checkbox list with filter + reset), driven by
  `columnState`; persistence via `storage` adapter (`{ load(): ColumnState|null; save(s) }`), with a
  built-in localStorage adapter that drops unknown keys and appends new columns.
- **Keyboard:** roving tabindex on cells; arrows move, `Home/End`, `Ctrl+Home/End`, `Enter` activates
  (sort on header, row click on cell), `Space` toggles selection, `→/←` on an expander expands/
  collapses.
- **Pagination:** `<VGridPagination v-model:page :page-size :total>` with first/prev/numbers/next/
  last, ellipsis, `aria-current`.

## 5. Styling

- All CSS in `@layer vue-grid { … }` — consumer CSS and Tailwind utilities win without `!important`.
- Tokens on `.vg` (overridable on any ancestor, or `:root`): `--vg-font-family`, `--vg-font-size`,
  `--vg-line-height`, `--vg-color-text`, `--vg-color-text-muted`, `--vg-color-surface`,
  `--vg-color-header-bg`, `--vg-color-header-text`, `--vg-color-border`, `--vg-color-row-hover`,
  `--vg-color-row-selected`, `--vg-color-row-highlight`, `--vg-color-accent`,
  `--vg-color-focus-ring`, tone colours `--vg-color-{success,danger,warning,info,neutral}`,
  `--vg-cell-padding-x/y`, `--vg-header-padding-x/y`, `--vg-row-gap`, `--vg-radius`,
  `--vg-radius-sm`, `--vg-border-width`, `--vg-shadow-pinned`, `--vg-shadow-popover`,
  `--vg-subgrid-bg`, `--vg-subgrid-indent`, `--vg-subgrid-border`, `--vg-subgrid-radius`,
  `--vg-z-header`, `--vg-z-pinned`, `--vg-z-popover`.
- `data-density` presets adjust padding tokens. Light/dark via `light-dark()` on the colour tokens
  with `color-scheme: light dark`; consumers force one with `color-scheme` or by setting tokens.
- `ui` prop classes applied to parts; stable `vg-*` class names documented for direct targeting.

## 6. Boilerplate addon (`packages/cell-renderer-template`)

A `rating` renderer demonstrating: typed options + defaults, `defineCellRenderer`, module
augmentation for typed `renderer: 'rating'`, reading `useGridContext()`, emitting an `action`,
styling only with `--vg-*` tokens plus its own `--vg-rating-*` tokens in `@layer vue-grid-addons`,
its own Vite library build, README, and a Vitest test.

## 7. Testing & verification

- Vitest (jsdom) for pure logic and component wiring: value access, column-state merge, client sort,
  selection cascade, virtual window maths, registry lookup, storage adapter, pagination ranges.
- Playwright against the playground in Chromium and Firefox with real mouse/keyboard: sorting,
  sticky header/pinned columns geometry while scrolling, column hide/reorder (drag + keyboard),
  persistence across reload, sub-grid expand (sync, async, nested) and column alignment of child
  cells with parent cells, detail row, selection tri-state, keyboard navigation, virtual scrolling
  (DOM row count bounded, correct rows at offset), pagination, theming via token override, custom
  addon renderer + action event. Screenshots at desktop and 390px widths.

## 8. Out of scope (v1)

Column resizing by drag, filtering UI, grouping/aggregation, cell editing, variable-height
virtualisation (and sub-rows/detail in virtual mode), CSV export, SSR-specific work beyond not
touching `window` at import time.
