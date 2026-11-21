<script setup lang="ts" generic="T">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  shallowRef,
  useSlots,
  watch,
  watchEffect,
} from 'vue'
import { gridTemplate, moveColumn, moveColumnRelative, normalizeColumnState, visibleColumns } from '../core/columns'
import { selectionState, toggleRowSelection } from '../core/selection'
import { sortRows } from '../core/sort'
import { localStorageAdapter } from '../core/storage'
import { getCellValue, resolveRowKey, type RowKeyGetter } from '../core/value'
import { computeVirtualWindow } from '../core/virtual'
import { useColumnDrag } from '../composables/useColumnDrag'
import { useGridKeyboard } from '../composables/useGridKeyboard'
import { usePinnedOffsets } from '../composables/usePinnedOffsets'
import { useSubRows } from '../composables/useSubRows'
import { DEV, warnOnce } from '../internal/dev'
import { GRID_CONTEXT_KEY, SELECT_COLUMN_KEY, type GridContext, type ResolvedColumn } from '../internal/context'
import { FORMAT_CONTEXT_KEY, GRID_CONFIG_KEY, resolveFormatContext } from '../registry/plugin'
import { createRendererRegistry } from '../registry/registry'
import { builtinRenderers, textRenderer } from '../renderers'
import type {
  CellActionEvent,
  CellClickEvent,
  CellRendererDefinition,
  ClassValue,
  ColumnDef,
  ColumnState,
  ColumnStateStorage,
  Density,
  GridPart,
  RowKey,
  SortState,
  VGridExposed,
  VirtualOptions,
} from '../types'
import VGridHeader from './VGridHeader.vue'
import VGridRows from './VGridRows.vue'

const props = withDefaults(
  defineProps<{
    rows: readonly T[]
    columns: readonly ColumnDef<T>[]
    rowKey: RowKeyGetter<T>
    sortMode?: 'controlled' | 'client'
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
  }>(),
  {
    sortMode: 'controlled',
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

const emit = defineEmits<{
  'row-click': [row: T, event: MouseEvent | KeyboardEvent]
  'cell-click': [event: CellClickEvent<T>]
  'cell-action': [event: CellActionEvent<T>]
  'sub-rows-error': [event: { row: T; error: unknown }]
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

// ── Column state ────────────────────────────────────────────────────────────────────────────
const storageAdapter = computed<ColumnStateStorage | undefined>(() =>
  typeof props.storage === 'string' ? localStorageAdapter(props.storage) : props.storage,
)
const storedState = shallowRef(storageAdapter.value?.load() ?? null)
watch(storageAdapter, (adapter) => (storedState.value = adapter?.load() ?? null))

const effectiveState = computed(() => normalizeColumnState(props.columns, columnState.value ?? storedState.value))

function setColumnState(next: ColumnState) {
  const normalized = normalizeColumnState(props.columns, next)
  columnState.value = normalized
  storageAdapter.value?.save(normalized)
}

// ── Renderers & resolved columns ────────────────────────────────────────────────────────────
const registry = computed(() => createRendererRegistry(builtinRenderers, config?.renderers, props.renderers))

function resolveRenderer(col: ColumnDef<T>): { component: ResolvedColumn['component']; definition?: CellRendererDefinition } {
  const renderer = col.renderer ?? 'text'
  if (typeof renderer !== 'string') return { component: renderer }
  const definition = registry.value.get(renderer)
  if (definition) return { component: definition.component, definition }
  warnOnce(`renderer:${renderer}`, `Unknown renderer "${renderer}" (column "${col.key}"); falling back to "text".`)
  return { component: textRenderer.component, definition: textRenderer }
}

const isVirtual = computed(() => !!props.virtual)
const selectMode = computed<false | 'multi' | 'single'>(() =>
  props.selectable === 'single' ? 'single' : props.selectable ? 'multi' : false,
)

const resolvedColumns = computed<ResolvedColumn[]>(() => {
  const data = visibleColumns(props.columns, effectiveState.value)
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
      pinned: data.some((c) => c.pinned === 'left') ? 'left' : undefined,
      pinEdge: false,
      isTree: false,
    })
  }
  data.forEach((def, i) => {
    const { component, definition } = resolveRenderer(def)
    list.push({
      key: def.key,
      kind: 'data',
      def,
      component,
      definition,
      options: { ...(definition?.defaults as object), ...(def.rendererOptions as object) },
      align: def.align ?? definition?.align ?? 'start',
      pinned: def.pinned,
      pinEdge: false,
      isTree: i === 0,
    })
  })
  const lastLeft = list.findLastIndex((c) => c.pinned === 'left')
  const firstRight = list.findIndex((c) => c.pinned === 'right')
  if (lastLeft >= 0) list[lastLeft]!.pinEdge = true
  if (firstRight >= 0) list[firstRight]!.pinEdge = true
  return list
})

const template = computed(() => gridTemplate(resolvedColumns.value.map((c) => c.def)))

// ── Sorting ─────────────────────────────────────────────────────────────────────────────────
function sortRowsFn(rows: readonly T[]): T[] {
  const state = sort.value
  if (props.sortMode !== 'client' || !state) return rows as T[]
  const col = props.columns.find((c) => c.key === state.key)
  if (!col) return rows as T[]
  const resolved = resolvedColumns.value.find((c) => c.key === col.key)
  const definition = resolved?.definition
  const getter =
    col.sortValue ??
    (definition?.sortValue
      ? (row: T) => definition.sortValue!(getCellValue(row, col), resolved!.options)
      : (row: T) => getCellValue(row, col))
  return sortRows(rows, state.dir, getter, col.sortFn)
}

function onSort(key: string) {
  const current = sort.value
  sort.value = !current || current.key !== key ? { key, dir: 'asc' } : current.dir === 'asc' ? { key, dir: 'desc' } : null
}

// ── Expansion & sub-rows ────────────────────────────────────────────────────────────────────
const sub = useSubRows<T>({
  getKey,
  subRows: () => props.subRows,
  loadSubRows: () => props.loadSubRows,
  hasSubRows: () => props.hasSubRows,
  onError: (row, error) => emit('sub-rows-error', { row, error }),
})

const treeMode = computed(() => !isVirtual.value && !!(props.subRows || props.loadSubRows))
const hasDetail = computed(() => !isVirtual.value && !!slots.detail)
const expandedSet = computed(() => new Set(expanded.value))

function canExpand(row: T): boolean {
  if (treeMode.value && sub.mayHaveChildren(row)) return true
  return hasDetail.value && (props.rowExpandable ? props.rowExpandable(row) : true)
}

function toggleExpanded(row: T) {
  const key = getKey(row)
  const next = new Set(expandedSet.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = [...next]
}

/** Pre-order walk over rows and every child row currently known (sync or already loaded). */
function walk(rows: readonly T[], visit: (row: T) => void) {
  for (const row of rows) {
    visit(row)
    if (treeMode.value) {
      const kids = sub.children(row)
      if (kids) walk(kids, visit)
    }
  }
}

// ── Selection ───────────────────────────────────────────────────────────────────────────────
const selectedSet = computed(() => new Set(selected.value))
const cascade = computed(() => selectMode.value === 'multi' && props.selectionMode === 'cascade' && treeMode.value)
const isRowSelectable = (row: T) => (props.isRowSelectable ? props.isRowSelectable(row) : true)

function descendantKeys(row: T): RowKey[] {
  const keys: RowKey[] = []
  walk(sub.children(row) ?? [], (r) => {
    if (isRowSelectable(r)) keys.push(getKey(r))
  })
  return keys
}

function rowCheckState(row: T) {
  const key = getKey(row)
  if (cascade.value) {
    const desc = descendantKeys(row)
    if (desc.length) return selectionState([key, ...desc], selectedSet.value)
  }
  return selectedSet.value.has(key) ? 'all' : 'none'
}

function toggleRow(row: T) {
  if (!selectMode.value || !isRowSelectable(row)) return
  const key = getKey(row)
  if (selectMode.value === 'single') {
    selected.value = selectedSet.value.has(key) ? [] : [key]
    return
  }
  const fullySelected = rowCheckState(row) === 'all'
  const desc = cascade.value ? descendantKeys(row) : []
  // A partially selected parent becomes fully selected on click.
  const base = new Set(selectedSet.value)
  if (!fullySelected) base.delete(key)
  selected.value = [...toggleRowSelection(base, key, desc, cascade.value)]
}

const selectableKeys = computed(() => {
  if (!selectMode.value) return []
  const keys: RowKey[] = []
  walk(props.rows, (row) => {
    if (isRowSelectable(row)) keys.push(getKey(row))
  })
  return keys
})
const allState = computed(() => selectionState(selectableKeys.value, selectedSet.value))

function toggleAll() {
  const next = new Set(selectedSet.value)
  if (allState.value === 'all') for (const k of selectableKeys.value) next.delete(k)
  else for (const k of selectableKeys.value) next.add(k)
  selected.value = [...next]
}

// ── Pinned columns, drag & keyboard ─────────────────────────────────────────────────────────
const pinOffsets = usePinnedOffsets(root, () => resolvedColumns.value)

const canReorder = (key: string) => props.columns.find((c) => c.key === key)?.reorderable !== false

const drag = useColumnDrag({
  canDrag: canReorder,
  canDrop: (from, to) => moveColumn(props.columns, effectiveState.value, from, to) !== effectiveState.value,
  onDrop: (from, to) => {
    const side = drag.target.value?.side ?? 'before'
    const next = moveColumnRelative(props.columns, effectiveState.value, from, to, side)
    if (next !== effectiveState.value) setColumnState(next)
  },
})

const keyboard = useGridKeyboard(root, {
  moveColumn(key, direction) {
    const data = resolvedColumns.value.filter((c) => c.kind === 'data')
    const neighbour = data[data.findIndex((c) => c.key === key) + direction]
    if (!neighbour) return
    const next = moveColumn(props.columns, effectiveState.value, key, neighbour.key)
    if (next === effectiveState.value) return
    setColumnState(next)
    nextTick(() =>
      keyboard.focusCell(root.value?.querySelector<HTMLElement>(`.vg-header > [data-col-key="${CSS.escape(key)}"]`)),
    )
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

const topRows = computed(() => sortRowsFn(props.rows))
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
const windowRows = computed(() =>
  virtualWindow.value ? topRows.value.slice(virtualWindow.value.start, virtualWindow.value.end) : topRows.value,
)

if (DEV) {
  watchEffect(() => {
    if (props.virtual && (props.subRows || props.loadSubRows || slots.detail)) {
      warnOnce('virtual-expand', 'Sub-rows and detail rows are disabled in virtual mode.')
    }
    const seen = new Set<RowKey>()
    for (const row of props.rows) {
      const key = getKey(row)
      if (seen.has(key)) {
        warnOnce(`dup:${String(key)}`, `Duplicate row key "${String(key)}". Row keys must be unique.`)
        break
      }
      seen.add(key)
    }
  })
}

// ── Events ──────────────────────────────────────────────────────────────────────────────────
const highlighted = computed(() => new Set(props.highlightedRows ?? []))

const context: GridContext = {
  columns: resolvedColumns,
  slots,
  ui: computed(() => props.ui ?? {}),
  getKey,
  sortRows: sortRowsFn,
  treeMode,
  hasDetail,
  canExpand,
  isExpanded: (key) => expandedSet.value.has(key),
  toggleExpanded,
  children: (row) => sub.children(row),
  subRowState: (row) => sub.state(row),
  ensureSubRows: (row) => sub.ensure(row),
  retrySubRows: (row) => sub.retry(row),
  selectMode,
  isRowSelectable,
  rowCheckState,
  toggleRow,
  isHighlighted: (key) => highlighted.value.has(key),
  rowClass: (row, index) => props.rowClass?.(row, index),
  rowClickable: computed(() => props.rowClickable),
  virtual: isVirtual,
  pinStyle: (key) => {
    const offset = pinOffsets.value[key]
    return offset === undefined ? undefined : { '--vg-pin-offset': `${offset}px` }
  },
  onRowClick: (row, _key, event) => emit('row-click', row, event),
  onCellClick: (row, rowKey, column, event) =>
    emit('cell-click', { row, rowKey, column: column.def, value: getCellValue(row, column.def), event }),
  onCellAction: (row, rowKey, column, name, payload) =>
    emit('cell-action', { name, payload, row, rowKey, column: column.def }),
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
  walk(props.rows, (row) => {
    if (canExpand(row)) keys.push(getKey(row))
  })
  expanded.value = keys
}

function collapseAll() {
  expanded.value = []
}

defineExpose<VGridExposed>({ scrollToTop, scrollToRow, expandAll, collapseAll, setColumnState })
</script>

<template>
  <div :class="['vg-root', ui?.root]" :data-density="density ?? config?.density">
    <div v-if="slots.toolbar" class="vg-toolbar">
      <slot name="toolbar" :columns="columns" :column-state="effectiveState" :set-column-state="setColumnState" />
    </div>
    <div class="vg-viewport">
      <div v-if="loading" class="vg-progress" aria-hidden="true" />
      <div
        ref="root"
        :class="['vg', { 'vg-virtual': isVirtual, 'vg-is-dragging': drag.dragging.value }]"
        :role="treeMode ? 'treegrid' : 'grid'"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-busy="loading || undefined"
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
          :has-selectable-rows="selectableKeys.length > 0"
          :dragging="drag.dragging.value"
          :drop-target="drag.target.value"
          :can-reorder="canReorder"
          @sort="onSort"
          @toggle-all="toggleAll"
          @drag-start="drag.onPointerDown"
          @header-click="drag.consumeClick"
        />
        <template v-if="rows.length">
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
            <slot v-if="loading" name="loading">Loading…</slot>
            <slot v-else name="empty">{{ emptyText }}</slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
