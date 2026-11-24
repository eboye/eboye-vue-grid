<script lang="ts">
// Replaced by the consumer's bundler, so dev-only blocks drop out of production builds (see
// internal/dev.ts). Declared here: a generic <script setup> can't hold declarations.
declare const process: { env: Record<string, string | undefined> }
</script>

<script setup lang="ts" generic="T">
import {
  computed,
  inject,
  nextTick,
  provide,
  shallowRef,
  toRaw,
  useId,
  useSlots,
  watch,
  watchEffect,
} from 'vue'
import {
  effectivePin,
  gridTemplate,
  normalizeColumnState,
  visibleColumns,
} from '../core/columns'
import type { RowGroup } from '../core/grouping'
import { localStorageAdapter } from '../core/storage'
import { getCellValue, resolveRowKey, type RowKeyGetter } from '../core/value'
import type { RowPatches } from '../core/patch'
import type { MenuHandle } from '../composables/useGridMenus'
import type { DataSource, GridQuery } from '../composables/useDataSource'
import { resolveFeatures } from '../internal/features'
import { warnOnce } from '../internal/dev'
import { supportsHas } from '../internal/supports'
import {
  GRID_CONTEXT_KEY,
  SELECT_COLUMN_KEY,
  type GridContext,
  type PinnedRowItem,
  type ResolvedColumn,
} from '../internal/context'
import { FORMAT_CONTEXT_KEY, GRID_CONFIG_KEY, resolveFormatContext } from '../registry/plugin'
import { createRendererRegistry, isRendererDefinition } from '../registry/registry'
import { textRenderer } from '../renderers/text'
import type {
  CellActionEvent,
  CellClickEvent,
  CellContext,
  CellRendererDefinition,
  ClassValue,
  ColumnDef,
  ColumnState,
  FlashMode,
  FilterState,
  GridFeature,
  FilterStateStorage,
  ColumnStateStorage,
  ContextActionEvent,
  CopyEvent,
  Density,
  GridPart,
  HeaderActionEvent,
  HeaderMenuContext,
  MenuItem,
  PinnedRowsState,
  RowKey,
  SortState,
  VGridExposed,
  VirtualOptions,
} from '../types'
import VGridHeader from './VGridHeader.vue'
import VGridRows from './VGridRows.vue'

const NO_FILTERS: FilterState = Object.freeze({ columns: Object.freeze({}), search: '' }) as FilterState

const props = withDefaults(
  defineProps<{
    /** The rows (client data), used as-is and never mutated. Omit when using `dataSource`. */
    rows?: readonly T[]
    /** Column definitions, in default display order (see `ColumnDef`). */
    columns: readonly ColumnDef<T>[]
    /** Stable unique id of a row: a property name or `(row) => string | number`. All row state is keyed by it. */
    rowKey: RowKeyGetter<T>
    /**
     * Opt-in features for this grid (added to the app-wide `createVueGrid({ features })`):
     * `sortingFeature`, `filteringFeature`, `serverDataFeature`, `paginationFeature`, or
     * `allFeatures`. Read once, when the grid is created.
     */
    features?: readonly GridFeature[]
    /**
     * Server data: called with the current query (sort, filters, search, page) whenever it changes.
     * The grid cancels superseded requests, shows loading and errors, and sorts / filters / pages
     * nothing itself.
     */
    dataSource?: DataSource<T>
    /** Built-in pagination under the grid (server-side with `dataSource`, client-side otherwise). */
    pagination?: boolean | { pageSizes?: number[] }
    /**
     * `controlled` (default): a header click only updates `v-model:sort` (sort on the server or in
     * your own code). `client`: the grid sorts the rows itself. Ignored with `dataSource`.
     */
    sortMode?: 'controlled' | 'client'
    /** `client` (default): the grid filters its rows. `controlled`: it only emits `update:filters`. */
    filterMode?: 'client' | 'controlled'
    /** Show the filter row: an input under each filterable column's header. */
    filterRow?: boolean
    /** Persist the filter model (`string` = localStorage key). */
    filterStorage?: FilterStateStorage | string
    /** Shown when filters hide every row. */
    noMatchText?: string
    /** A selection column: `true` = multi-select (with select-all), `'single'` = one row. */
    selectable?: boolean | 'single'
    /** `cascade` (default): selecting a parent selects its children. `independent`: rows alone. */
    selectionMode?: 'cascade' | 'independent'
    /** Rows that can't be selected get a disabled checkbox. */
    isRowSelectable?: (row: T) => boolean
    /**
     * Drop selected keys whose rows are no longer in the data (after a reload, a delete, a new
     * server page). Default: keys are kept, so a selection can span server pages.
     */
    pruneSelection?: boolean
    /** Synchronous child rows of a row: shown in a nested sub-grid when expanded. */
    subRows?: (row: T) => T[] | undefined | null
    /** Lazy child rows, loaded on first expand (cached, with loading / error / retry). */
    loadSubRows?: (row: T) => Promise<T[]>
    /** With `loadSubRows`: which rows get an expander (default: every row). */
    hasSubRows?: (row: T) => boolean
    /** With a `#detail` slot: which rows can expand to show it (default: every row). */
    rowExpandable?: (row: T) => boolean
    /** Pointer cursor on rows (`row-click` is emitted either way). */
    rowClickable?: boolean
    /** Extra classes for a row. */
    rowClass?: (row: T, index: number) => ClassValue
    /** Keys of rows to highlight (e.g. the row being edited). */
    highlightedRows?: readonly RowKey[]
    /** Briefly highlight cells whose value changes (live data, enrichment). Columns can override. */
    flash?: FlashMode
    /**
     * Virtual scrolling: only the rows in view render. Rows share one height (`rowHeight`, px) and
     * the grid needs a bounded height. Needs the virtual scrolling feature.
     */
    virtual?: VirtualOptions | false
    /** Persist column state (order, hidden, pins, widths): a localStorage key or your own storage. */
    storage?: ColumnStateStorage | string
    /** Renderers usable by name in this grid (merged over the app-wide ones). */
    renderers?: CellRendererDefinition[]
    /** Locale for number / date renderers (default: the plugin's, else the browser's). */
    locale?: string
    /** Default ISO 4217 currency for currency renderers. */
    currency?: string
    /** IANA time zone for date renderers and date filters. */
    timeZone?: string
    /** Cell padding scale. */
    density?: Density
    /** Shows a progress bar and sets `aria-busy` (server data sets it by itself). */
    loading?: boolean
    /** Shown when there are no rows. */
    emptyText?: string
    /** Accessible name of the grid. */
    ariaLabel?: string
    /** Extra classes per part (`root`, `header`, `headerCell`, `row`, `cell`, `subgrid`, `detail`, `empty`), e.g. Tailwind utilities. */
    ui?: Partial<Record<GridPart, ClassValue>>
    /** Right-click menu items for a body cell. Return `null`/`[]` to keep the browser's menu. */
    contextMenu?: (ctx: CellContext<T>) => MenuItem[] | null | undefined
    /**
     * Header right-click menu: `true` = built-in items (sort, pin, move, hide, reset), `false` = off,
     * or a function that receives the built-in items and returns the items to show.
     */
    headerMenu?: boolean | ((ctx: HeaderMenuContext<T>) => MenuItem[] | null | undefined)
    /** Extra rows above the body, not part of the data (row pinning feature). */
    pinnedTopRows?: readonly T[]
    /** Extra rows below the body, not part of the data (row pinning feature). */
    pinnedBottomRows?: readonly T[]
    /**
     * A totals row with each column's `aggregate` (aggregation feature): `true` / `'bottom'` sticks
     * it to the bottom, `'top'` under the header.
     */
    totals?: boolean | 'top' | 'bottom'
    /** The totals row's label, in its first column (unless that column has an aggregate). */
    totalsLabel?: string
    /** Totals row values by column key, instead of computing them (e.g. totals from a server). */
    aggregates?: Record<string, unknown>
    /** Groups start expanded (row grouping feature). Default: collapsed. */
    groupsExpanded?: boolean
  }>(),
  {
    rows: () => [],
    pagination: false,
    headerMenu: true,
    sortMode: 'controlled',
    filterMode: 'client',
    filterRow: false,
    noMatchText: 'No rows match the current filters.',
    selectable: false,
    selectionMode: 'cascade',
    pruneSelection: false,
    rowClickable: false,
    virtual: false,
    loading: false,
    emptyText: 'No data to show.',
    totals: false,
    totalsLabel: 'Total',
    groupsExpanded: false,
  },
)

/** Sort state: a header click cycles asc → desc → none. Header UI needs the sorting feature. */
const sort = defineModel<SortState | null>('sort', { default: null })
/** Column order, hidden columns, runtime pins and resized widths (persisted with `storage`). */
const columnState = defineModel<ColumnState | undefined>('columnState', { default: undefined })
/** Keys of expanded rows (sub-grids and detail rows). */
const expanded = defineModel<RowKey[]>('expanded', { default: () => [] })
/** Keys of selected rows. Needs the selection feature. */
const selected = defineModel<RowKey[]>('selected', { default: () => [] })
/** Column filters and quick search: `{ columns: Record<key, ColumnFilter>, search }`. Needs the filtering feature. */
const filters = defineModel<FilterState | null>('filters', { default: null })
/** Current page (1-based); resets to 1 when sort or filters change. Needs the pagination feature. */
const page = defineModel<number>('page', { default: 1 })
/** Rows per page. Needs the pagination feature. */
const pageSize = defineModel<number>('pageSize', { default: 25 })
/** Top-level rows pinned above / below the body, by key: `{ top, bottom }`. Needs the row pinning feature. */
const pinnedRows = defineModel<PinnedRowsState | null>('pinnedRows', { default: null })
/**
 * Column keys to group the rows by, outermost first (`['region', 'status']`, or one key). Group rows
 * show the value, the row count and the columns' aggregates. Needs the row grouping feature.
 */
const groupBy = defineModel<readonly string[] | string | null>('groupBy', { default: null })
/**
 * Server data: every row matching the query is selected, not just the loaded ones (set from the
 * "Select all N rows" banner; ends when filters change or a row is unticked). Act on the query
 * then, not on `selected`. Needs the selection feature.
 */
const selectAllMatching = defineModel<boolean>('selectAllMatching', { default: false })

const emit = defineEmits<{
  /** The combined query (sort, filters, search, page) — on mount and whenever it changes. */
  'query-change': [query: GridQuery]
  /** A `dataSource` call failed (the grid shows an error with Retry). */
  'load-error': [error: unknown]
  /** A row was clicked (not on a link, button or input inside it, nor a `clickable` column). */
  'row-click': [row: T, event: MouseEvent | KeyboardEvent]
  /** A cell of a `clickable: true` column was clicked. */
  'cell-click': [event: CellClickEvent<T>]
  /** A renderer emitted an action (buttons, toggles, menus, edit, copy). */
  'cell-action': [event: CellActionEvent<T>]
  /** `loadSubRows` rejected for a row. */
  'sub-rows-error': [event: { row: T; error: unknown }]
  /** An item of the body-cell context menu was chosen. */
  'context-action': [event: ContextActionEvent<T>]
  /** A custom item of the header menu was chosen (built-in items act by themselves). */
  'header-action': [event: HeaderActionEvent<T>]
  /** Rows or a cell were copied to the clipboard (export feature: `copyRows()`, Ctrl/⌘+C). */
  copy: [event: CopyEvent<T>]
}>()

defineSlots<{
  /** A column's body cell, replacing its renderer: `#cell-<key>`. */
  [key: `cell-${string}`]: (scope: {
    row: T
    value: unknown
    rowKey: RowKey
    rowIndex: number
    depth: number
    column: ColumnDef<T>
  }) => unknown
  /** A column's header content: `#header-<key>`. */
  [key: `header-${string}`]: (scope: { column: ColumnDef<T> }) => unknown
  /** A column's cell in the totals row and in group rows (aggregation, row grouping); `group` in group rows. */
  [key: `total-${string}`]: (scope: { value: unknown; column: ColumnDef<T>; group?: RowGroup<T> }) => unknown
  /** The value of a group row grouped by this column (row grouping feature): `#group-<key>`. */
  [key: `group-${string}`]: (scope: {
    value: unknown
    count: number
    rows: readonly T[]
    column: ColumnDef<T>
    group: RowGroup<T>
  }) => unknown
  /** Expandable detail row under a row: any content, even another grid. */
  detail?: (scope: { row: T; rowKey: RowKey; depth: number }) => unknown
  /** Shown when there are no rows. */
  empty?: () => unknown
  /** Shown while loading with no rows yet. */
  loading?: () => unknown
  /** Shown while a row's lazy children load. */
  'sub-rows-loading'?: (scope: { row: T }) => unknown
  /** Above the grid: put a search box, column menu, filter summary or batch actions here. */
  toolbar?: (scope: {
    columns: readonly ColumnDef<T>[]
    columnState: ColumnState
    setColumnState: (state: ColumnState) => void
    filters: FilterState
    setFilters: (state: FilterState) => void
    clearFilters: () => void
    /** Active column filters + search. */
    activeFilterCount: number
    /** Keys of the selected rows (selection feature). */
    selected: readonly RowKey[]
    /** How many rows are selected: every matching row with `selectAllMatching`. */
    selectedCount: number
    /** Every row matching the query is selected (server data, "Select all N rows"). */
    selectAllMatching: boolean
    /** Clears the selection (and "all matching"). */
    clearSelection: () => void
  }) => unknown
}>()

const slots = useSlots()
const config = inject(GRID_CONFIG_KEY, undefined)
const root = shallowRef<HTMLElement>()

const formatContext = computed(() =>
  resolveFormatContext({ locale: props.locale, currency: props.currency, timeZone: props.timeZone }, config),
)
provide(FORMAT_CONTEXT_KEY, formatContext)

const getKey = (row: T) => resolveRowKey(row, props.rowKey)

// Features are opt-in, so a grid only bundles what the app registers. Composables can't be added
// later, so the set is fixed when the grid is created.
const features = resolveFeatures(config?.features, props.features)

// ── Column state ────────────────────────────────────────────────────────────────────────────
const storageAdapter = computed<ColumnStateStorage | undefined>(() =>
  typeof props.storage === 'string' ? localStorageAdapter(props.storage) : props.storage,
)
const storedState = shallowRef(storageAdapter.value?.load() ?? null)
watch(storageAdapter, (adapter) => (storedState.value = adapter?.load() ?? null))

/**
 * The columns as laid out. Without the pinning feature, pins are ignored; without the visibility
 * feature, `hidden` is — in the defs and in the (stored) state alike.
 */
const layoutColumns = computed<readonly ColumnDef<T>[]>(() => {
  const keepPins = !!features.columnPinning
  const keepHidden = !!features.columnVisibility
  if (keepPins && keepHidden) return props.columns
  return props.columns.map((c) =>
    (!keepPins && c.pinned) || (!keepHidden && c.hidden)
      ? { ...c, pinned: keepPins ? c.pinned : undefined, hidden: keepHidden ? c.hidden : undefined }
      : c,
  )
})
const effectiveState = computed<ColumnState>(() => {
  const state = normalizeColumnState(layoutColumns.value, columnState.value ?? storedState.value)
  return {
    ...state,
    hidden: features.columnVisibility ? state.hidden : [],
    pinned: features.columnPinning ? state.pinned : undefined,
    widths: features.columnResizing ? state.widths : undefined,
  }
})

function setColumnState(next: ColumnState) {
  const normalized = normalizeColumnState(layoutColumns.value, next)
  columnState.value = normalized
  storageAdapter.value?.save(normalized)
}

// ── Renderers & resolved columns ────────────────────────────────────────────────────────────
const registry = computed(() => createRendererRegistry([textRenderer], config?.renderers, props.renderers))

const camel = (name: string) => name.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())

function resolveRenderer(col: ColumnDef<T>): {
  component: ResolvedColumn['component']
  definition?: CellRendererDefinition
  /** The named renderer isn't registered: rendered as text, without the column's (foreign) options. */
  fallback?: boolean
} {
  const renderer = col.renderer ?? 'text'
  // A definition object (`renderer: currencyRenderer`) — the tree-shakeable form.
  if (isRendererDefinition(renderer)) return { component: toRaw(renderer.component), definition: renderer }
  // toRaw: columns kept in ref()/reactive() would otherwise hand Vue a reactive component.
  if (typeof renderer !== 'string') return { component: toRaw(renderer) }
  const definition = registry.value.get(renderer)
  if (definition) return { component: toRaw(definition.component), definition }
  if (process.env.NODE_ENV !== 'production') {
    warnOnce(
      `renderer:${renderer}`,
      `Unknown renderer "${renderer}" (column "${col.key}"); falling back to "text". ` +
        `Pass the definition (renderer: ${camel(renderer)}Renderer) or register it by name: ` +
        `createVueGrid({ renderers: [${camel(renderer)}Renderer] }) / <VGrid :renderers="[…]">.`,
    )
  }
  return { component: textRenderer.component, definition: textRenderer, fallback: true }
}

/** `virtual`, when the virtual scrolling feature is on. */
const virtualOptions = computed(() => (features.virtualScrolling ? props.virtual || false : false))
const isVirtual = computed(() => !!virtualOptions.value)
const selectMode = computed<false | 'multi' | 'single'>(() =>
  !features.selection ? false : props.selectable === 'single' ? 'single' : props.selectable ? 'multi' : false,
)

const resolvedColumns = computed<ResolvedColumn[]>(() => {
  const state = effectiveState.value
  const data = visibleColumns(layoutColumns.value, state)
  const list: ResolvedColumn[] = []
  if (selectMode.value) {
    list.push({
      key: SELECT_COLUMN_KEY,
      kind: 'select',
      def: { key: SELECT_COLUMN_KEY, width: 'var(--vg-select-column-width)' },
      component: undefined,
      definition: undefined,
      options: {},
      align: 'center',
      pinned: data.some((c) => effectivePin(c, state) === 'left') ? 'left' : undefined,
      pinEdge: false,
      isTree: false,
    })
  }
  data.forEach((def, i) => {
    const { component, definition, fallback } = resolveRenderer(def)
    list.push({
      key: def.key,
      kind: 'data',
      def,
      component,
      definition,
      options: fallback ? {} : { ...(definition?.defaults as object), ...(def.rendererOptions as object) },
      align: def.align ?? definition?.align ?? 'start',
      pinned: effectivePin(def, state),
      pinEdge: false,
      isTree: i === 0,
    })
  })
  // The pin edge is found in CSS (`:has()`); the class is only a fallback for engines without it.
  if (!supportsHas()) {
    const lastLeft = list.findLastIndex((c) => c.pinned === 'left')
    const firstRight = list.findIndex((c) => c.pinned === 'right')
    if (lastLeft >= 0) list[lastLeft]!.pinEdge = true
    if (firstRight >= 0) list[firstRight]!.pinEdge = true
  }
  return list
})

// ── Column resizing ─────────────────────────────────────────────────────────────────────────
const resize = features.columnResizing?.useColumnResize({
  root,
  defOf: (key) => props.columns.find((c) => c.key === key),
  state: () => effectiveState.value,
  setState: setColumnState,
})
/** A resized width (live while dragging, else committed), overriding the column's own `width`. */
const resizedWidth = (key: string) =>
  resize?.live.value?.key === key ? resize.live.value.width : effectiveState.value.widths?.[key]
const canResize = (col: ColumnDef) => !!resize && col.resizable !== false
/**
 * Columns as sized: resized widths applied (for the grid template and the pinned offsets). A
 * resized track is a plain length (already clamped to `minWidth` / `maxWidth`): a `minmax()` track
 * stays at its minimum whenever the columns overflow the grid, so it would never grow.
 */
const sizedColumns = computed(() =>
  resolvedColumns.value.map((c) => {
    const width = c.kind === 'data' ? resizedWidth(c.key) : undefined
    return width ? { ...c, def: { ...c.def, width, minWidth: undefined } } : c
  }),
)

const template = computed(() => gridTemplate(sizedColumns.value.map((c) => c.def)))

/** A row of column group headers is shown (column groups feature, some visible column grouped). */
const hasGroups = computed(
  () => !!features.columnGroups && resolvedColumns.value.some((c) => c.kind === 'data' && !!c.def.group),
)
/** Header rows above the body (1, or 2 with column groups): offsets `aria-rowindex`. */
const headerRows = computed(() => (hasGroups.value ? 2 : 1))

// ── Sorting ─────────────────────────────────────────────────────────────────────────────────
const sortable = (col: ColumnDef<T>) => !!features.sorting && !!col.sortable

const unsorted = (rows: readonly T[]) => rows as T[]
/** The client-side sort as a function, with its reactive inputs read once (for many levels). */
function makeSorter(): (rows: readonly T[]) => T[] {
  const state = sort.value
  const sorting = features.sorting
  if (!sorting || !clientSort.value || !state) return unsorted
  const col = props.columns.find((c) => c.key === state.key)
  if (!col) return unsorted
  // Resolved from the column itself, not from the visible columns: sorting by a hidden column still
  // uses its renderer's sort value, and resizing or reordering columns doesn't re-sort every row.
  const { definition, fallback } = resolveRenderer(col)
  const options = fallback ? {} : { ...(definition?.defaults as object), ...(col.rendererOptions as object) }
  const getter =
    col.sortValue ??
    (definition?.sortValue
      ? (row: T) => definition.sortValue!(getCellValue(row, col), options)
      : (row: T) => getCellValue(row, col))
  return (rows) => sorting.sortRows(rows, state.dir, getter, col.sortFn)
}

function sortRowsFn(rows: readonly T[]): T[] {
  return makeSorter()(rows)
}

function onSort(key: string) {
  if (!features.sorting) return
  const current = sort.value
  sort.value = !current || current.key !== key ? { key, dir: 'asc' } : current.dir === 'asc' ? { key, dir: 'desc' } : null
}

// ── Expansion & sub-rows ────────────────────────────────────────────────────────────────────
const sub = features.subGrids?.useSubRows<T>({
  getKey,
  subRows: () => props.subRows,
  loadSubRows: () => props.loadSubRows,
  hasSubRows: () => props.hasSubRows,
  onError: (row, error) => emit('sub-rows-error', { row, error }),
  // Cascading selection: children loaded under a selected parent arrive selected.
  onLoaded: (row, rows) => {
    if (!sel || !cascadeSelection.value || !selected.value.includes(getKey(row))) return
    const next = new Set(selected.value)
    walk(rows, (child) => {
      if (sel.isRowSelectable(child)) next.add(getKey(child))
    })
    if (next.size !== selected.value.length) selected.value = [...next]
  },
})
// A different loader means different children: forget the cached ones.
watch(
  () => props.loadSubRows,
  () => sub?.clear(),
)

const treeMode = computed(() => !!sub && !!(props.subRows || props.loadSubRows))
const hasDetail = computed(() => !!slots.detail)
const expandedSet = computed(() => new Set(expanded.value))
/** Known child rows (sub-grids only). */
const childrenOf = (row: T) => (treeMode.value ? sub?.children(row) : undefined)

function canExpand(row: T): boolean {
  if (treeMode.value && sub?.mayHaveChildren(row)) return true
  return hasDetail.value && (props.rowExpandable ? props.rowExpandable(row) : true)
}

function toggleExpanded(row: T) {
  const key = getKey(row)
  const next = new Set(expandedSet.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = [...next]
}

// ── Filtering ───────────────────────────────────────────────────────────────────────────────
const gridId = useId()
// The quick search covers the visible columns. Kept stable while only widths, pins or order change,
// so resizing a column doesn't re-run the search over every row.
const searchColumns = computed<ColumnDef<T>[]>((prev) => {
  const next = resolvedColumns.value.filter((c) => c.kind === 'data').map((c) => c.def as ColumnDef<T>)
  return prev && prev.length === next.length && next.every((c) => prev.includes(c)) ? prev : next
})
const filt = features.filtering?.useFilters<T>({
  model: filters,
  storage: () => props.filterStorage,
  mode: () => (serverMode.value ? 'controlled' : props.filterMode),
  columns: () => props.columns,
  visibleColumns: () => searchColumns.value,
  definitionOf: (col) => resolveRenderer(col).definition,
  rows: (): readonly T[] => sourceRows.value,
  childrenOf,
  getKey,
  timeZone: () => props.timeZone ?? config?.timeZone,
})
const filterIdFor = (key: string) => `vg-filter-${gridId}-${key.replace(/[^\w-]/g, '_')}`
function openFilter(key: string) {
  const el = document.getElementById(filterIdFor(key))
  if (el && !el.matches(':popover-open')) el.showPopover?.()
}
const filterState = computed<FilterState>(() => filt?.state.value ?? NO_FILTERS)
const activeFilterCount = computed(() => filt?.activeCount.value ?? 0)
/** Client mode: filter one level of rows, then sort it. */
const prepareRows = (rows: readonly T[]) => sortRowsFn(filt ? filt.apply(rows) : rows)

// ── Server data & query ─────────────────────────────────────────────────────────────────────
/** With a data source the backend sorts, filters and pages; the grid only shows what it returns. */
const serverMode = computed(() => !!features.serverData && !!props.dataSource)
const clientSort = computed(() => !serverMode.value && props.sortMode === 'client')
const paginated = computed(() => !!features.pagination && !!props.pagination && !isVirtual.value)

// `page` / `page-size` come from the app: never slice or query with 0, negative or NaN values.
const currentPageSize = computed(() => {
  const n = Math.floor(pageSize.value)
  return Number.isFinite(n) && n >= 1 ? n : 25
})
const currentPage = computed(() => {
  const n = Math.floor(page.value)
  return Number.isFinite(n) && n >= 1 ? n : 1
})

const query = computed<GridQuery>(() => ({
  sort: sort.value,
  filters: filterState.value,
  page: paginated.value ? currentPage.value : 1,
  pageSize: paginated.value ? currentPageSize.value : null,
}))

const ds = features.serverData?.useDataSource<T>({
  source: () => props.dataSource,
  query: (): GridQuery => query.value,
  getKey,
  onError: (error) => emit('load-error', error),
})

const sourceRows = computed<readonly T[]>(() => (serverMode.value && ds ? ds.rows.value : props.rows))
const isLoading = computed(() => props.loading || !!ds?.loading.value)
const loadError = computed(() => (serverMode.value ? ds?.error.value : undefined))
const reload = async () => {
  sub?.clear()
  await ds?.reload()
}
const reloadSubRows = (key?: RowKey) => sub?.clear(key)

// A new sort or filter starts again at page 1.
watch(
  () => JSON.stringify([sort.value, filterState.value]),
  () => {
    if (page.value !== 1) page.value = 1
  },
)
// One event for apps that fetch on their own (stores, GraphQL…): coalesced per tick, deduplicated.
watch(
  () => JSON.stringify(query.value),
  () => emit('query-change', query.value),
  { immediate: true, flush: 'post' },
)

/** Pre-order walk over the rows that pass the filters and every known child row (sync or loaded). */
function walk(rows: readonly T[], visit: (row: T) => void) {
  for (const row of rows) {
    if (filt && !filt.isVisible(row)) continue
    visit(row)
    const kids = childrenOf(row)
    if (kids) walk(kids, visit)
  }
}

// ── Selection ───────────────────────────────────────────────────────────────────────────────
const cascadeSelection = computed(() => selectMode.value === 'multi' && props.selectionMode === 'cascade' && treeMode.value)
const sel =features.selection?.useSelection<T>({
  selected,
  mode: () => selectMode.value,
  cascade: () => cascadeSelection.value,
  isRowSelectable: () => props.isRowSelectable,
  getKey,
  rows: (): readonly T[] => sourceRows.value,
  children: childrenOf,
  visibleChildren: (row) => (childrenOf(row) ?? []).filter((kid) => !filt || filt.isVisible(kid)),
  walk,
  view: () => ({ rows: windowRows.value, ctx: context }),
  prune: () => props.pruneSelection,
  allMatching: selectAllMatching,
  matchingTotal: () => (serverMode.value ? ds?.total.value : undefined),
  matchKey: () => JSON.stringify(filterState.value),
})
const allState = computed(() => sel?.allState.value ?? 'none')
const hasSelectableRows = computed(() => !!sel?.selectableKeys.value.length)

// ── Row grouping ────────────────────────────────────────────────────────────────────────────
// It groups the body's rows (`topRows`, below); the context, virtual layout and menu learn about
// group rows from it.
const grouping = features.rowGrouping?.useRowGrouping<T>({
  groupBy: () => groupBy.value,
  setGroupBy: (keys) => (groupBy.value = keys),
  columns: () => props.columns,
  rows: () => topRows.value,
  sort: () => (features.sorting ? sort.value : null),
  expandedByDefault: () => props.groupsExpanded,
  selected,
  cascade: () => cascadeSelection.value,
  walk,
})

// ── Pinned columns, drag & keyboard ─────────────────────────────────────────────────────────
const pinning = features.columnPinning
const pinOffsets = pinning?.usePinnedOffsets(root, () => sizedColumns.value)
pinning?.useScrollEdges(root, () => template.value)
const canPin = (col: ColumnDef<T>) => !!pinning && col.pinnable !== false

const reorder = features.columnReorder
const canReorder = (key: string) =>
  !!reorder && props.columns.find((c) => c.key === key)?.reorderable !== false

const drag = reorder?.useColumnDrag({
  canDrag: canReorder,
  canDrop: (from, to) => reorder.moveColumn(layoutColumns.value, effectiveState.value, from, to) !== effectiveState.value,
  onDrop: (from, to) => {
    const side = drag?.target.value?.side ?? 'before'
    const next = reorder.moveColumnRelative(layoutColumns.value, effectiveState.value, from, to, side)
    if (next !== effectiveState.value) setColumnState(next)
  },
  // Touch: a header held and released in place opens its menu (`menus` is set up below).
  onHold: (key, el, x, y) => {
    const col = props.columns.find((c) => c.key === key)
    if (col) menus?.openHeaderMenuAt(col, x, y, el)
  },
})
/** A header `pointerdown`: drag to reorder (and, on touch, hold for the menu). */
function onHeaderPointerDown(event: PointerEvent, key: string) {
  if (drag) return drag.onPointerDown(event, key)
  const col = props.columns.find((c) => c.key === key)
  if (col) menus?.holdHeader(col, event, event.currentTarget as HTMLElement)
}

/** Swaps a column with its visible neighbour (keyboard Alt+←/→ and the header menu). */
function moveColumnBy(key: string, direction: -1 | 1): boolean {
  if (!reorder) return false
  const data = resolvedColumns.value.filter((c) => c.kind === 'data')
  const neighbour = data[data.findIndex((c) => c.key === key) + direction]
  if (!neighbour) return false
  const next = reorder.moveColumn(layoutColumns.value, effectiveState.value, key, neighbour.key)
  if (next === effectiveState.value) return false
  setColumnState(next)
  return true
}

const keyboardNav = !!features.keyboardNavigation
const keyboard = features.keyboardNavigation?.useGridKeyboard(root, {
  moveColumn(key, direction) {
    if (!moveColumnBy(key, direction)) return
    nextTick(() =>
      keyboard?.focusCell(root.value?.querySelector<HTMLElement>(`.vg-header > [data-col-key="${CSS.escape(key)}"]`)),
    )
  },
  resizeColumn: resize
    ? (key, delta) => {
        const col = props.columns.find((c) => c.key === key)
        if (col && canResize(col)) resize.step(key, delta)
      }
    : undefined,
})
const onKeyDown = (event: KeyboardEvent) => {
  keyboard?.onKeyDown(event)
  exporter?.onKeyDown(event)
}
const onFocusIn = (event: FocusEvent) => keyboard?.onFocusIn(event)
/** ARIA grid with keyboard navigation; a plain table (and tabbable controls) without it. */
const gridRole = computed(() => (!keyboardNav ? 'table' : context.treeMode.value ? 'treegrid' : 'grid'))

// ── Context menus ───────────────────────────────────────────────────────────────────────────
const menuRef = shallowRef<MenuHandle>()
const menus = features.menus?.useMenus<T>({
  menu: menuRef,
  columns: () => layoutColumns.value,
  columnState: () => effectiveState.value,
  setColumnState,
  sort,
  sortable,
  pinnable: canPin,
  reorderable: (col) => canReorder(col.key),
  hideColumn:
    features.columnVisibility &&
    ((key) => setColumnState(features.columnVisibility!.setColumnHidden(effectiveState.value, key, true))),
  resize: resize && {
    can: canResize,
    isResized: (key) => !!effectiveState.value.widths?.[key],
    fit: (key) => void resize.autosize(key),
    reset: (key) => resize.reset(key),
  },
  moveColumnBy,
  contextMenu: () => props.contextMenu,
  headerMenu: () => props.headerMenu,
  grouping: grouping?.menu,
  onContextAction: (event) => emit('context-action', event),
  onHeaderAction: (event) => emit('header-action', event),
  filters: filt && {
    isActive: (key) => filt.isActive(key),
    anyActive: () => filt.activeCount.value > 0,
    open: (key) => openFilter(key),
    clear: (key) => filt.setColumnFilter(key, undefined),
    clearAll: () => filt.clearAll(),
  },
})

// ── Pinned rows & totals ────────────────────────────────────────────────────────────────────
/** Reads `row-key` once, for passes over many rows. */
const keyReader = () => {
  const rowKey = props.rowKey
  return (row: T) => resolveRowKey(row, rowKey)
}
const PinnedRows = features.rowPinning?.PinnedRows ?? features.aggregation?.PinnedRows

/** Top-level rows that pass the filters (every page): what the totals cover. */
const filteredTopRows = computed(() => (filt ? filt.apply(sourceRows.value) : sourceRows.value))

const pins = features.rowPinning?.usePinnedRows<T>({
  model: pinnedRows,
  rows: () => sourceRows.value,
  keyOf: keyReader,
  extraTop: () => props.pinnedTopRows,
  extraBottom: () => props.pinnedBottomRows,
})
const totals = features.aggregation?.useTotals<T>({
  totals: () => props.totals,
  given: () => props.aggregates,
  rows: () => filteredTopRows.value,
  columns: () => props.columns,
})
const NO_PINNED: readonly PinnedRowItem[] = []
/** The sticky sections' rows: the totals (top or bottom) around the pinned rows. */
const pinnedItems = computed(() => {
  if (!pins && !totals) return { top: NO_PINNED, bottom: NO_PINNED }
  const at = totals?.at.value
  const total = at ? [totals.item.value] : []
  return {
    top: [...(at === 'top' ? total : []), ...(pins?.items.value.top ?? [])],
    bottom: [...(pins?.items.value.bottom ?? []), ...(at === 'bottom' ? total : [])],
  }
})
const pinnedTopCount = computed(() => pinnedItems.value.top.length)

/** Pins a top-level row above or below the body (`null` unpins it). */
function pinRow(key: RowKey, side: 'top' | 'bottom' | null) {
  if (pins) pins.pinRow(key, side)
  else if (process.env.NODE_ENV !== 'production') warnOnce('feature:rowPinning', 'pinRow() needs the row pinning feature (rowPinningFeature).')
}

// ── Virtualisation ──────────────────────────────────────────────────────────────────────────
/** The body's top-level rows: filtered and sorted, without the pinned ones. */
const topRows = computed(() => {
  const all = sortRowsFn(filteredTopRows.value)
  const pinned = pins?.keys.value
  if (!pinned?.size) return all
  const key = keyReader()
  return all.filter((row) => !pinned.has(key(row)))
})
/** The body's top level: the rows, or their groups (row grouping; type-erased like the rows). */
const displayRows = computed<readonly T[]>(() =>
  grouping?.active.value ? (grouping.groups.value as unknown as T[]) : topRows.value,
)
const virt = features.virtualScrolling?.useVirtualRows<T>({
  root,
  options: () => virtualOptions.value,
  rows: () => displayRows.value,
  keyOf: grouping ? () => grouping.keyOf(keyReader()) : keyReader,
  expanded: () => grouping?.expanded(expandedSet.value) ?? expandedSet.value,
  subRows: () => {
    const tree = treeMode.value && sub ? sub.snapshot : null
    return grouping ? grouping.tree(tree) : tree
  },
  hasDetail: () => hasDetail.value,
  isGroup: () => (grouping?.active.value ? grouping.isGroup : undefined),
  rowExpandable: () => props.rowExpandable,
  preparer: () => {
    const visible = filt?.visibleKeys.value ?? null
    const sorter = makeSorter()
    const key = keyReader()
    const prepare = (rows: readonly T[]) => sorter(visible ? rows.filter((row) => visible.has(key(toRaw(row)))) : rows)
    return grouping ? grouping.preparer(prepare) : prepare
  },
})
const onScroll = () => virt?.onScroll()
/** Virtual mode: positions of every visible row, detail row and sub-grid. */
const virtualLayout = computed(() => virt?.layout.value ?? null)
/** Rows on all pages: the server's total, or the filtered client rows (top-level groups when grouped). */
const totalRows = computed(() => (serverMode.value ? (ds?.total.value ?? sourceRows.value.length) : displayRows.value.length))
const windowRows = computed(() => {
  if (paginated.value && !serverMode.value) {
    const start = (currentPage.value - 1) * currentPageSize.value
    return displayRows.value.slice(start, start + currentPageSize.value)
  }
  return displayRows.value
})
// Stay on a page that exists — when filters shrink the rows, the page size grows, the app sets an
// out-of-range page, or the server's total shrinks — and write it back, so the pager and the rows
// agree. (Server mode: once a response has said how many rows there are.)
watch(
  [paginated, totalRows, currentPageSize, currentPage, () => page.value, () => !serverMode.value || ds?.total.value !== undefined],
  ([on, total, size, current, raw, totalKnown]) => {
    if (!on) return
    const last = totalKnown && Number.isFinite(total) ? Math.max(1, Math.ceil(total / size)) : Number.POSITIVE_INFINITY
    const next = Math.min(current, last)
    if (raw !== next) page.value = next
  },
  { immediate: true },
)

// ── Export & copy ───────────────────────────────────────────────────────────────────────────
const exporter = features.export?.useExport<T>({
  columns: () => resolvedColumns.value,
  allColumns: () => props.columns,
  resolve: resolveRenderer,
  format: () => formatContext.value,
  getKey,
  isGroup: (row) => !!grouping?.isGroup(row),
  rows: (which) =>
    which === 'page' ? windowRows.value : sortRowsFn(which === 'all' ? sourceRows.value : filteredTopRows.value),
  children: childrenOf,
  prepare: (rows, filtered) => (filtered ? prepareRows : sortRowsFn)(rows),
  selected,
  extraRows: () => [...(props.pinnedTopRows ?? []), ...(props.pinnedBottomRows ?? [])],
  totals: () => !!totals?.at.value && { values: totals.values.value, label: props.totalsLabel },
  onCopy: (event) => emit('copy', event),
})

if (process.env.NODE_ENV !== 'production') {
  watchEffect(() => {
    const seen = new Set<RowKey>()
    for (const row of sourceRows.value) {
      const key = getKey(row)
      if (seen.has(key)) {
        warnOnce(`dup:${String(key)}`, `Duplicate row key "${String(key)}". Row keys must be unique.`)
        break
      }
      seen.add(key)
    }
  })
  // A feature-dependent option without its feature does nothing: say which feature to add.
  const missing = (feature: string, what: string) =>
    warnOnce(
      `feature:${feature}`,
      `${what} needs the ${feature} feature. Add ${feature}Feature: <VGrid :features="[${feature}Feature]"> ` +
        `or createVueGrid({ features: [${feature}Feature] }) (allFeatures for everything).`,
    )
  watchEffect(() => {
    const col = (flag: 'sortable' | 'filterable') => props.columns.find((c) => c[flag])?.key
    if (!features.sorting && col('sortable')) missing('sorting', `Column "${col('sortable')}" is sortable; that`)
    if (!features.filtering && (col('filterable') || props.filterRow || filters.value))
      missing('filtering', 'Filtering (`filterable` columns, `filter-row`, `v-model:filters`)')
    if (!features.serverData && props.dataSource) missing('serverData', '`data-source`')
    if (!features.pagination && props.pagination) missing('pagination', '`pagination`')
    if (!features.virtualScrolling && props.virtual) missing('virtualScrolling', '`virtual`')
    if (!features.selection && props.selectable) missing('selection', '`selectable`')
    if (!features.subGrids && (props.subRows || props.loadSubRows)) missing('subGrids', '`sub-rows` / `load-sub-rows`')
    const groupedCol = props.columns.find((c) => c.group)?.key
    if (!features.columnGroups && groupedCol) missing('columnGroups', `Column "${groupedCol}" has a \`group\`; that`)
    const hiddenCol = props.columns.find((c) => c.hidden)?.key ?? columnState.value?.hidden?.[0]
    if (!features.columnVisibility && hiddenCol) missing('columnVisibility', `Column "${hiddenCol}" is hidden; that`)
    const pinnedCol = props.columns.find((c) => c.pinned)?.key
    if (!features.columnPinning && pinnedCol) missing('columnPinning', `Column "${pinnedCol}" is pinned; that`)
    if (!features.menus && (props.contextMenu || typeof props.headerMenu === 'function'))
      missing('menus', '`context-menu` / a `header-menu` function')
    if (!features.rowPinning && (pinnedRows.value || props.pinnedTopRows || props.pinnedBottomRows))
      missing('rowPinning', '`pinned-rows` / `pinned-top-rows` / `pinned-bottom-rows`')
    if (!features.aggregation && props.totals) missing('aggregation', '`totals`')
    const exportCol = props.columns.find((c) => c.exportValue)?.key
    if (!features.export && exportCol) missing('export', `Column "${exportCol}" has an \`exportValue\`; that`)
    const groupKeys = groupBy.value == null ? [] : typeof groupBy.value === 'string' ? [groupBy.value] : groupBy.value
    if (!features.rowGrouping && groupKeys.length) missing('rowGrouping', '`group-by`')
    const unknownGroup = groupKeys.find((k) => !props.columns.some((c) => c.key === k))
    if (features.rowGrouping && unknownGroup !== undefined)
      warnOnce(`group-by:${unknownGroup}`, `\`group-by\` names "${unknownGroup}", which is not a column key; it is ignored.`)
  })
  watch(
    () => props.features,
    () => warnOnce('features-changed', '`features` is read once, when the grid is created; changes are ignored.'),
  )
}

// ── Events ──────────────────────────────────────────────────────────────────────────────────
const highlighted = computed(() => new Set(props.highlightedRows ?? []))

const context: GridContext = {
  keyboardNav,
  cellRole: keyboardNav ? 'gridcell' : 'cell',
  rovingTabindex: keyboardNav ? -1 : undefined,
  columns: resolvedColumns,
  slots,
  ui: computed(() => props.ui ?? {}),
  getKey,
  sortRows: prepareRows,
  sortable,
  resize: resize && {
    Handle: features.columnResizing!.Handle,
    can: canResize,
    start: (event, key) => resize.onPointerDown(event, key),
    autosize: (key) => void resize.autosize(key),
    step: (key, delta) => resize.step(key, delta),
    isSized: (key) => !!effectiveState.value.widths?.[key] || resize.resizing.value === key,
  },
  headerRows,
  pinnedTopCount,
  totals: totals && {
    values: totals.values,
    label: computed(() => props.totalsLabel),
  },
  treeMode,
  hasDetail,
  canExpand,
  isExpanded: (key) => expandedSet.value.has(key),
  toggleExpanded,
  children: (row) => childrenOf(row),
  subRowState: (row) => sub?.state(row),
  ensureSubRows: (row) => sub?.ensure(row),
  retrySubRows: (row) => sub?.retry(row),
  selectMode,
  Checkbox: features.selection?.Checkbox,
  isRowSelectable: (row) => sel?.isRowSelectable(row) ?? false,
  rowCheckState: (row) => sel?.rowCheckState(row) ?? 'none',
  toggleRow: (row, range) => sel?.toggleRow(row, range),
  isHighlighted: (key) => highlighted.value.has(key),
  rowClass: (row, index) => props.rowClass?.(row, index),
  rowClickable: computed(() => props.rowClickable),
  flash: computed(() => props.flash ?? false),
  filters: filt && {
    FilterButton: features.filtering!.FilterButton,
    FilterInput: features.filtering!.FilterInput,
    state: filt.state,
    setSearch: filt.setSearch,
    setColumnFilter: filt.setColumnFilter,
    isActive: filt.isActive,
    typeOf: (col) => filt.typeOf(col as ColumnDef<T>),
    filterRow: computed(() => props.filterRow),
    distinct: filt.distinct,
    idFor: filterIdFor,
    open: openFilter,
  },
  virtual: isVirtual,
  virtualRows: virt?.context,
  pinStyle: (key) => {
    const offset = pinOffsets?.value[key]
    return offset === undefined ? undefined : { '--vg-pin-offset': offset }
  },
  onRowClick: (row, _key, event) => emit('row-click', row, event),
  onCellClick: (row, rowKey, column, event) =>
    emit('cell-click', { row, rowKey, column: column.def, value: getCellValue(row, column.def), event }),
  onCellAction: (row, rowKey, column, name, payload) =>
    emit('cell-action', { name, payload, row, rowKey, column: column.def }),
  onCellContextMenu: (row, rowKey, column, event, el) =>
    menus?.openCellMenu({ row, rowKey, column: column.def, value: getCellValue(row, column.def) }, event, el),
  onHeaderContextMenu: (column, event, el) => menus?.openHeaderMenu(column.def, event, el),
  onCellPointerDown: menus
    ? (row, rowKey, column, event, el) =>
        menus.holdCell({ row, rowKey, column: column.def, value: getCellValue(row, column.def) }, event, el)
    : undefined,
}
grouping?.extend(context, features.rowGrouping!.GroupCells)
provide(GRID_CONTEXT_KEY, context)

// ── Imperative API ──────────────────────────────────────────────────────────────────────────
function scrollToTop() {
  root.value?.scrollTo({ top: 0 })
}

function scrollToRow(key: RowKey) {
  if (virt?.scrollToKey(key)) return
  const cell = root.value?.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(String(key))}"] > .vg-cell`)
  cell?.scrollIntoView({ block: 'nearest' })
}

function expandAll() {
  const keys: RowKey[] = []
  walk(sourceRows.value, (row) => {
    if (canExpand(row)) keys.push(getKey(row))
  })
  expanded.value = keys
  grouping?.setAll(true)
}

function collapseAll() {
  expanded.value = []
  grouping?.setAll(false)
}

/** Field patches for lazily loaded child rows (top-level rows belong to the app: patch those). */
function patchLoadedRows(patches: RowPatches<T>): number {
  return (sub?.patchLoaded(patches) ?? 0) + (serverMode.value && ds ? ds.patch(patches) : 0)
}

function setFilters(state: FilterState) {
  if (filt) filt.setFilters(state)
  else if (process.env.NODE_ENV !== 'production') warnOnce('feature:filtering', 'setFilters() needs the filtering feature (filteringFeature).')
}
const clearFilters = () => filt?.clearAll()
/** Clears the selection, "all matching" included. */
const clearSelection = () => sel?.clear()

/** The export feature's methods; without it they warn (dev) and do nothing. */
function viaExport<K extends 'getCsv' | 'exportCsv' | 'copyRows'>(name: K): VGridExposed[K] {
  return ((options?: object) => {
    if (exporter) return (exporter[name] as (o?: object) => unknown)(options)
    if (process.env.NODE_ENV !== 'production') warnOnce('feature:export', `${name}() needs the export feature (exportFeature).`)
    return name === 'getCsv' ? '' : name === 'copyRows' ? Promise.resolve(false) : undefined
  }) as VGridExposed[K]
}
const getCsv = viaExport('getCsv')
const exportCsv = viaExport('exportCsv')
const copyRows = viaExport('copyRows')

defineExpose<VGridExposed>({
  scrollToTop,
  scrollToRow,
  expandAll,
  collapseAll,
  setColumnState,
  patchLoadedRows,
  setFilters,
  clearFilters,
  openFilter,
  reload,
  reloadSubRows,
  pinRow,
  getCsv,
  exportCsv,
  copyRows,
  clearSelection,
})
</script>

<template>
  <div :class="['vg-root', ui?.root]" :data-density="density ?? config?.density">
    <div v-if="slots.toolbar" class="vg-toolbar">
      <slot
        name="toolbar"
        :columns="columns"
        :column-state="effectiveState"
        :set-column-state="setColumnState"
        :filters="filterState"
        :set-filters="setFilters"
        :clear-filters="clearFilters"
        :active-filter-count="activeFilterCount"
        :selected="selected"
        :selected-count="sel?.count.value ?? 0"
        :select-all-matching="selectAllMatching"
        :clear-selection="clearSelection"
      />
    </div>
    <component
      :is="features.selection.Banner"
      v-if="features.selection && sel?.banner.value"
      v-bind="sel.banner.value"
      @select-all="selectAllMatching = true"
      @clear="clearSelection"
    />
    <div class="vg-viewport">
      <div v-if="isLoading" class="vg-progress" aria-hidden="true" />
      <div
        ref="root"
        :class="[
          'vg',
          {
            'vg-virtual': isVirtual,
            'vg-is-dragging': drag?.dragging.value,
            'vg-is-resizing': resize?.resizing.value,
            'vg-has-groups': hasGroups,
            'vg-grouped': grouping?.active.value,
            'vg-has-pinned-rows': pinnedItems.top.length || pinnedItems.bottom.length,
            'vg-has-cell-menu': !!menus && !!contextMenu,
          },
        ]"
        :role="gridRole"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-busy="isLoading || undefined"
        :aria-rowcount="
          virtualLayout
            ? virtualLayout.rowCount + headerRows + pinnedItems.top.length + pinnedItems.bottom.length
            : undefined
        "
        :aria-colcount="resolvedColumns.length"
        :aria-multiselectable="(keyboardNav && selectMode === 'multi') || undefined"
        :style="{
          '--vg-columns': template,
          '--vg-row-height': virtualOptions ? `${virtualOptions.rowHeight}px` : undefined,
        }"
        @scroll.passive="onScroll"
        @keydown="onKeyDown"
        @focusin="onFocusIn"
      >
        <component :is="features.columnGroups.GroupRow" v-if="hasGroups && features.columnGroups" />
        <VGridHeader
          :sort="sort"
          :all-state="allState"
          :has-selectable-rows="hasSelectableRows"
          :dragging="drag?.dragging.value ?? null"
          :drop-target="drag?.target.value ?? null"
          :can-reorder="canReorder"
          @sort="onSort"
          @toggle-all="sel?.toggleAll()"
          @drag-start="onHeaderPointerDown"
          @header-click="(event: MouseEvent) => drag?.consumeClick(event)"
        />
        <component
          :is="PinnedRows"
          v-if="PinnedRows && pinnedItems.top.length"
          position="top"
          :items="pinnedItems.top"
          :aria-start="virtualLayout ? headerRows + 1 : undefined"
        />
        <template v-if="windowRows.length">
          <VGridRows :rows="windowRows" presorted :layout="virtualLayout ?? undefined" />
        </template>
        <div v-else role="row" class="vg-empty-row">
          <div :role="context.cellRole" :tabindex="context.rovingTabindex" :class="['vg-empty', ui?.empty]">
            <slot v-if="isLoading" name="loading">Loading…</slot>
            <span v-else-if="loadError" class="vg-no-match vg-load-error" role="alert">
              Couldn't load the rows.
              <button type="button" class="vg-link-button" @click="reload()">Retry</button>
            </span>
            <span v-else-if="(serverMode || rows.length) && activeFilterCount" class="vg-no-match">
              {{ noMatchText }}
              <button type="button" class="vg-link-button" @click="clearFilters()">Clear filters</button>
            </span>
            <slot v-else name="empty">{{ emptyText }}</slot>
          </div>
        </div>
        <component
          :is="PinnedRows"
          v-if="PinnedRows && pinnedItems.bottom.length"
          position="bottom"
          :items="pinnedItems.bottom"
          :aria-start="virtualLayout ? headerRows + pinnedItems.top.length + virtualLayout.rowCount + 1 : undefined"
        />
      </div>
    </div>
    <component
      :is="features.pagination.Pagination"
      v-if="paginated && features.pagination"
      v-model:page="page"
      v-model:page-size="pageSize"
      class="vg-grid-pagination"
      :total="totalRows"
      :page-sizes="typeof pagination === 'object' ? pagination.pageSizes : undefined"
    />
    <component
      :is="features.menus.Menu"
      v-if="features.menus && menus"
      ref="menuRef"
      :items="menus.items.value"
      :label="menus.label.value"
      placement="point"
      @select="menus.onSelect"
    />
  </div>
</template>
