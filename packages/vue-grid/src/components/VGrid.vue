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
  onBeforeUnmount,
  provide,
  ref,
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
import { localStorageAdapter } from '../core/storage'
import { getCellValue, resolveRowKey, type RowKeyGetter } from '../core/value'
import type { RowPatches } from '../core/patch'
import { computeVirtualWindow } from '../core/virtual'
import { useGridKeyboard } from '../composables/useGridKeyboard'
import type { MenuHandle } from '../composables/useGridMenus'
import type { DataSource, GridQuery } from '../composables/useDataSource'
import { resolveFeatures } from '../internal/features'
import { warnOnce } from '../internal/dev'
import { supportsHas } from '../internal/supports'
import { GRID_CONTEXT_KEY, SELECT_COLUMN_KEY, type GridContext, type ResolvedColumn } from '../internal/context'
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
  Density,
  GridPart,
  HeaderActionEvent,
  HeaderMenuContext,
  MenuItem,
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
    /** The rows (client data). Omit when using `dataSource`. */
    rows?: readonly T[]
    columns: readonly ColumnDef<T>[]
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
    sortMode?: 'controlled' | 'client'
    /** `client` (default): the grid filters its rows. `controlled`: it only emits `update:filters`. */
    filterMode?: 'client' | 'controlled'
    /** Show the filter row: an input under each filterable column's header. */
    filterRow?: boolean
    /** Persist the filter model (`string` = localStorage key). */
    filterStorage?: FilterStateStorage | string
    /** Shown when filters hide every row. */
    noMatchText?: string
    selectable?: boolean | 'single'
    selectionMode?: 'cascade' | 'independent'
    isRowSelectable?: (row: T) => boolean
    subRows?: (row: T) => T[] | undefined | null
    loadSubRows?: (row: T) => Promise<T[]>
    hasSubRows?: (row: T) => boolean
    rowExpandable?: (row: T) => boolean
    rowClickable?: boolean
    rowClass?: (row: T, index: number) => ClassValue
    highlightedRows?: readonly RowKey[]
    /** Briefly highlight cells whose value changes (live data, enrichment). Columns can override. */
    flash?: FlashMode
    virtual?: VirtualOptions | false
    storage?: ColumnStateStorage | string
    renderers?: CellRendererDefinition[]
    locale?: string
    currency?: string
    timeZone?: string
    density?: Density
    loading?: boolean
    emptyText?: string
    ariaLabel?: string
    ui?: Partial<Record<GridPart, ClassValue>>
    /** Right-click menu items for a body cell. Return `null`/`[]` to keep the browser's menu. */
    contextMenu?: (ctx: CellContext<T>) => MenuItem[] | null | undefined
    /**
     * Header right-click menu: `true` = built-in items (sort, pin, move, hide, reset), `false` = off,
     * or a function that receives the built-in items and returns the items to show.
     */
    headerMenu?: boolean | ((ctx: HeaderMenuContext<T>) => MenuItem[] | null | undefined)
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
    rowClickable: false,
    virtual: false,
    loading: false,
    emptyText: 'No data to show.',
  },
)

const sort = defineModel<SortState | null>('sort', { default: null })
const columnState = defineModel<ColumnState | undefined>('columnState', { default: undefined })
const expanded = defineModel<RowKey[]>('expanded', { default: () => [] })
const selected = defineModel<RowKey[]>('selected', { default: () => [] })
const filters = defineModel<FilterState | null>('filters', { default: null })
const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 25 })

const emit = defineEmits<{
  /** The combined query (sort, filters, search, page) — on mount and whenever it changes. */
  'query-change': [query: GridQuery]
  'load-error': [error: unknown]
  'row-click': [row: T, event: MouseEvent | KeyboardEvent]
  'cell-click': [event: CellClickEvent<T>]
  'cell-action': [event: CellActionEvent<T>]
  'sub-rows-error': [event: { row: T; error: unknown }]
  'context-action': [event: ContextActionEvent<T>]
  'header-action': [event: HeaderActionEvent<T>]
}>()

defineSlots<{
  [key: `cell-${string}`]: (scope: {
    row: T
    value: unknown
    rowKey: RowKey
    rowIndex: number
    depth: number
    column: ColumnDef<T>
  }) => unknown
  [key: `header-${string}`]: (scope: { column: ColumnDef<T> }) => unknown
  detail?: (scope: { row: T; rowKey: RowKey; depth: number }) => unknown
  empty?: () => unknown
  loading?: () => unknown
  'sub-rows-loading'?: (scope: { row: T }) => unknown
  toolbar?: (scope: {
    columns: readonly ColumnDef<T>[]
    columnState: ColumnState
    setColumnState: (state: ColumnState) => void
    filters: FilterState
    setFilters: (state: FilterState) => void
    clearFilters: () => void
    /** Active column filters + search. */
    activeFilterCount: number
  }) => unknown
}>()

const slots = useSlots()
const config = inject(GRID_CONFIG_KEY, undefined)
const root = shallowRef<HTMLElement>()

provide(
  FORMAT_CONTEXT_KEY,
  computed(() => resolveFormatContext({ locale: props.locale, currency: props.currency, timeZone: props.timeZone }, config)),
)

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

/** The columns as laid out: without the pinning feature, pins (in the defs or the state) are ignored. */
const layoutColumns = computed<readonly ColumnDef<T>[]>(() =>
  features.columnPinning ? props.columns : props.columns.map((c) => (c.pinned ? { ...c, pinned: undefined } : c)),
)
const effectiveState = computed(() => {
  const state = normalizeColumnState(layoutColumns.value, columnState.value ?? storedState.value)
  return features.columnPinning || !state.pinned ? state : { ...state, pinned: undefined }
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

const isVirtual = computed(() => !!props.virtual)
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

const template = computed(() => gridTemplate(resolvedColumns.value.map((c) => c.def)))

// ── Sorting ─────────────────────────────────────────────────────────────────────────────────
const sortable = (col: ColumnDef<T>) => !!features.sorting && !!col.sortable

function sortRowsFn(rows: readonly T[]): T[] {
  const state = sort.value
  const sorting = features.sorting
  if (!sorting || !clientSort.value || !state) return rows as T[]
  const col = props.columns.find((c) => c.key === state.key)
  if (!col) return rows as T[]
  const resolved = resolvedColumns.value.find((c) => c.key === col.key)
  const definition = resolved?.definition
  const getter =
    col.sortValue ??
    (definition?.sortValue
      ? (row: T) => definition.sortValue!(getCellValue(row, col), resolved!.options)
      : (row: T) => getCellValue(row, col))
  return sorting.sortRows(rows, state.dir, getter, col.sortFn)
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
})

const treeMode = computed(() => !!sub && !isVirtual.value && !!(props.subRows || props.loadSubRows))
const hasDetail = computed(() => !isVirtual.value && !!slots.detail)
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
const filt = features.filtering?.useFilters<T>({
  model: filters,
  storage: () => props.filterStorage,
  mode: () => (serverMode.value ? 'controlled' : props.filterMode),
  columns: () => props.columns,
  visibleColumns: () => resolvedColumns.value.filter((c) => c.kind === 'data').map((c) => c.def as ColumnDef<T>),
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

const query = computed<GridQuery>(() => ({
  sort: sort.value,
  filters: filterState.value,
  page: paginated.value ? page.value : 1,
  pageSize: paginated.value ? pageSize.value : null,
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
  await ds?.reload()
}

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
const sel = features.selection?.useSelection<T>({
  selected,
  mode: () => selectMode.value,
  cascade: () => selectMode.value === 'multi' && props.selectionMode === 'cascade' && treeMode.value,
  isRowSelectable: () => props.isRowSelectable,
  getKey,
  rows: (): readonly T[] => sourceRows.value,
  children: childrenOf,
  walk,
})
const allState = computed(() => sel?.allState.value ?? 'none')
const hasSelectableRows = computed(() => !!sel?.selectableKeys.value.length)

// ── Pinned columns, drag & keyboard ─────────────────────────────────────────────────────────
const pinning = features.columnPinning
const pinOffsets = pinning?.usePinnedOffsets(root, () => resolvedColumns.value)
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
})

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

const keyboard = useGridKeyboard(root, {
  moveColumn(key, direction) {
    if (!moveColumnBy(key, direction)) return
    nextTick(() =>
      keyboard.focusCell(root.value?.querySelector<HTMLElement>(`.vg-header > [data-col-key="${CSS.escape(key)}"]`)),
    )
  },
})

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
  moveColumnBy,
  contextMenu: () => props.contextMenu,
  headerMenu: () => props.headerMenu,
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

// ── Virtualisation ──────────────────────────────────────────────────────────────────────────
const scrollTop = ref(0)
const viewportHeight = ref(0)
let scrollFrame = 0
let resizeObserver: ResizeObserver | undefined

function onScroll() {
  if (!isVirtual.value) return
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => (scrollTop.value = root.value?.scrollTop ?? 0))
}

watch(
  [root, isVirtual],
  ([el, virtual]) => {
    resizeObserver?.disconnect()
    if (!el || !virtual || typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver(() => (viewportHeight.value = el.clientHeight))
    resizeObserver.observe(el)
    viewportHeight.value = el.clientHeight
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(scrollFrame)
})

const topRows = computed(() => prepareRows(sourceRows.value))
const virtualWindow = computed(() => {
  const v = props.virtual
  if (!v) return null
  return computeVirtualWindow({
    scrollTop: scrollTop.value,
    // Before the first measurement, render one screen's worth rather than nothing.
    viewportHeight: viewportHeight.value || 800,
    rowHeight: v.rowHeight,
    rowCount: topRows.value.length,
    overscan: v.overscan ?? 6,
  })
})
/** Rows on all pages: the server's total, or the filtered client rows. */
const totalRows = computed(() => (serverMode.value ? (ds?.total.value ?? sourceRows.value.length) : topRows.value.length))
const windowRows = computed(() => {
  if (virtualWindow.value) return topRows.value.slice(virtualWindow.value.start, virtualWindow.value.end)
  if (paginated.value && !serverMode.value) {
    const start = (page.value - 1) * pageSize.value
    return topRows.value.slice(start, start + pageSize.value)
  }
  return topRows.value
})
// Client pagination: stay on a page that exists when filters shrink the rows.
watch(totalRows, (total) => {
  if (!paginated.value || serverMode.value) return
  const last = Math.max(1, Math.ceil(total / pageSize.value))
  if (page.value > last) page.value = last
})

if (process.env.NODE_ENV !== 'production') {
  watchEffect(() => {
    if (props.virtual && (props.subRows || props.loadSubRows || slots.detail)) {
      warnOnce('virtual-expand', 'Sub-rows and detail rows are disabled in virtual mode.')
    }
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
    if (!features.selection && props.selectable) missing('selection', '`selectable`')
    if (!features.subGrids && (props.subRows || props.loadSubRows)) missing('subGrids', '`sub-rows` / `load-sub-rows`')
    const pinnedCol = props.columns.find((c) => c.pinned)?.key
    if (!features.columnPinning && pinnedCol) missing('columnPinning', `Column "${pinnedCol}" is pinned; that`)
    if (!features.menus && (props.contextMenu || typeof props.headerMenu === 'function'))
      missing('menus', '`context-menu` / a `header-menu` function')
  })
  watch(
    () => props.features,
    () => warnOnce('features-changed', '`features` is read once, when the grid is created; changes are ignored.'),
  )
}

// ── Events ──────────────────────────────────────────────────────────────────────────────────
const highlighted = computed(() => new Set(props.highlightedRows ?? []))

const context: GridContext = {
  columns: resolvedColumns,
  slots,
  ui: computed(() => props.ui ?? {}),
  getKey,
  sortRows: prepareRows,
  sortable,
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
  toggleRow: (row) => sel?.toggleRow(row),
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
    distinct: (key) => {
      const col = props.columns.find((c) => c.key === key)
      return col ? filt.distinctValues(col) : []
    },
    idFor: filterIdFor,
    open: openFilter,
  },
  virtual: isVirtual,
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
}
provide(GRID_CONTEXT_KEY, context)

// ── Imperative API ──────────────────────────────────────────────────────────────────────────
function scrollToTop() {
  root.value?.scrollTo({ top: 0 })
}

function scrollToRow(key: RowKey) {
  const v = props.virtual
  if (v) {
    const index = topRows.value.findIndex((r) => getKey(r) === key)
    if (index >= 0 && root.value) root.value.scrollTop = index * v.rowHeight
    return
  }
  const cell = root.value?.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(String(key))}"] > .vg-cell`)
  cell?.scrollIntoView({ block: 'nearest' })
}

function expandAll() {
  const keys: RowKey[] = []
  walk(sourceRows.value, (row) => {
    if (canExpand(row)) keys.push(getKey(row))
  })
  expanded.value = keys
}

function collapseAll() {
  expanded.value = []
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
      />
    </div>
    <div class="vg-viewport">
      <div v-if="isLoading" class="vg-progress" aria-hidden="true" />
      <div
        ref="root"
        :class="['vg', { 'vg-virtual': isVirtual, 'vg-is-dragging': drag?.dragging.value }]"
        :role="treeMode ? 'treegrid' : 'grid'"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-busy="isLoading || undefined"
        :aria-rowcount="isVirtual ? topRows.length + 1 : undefined"
        :aria-colcount="resolvedColumns.length"
        :aria-multiselectable="selectMode === 'multi' || undefined"
        :style="{
          '--vg-columns': template,
          '--vg-row-height': virtual ? `${virtual.rowHeight}px` : undefined,
        }"
        @scroll.passive="onScroll"
        @keydown="keyboard.onKeyDown"
        @focusin="keyboard.onFocusIn"
      >
        <VGridHeader
          :sort="sort"
          :all-state="allState"
          :has-selectable-rows="hasSelectableRows"
          :dragging="drag?.dragging.value ?? null"
          :drop-target="drag?.target.value ?? null"
          :can-reorder="canReorder"
          @sort="onSort"
          @toggle-all="sel?.toggleAll()"
          @drag-start="(event: PointerEvent, key: string) => drag?.onPointerDown(event, key)"
          @header-click="(event: MouseEvent) => drag?.consumeClick(event)"
        />
        <template v-if="windowRows.length">
          <div
            v-if="virtualWindow"
            class="vg-spacer"
            aria-hidden="true"
            :style="{ height: `${virtualWindow.padTop}px` }"
          />
          <VGridRows
            :rows="windowRows"
            presorted
            :index-offset="virtualWindow?.start ?? 0"
            :aria-indexed="isVirtual"
          />
          <div
            v-if="virtualWindow"
            class="vg-spacer"
            aria-hidden="true"
            :style="{ height: `${virtualWindow.padBottom}px` }"
          />
        </template>
        <div v-else role="row" class="vg-empty-row">
          <div role="gridcell" tabindex="-1" :class="['vg-empty', ui?.empty]">
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
