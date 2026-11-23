import {
  computed,
  onBeforeUnmount,
  ref,
  shallowReactive,
  shallowRef,
  toRaw,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import { buildLayout, locateRow, visibleSpan, type LevelLayout } from '../core/virtual'
import type { RowKey, VirtualOptions } from '../types'
import type { SubRowEntry } from './useSubRows'

/** Plain-value readers over the sub-row cache, for a pass over many rows (see `useSubRows`). */
export interface SubRowsSnapshot<T> {
  children(row: T): T[] | undefined
  mayHaveChildren(row: T): boolean
  state(row: T): SubRowEntry | undefined
}

export interface VirtualRowsOptions<T> {
  root: Ref<HTMLElement | undefined>
  options: () => VirtualOptions | false | undefined
  /** Top-level rows, filtered and sorted. */
  rows: () => readonly T[]
  /** The row key reader (its reactive inputs read once per layout pass). */
  keyOf: () => (row: T) => RowKey
  expanded: () => ReadonlySet<RowKey>
  /** Tree mode: a factory for a snapshot of the sub-row cache; null without sub-grids. */
  subRows: () => ((keyOf: (row: T) => RowKey) => SubRowsSnapshot<T>) | null
  hasDetail: () => boolean
  rowExpandable: () => ((row: T) => boolean) | undefined
  /** Filters and sorts a child level (its reactive inputs read once per layout pass). */
  preparer: () => (rows: readonly T[]) => readonly T[]
}

/** The rows area in view (plus overscan), in px from the first row. */
export interface VirtualRange {
  top: number
  bottom: number
}

/** One level of rows in virtual mode (top level, or the children of an expanded row). */
export interface VirtualLevel {
  /** Blocks of the level in view; the same object while they don't change. */
  span: ComputedRef<{ start: number; end: number } | null>
  /** Heights of the spacers before and after them. */
  pads: ComputedRef<{ top: number; bottom: number } | null>
  /** Positioning of block `at` (row key `key`) and of its children. */
  info(
    at: number,
    key: RowKey,
  ): { ariaIndex: number; childLayout?: LevelLayout; childOffset: number; childAriaBase: number }
}

/** What the rows component needs in virtual mode (part of the grid context). */
export interface VirtualRowsContext {
  level(
    layout: () => LevelLayout | undefined,
    offset: () => number,
    ariaBase: () => number,
  ): VirtualLevel
  /** A scroll is in progress: lazy sub-rows wait until it settles. */
  scrolling: Readonly<Ref<boolean>>
  /** Function refs measuring a detail row / sub-grid status row / sub-grid container. */
  measureDetail(key: RowKey): (el: unknown) => void
  measureStatus(key: RowKey): (el: unknown) => void
  measureSubgrid(el: unknown): void
}

/** How long after the last scroll event a scroll counts as finished where `scrollend` is missing. */
const SCROLL_IDLE_MS = 150
/** Quiet time after `scrollend` before a scroll counts as settled (fast flicks end between steps). */
const SETTLE_MS = 120

/**
 * Virtual scrolling: lays out the visible tree (rows, detail rows, sub-grids), tracks the scroll
 * position and viewport (the range to render), measures rows whose height isn't fixed, and tells
 * when a scroll has settled. Each level of rows then renders only what's in view, between spacers,
 * inside the same CSS grid / subgrid structure as without virtual scrolling.
 */
export function useVirtualRows<T>(opts: VirtualRowsOptions<T>) {
  const scrollTop = ref(0)
  const viewportHeight = ref(0)
  let scrollFrame = 0
  let resizeObserver: ResizeObserver | undefined

  // A scroll in progress: lazy sub-rows wait until it settles, so flying past expanded rows doesn't
  // request their children. Settled = `SETTLE_MS` after `scrollend` with no new scrolling (a fast
  // flick fires `scrollend` between wheel steps); without `scrollend`, `SCROLL_IDLE_MS` of quiet.
  const scrolling = ref(false)
  let idleTimer = 0
  const hasScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window
  const settle = (ms: number) => {
    window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => (scrolling.value = false), ms)
  }
  const onScrollEnd = () => settle(SETTLE_MS)

  function onScroll() {
    if (!opts.options()) return
    const el = opts.root.value
    scrolling.value = true
    // With `scrollend`, the long timer is only a safety net (loading never stays paused).
    settle(hasScrollEnd ? SCROLL_IDLE_MS * 4 : SCROLL_IDLE_MS)
    cancelAnimationFrame(scrollFrame)
    scrollFrame = requestAnimationFrame(() => (scrollTop.value = el?.scrollTop ?? 0))
  }

  watch(
    [opts.root, () => !!opts.options()],
    ([el, on], _, onCleanup) => {
      resizeObserver?.disconnect()
      if (!el || !on) return
      if (hasScrollEnd) {
        el.addEventListener('scrollend', onScrollEnd)
        onCleanup(() => el.removeEventListener('scrollend', onScrollEnd))
      }
      if (typeof ResizeObserver === 'undefined') return
      resizeObserver = new ResizeObserver(() => (viewportHeight.value = el.clientHeight))
      resizeObserver.observe(el)
      viewportHeight.value = el.clientHeight
    },
    { immediate: true },
  )

  // ── Measured heights ──────────────────────────────────────────────────────────────────────
  /** Rendered heights by id (`d:<key>` detail rows, `s:<key>` status rows). */
  const heights = shallowReactive(new Map<string, number>())
  /** Border + padding of sub-grid containers, above and below their rows. */
  const subgridChrome = shallowRef({ top: 0, bottom: 0 })
  const ids = new WeakMap<Element, string>()
  let measurer: ResizeObserver | undefined
  // New heights apply on the next frame: applying them inside the observer callback would re-render
  // rows (resizing observed elements again) within the same frame — a "ResizeObserver loop" error.
  const pending = new Map<string, number>()
  let measureFrame = 0
  function flushHeights() {
    measureFrame = 0
    for (const [key, h] of pending)
      if (Math.abs((heights.get(key) ?? -1) - h) > 0.5) heights.set(key, h)
    pending.clear()
  }

  /** Measures `el` under `id` whenever its size changes. */
  function measure(id: string, el: unknown) {
    if (!(el instanceof Element) || typeof ResizeObserver === 'undefined') return
    if (ids.get(el) === id) return
    ids.set(el, id)
    measurer ??= new ResizeObserver((entries) => {
      for (const entry of entries) {
        // A removed element reports 0: keep its last height (still the best estimate).
        if (!entry.target.isConnected) {
          measurer?.unobserve(entry.target)
          continue
        }
        const key = ids.get(entry.target)
        if (key)
          pending.set(
            key,
            entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height,
          )
      }
      if (pending.size && !measureFrame) measureFrame = requestAnimationFrame(flushHeights)
    })
    measurer.observe(el)
  }

  /**
   * Reads a sub-grid container's border and padding — once: it's the same for every container, and
   * `getComputedStyle` on each one that mounts would force a style recalculation each time.
   */
  let subgridMeasured = false
  function measureSubgrid(el: unknown) {
    if (!(el instanceof Element) || subgridMeasured) return
    subgridMeasured = true
    const cs = getComputedStyle(el)
    const top = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.paddingTop) || 0)
    const bottom = (parseFloat(cs.borderBottomWidth) || 0) + (parseFloat(cs.paddingBottom) || 0)
    const prev = subgridChrome.value
    if (prev.top !== top || prev.bottom !== bottom) subgridChrome.value = { top, bottom }
  }

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    measurer?.disconnect()
    cancelAnimationFrame(measureFrame)
    cancelAnimationFrame(scrollFrame)
    window.clearTimeout(idleTimer)
  })

  // ── Layout ────────────────────────────────────────────────────────────────────────────────
  /**
   * Heights and positions of every visible row, detail row and sub-grid. Every reactive input is
   * read once here and the pass runs on plain values: reading props, computeds and caches per row
   * would track tens of thousands of dependencies on a big expanded tree (seconds of work).
   */
  const layout = computed<LevelLayout<T> | null>(() => {
    const v = opts.options()
    if (!v) return null
    const key = opts.keyOf()
    const rawKey = (row: T) => key(toRaw(row))
    const expandedKeys = opts.expanded()
    const tree = opts.subRows()?.(key) ?? null
    const detail = opts.hasDetail()
    const rowExpandable = opts.rowExpandable()
    void heights.size // any new or changed height re-runs the layout
    const measured = toRaw(heights)
    const detailEstimate = v.detailHeight ?? v.rowHeight * 4
    const expandable = (row: T) =>
      !!tree?.mayHaveChildren(row) || (detail && (rowExpandable ? rowExpandable(row) : true))
    return buildLayout<T>({
      rows: opts.rows(),
      getKey: key,
      rowHeight: v.rowHeight,
      prepare: opts.preparer(),
      isExpanded: (row) => expandedKeys.has(rawKey(row)) && expandable(row),
      detailHeight: (_row, k) => (detail ? (measured.get(`d:${String(k)}`) ?? detailEstimate) : 0),
      subRows: (row) => {
        if (!tree) return undefined
        const state = tree.state(row)
        const kids = tree.children(row)
        if (!state && !kids?.length) return undefined
        if (state?.status === 'loading' || state?.status === 'error')
          return { status: state.status }
        return { children: kids ?? [] }
      },
      statusHeight: (k) => measured.get(`s:${String(k)}`) ?? v.rowHeight,
      subgridChrome: subgridChrome.value,
    })
  })

  const range = computed<VirtualRange | null>(() => {
    const v = opts.options()
    if (!v) return null
    const pad = (v.overscan ?? 6) * v.rowHeight
    // Before the first measurement, render one screen's worth rather than nothing.
    const height = viewportHeight.value || 800
    return { top: scrollTop.value - pad, bottom: scrollTop.value + height + pad }
  })

  // ── Holding the view steady ───────────────────────────────────────────────────────────────
  // Rows above the view can change height on their own: a detail row renders at its real height
  // where the layout had an estimate, children finish loading. The rows in view must not move.
  // Browser scroll anchoring can't be relied on here (Firefox doesn't anchor in this grid at all,
  // Chromium only partly), so virtual grids turn it off (`overflow-anchor: none`) and do it
  // themselves: around every re-render of a grid with variable-height rows, note the first row in
  // view, and correct the drift left after the DOM updates. Changes the user makes (rows, sort,
  // filter, expanding) are left alone, and flat grids (fixed-height rows only) skip all of it.
  let anchor: { key: string; offset: number } | null = null
  let lastRows: unknown
  let lastExpanded: unknown
  const variableHeights = () => opts.hasDetail() || opts.subRows() !== null
  function firstRowInView(el: HTMLElement): { key: string; offset: number } | null {
    const header =
      el.querySelector(':scope > .vg-header')?.lastElementChild ??
      el.querySelector('.vg-header-cell')
    const top = header ? header.getBoundingClientRect().bottom : el.getBoundingClientRect().top
    for (const row of el.querySelectorAll<HTMLElement>('.vg-row[data-row-key]')) {
      const cell = row.firstElementChild?.getBoundingClientRect()
      if (cell && cell.bottom > top + 1) return { key: row.dataset.rowKey!, offset: cell.top - top }
    }
    return null
  }
  // `range` moves with the scroll (new rows render), `layout` with heights and loaded children.
  const renderInputs = () => [layout.value, range.value] as const
  watch(
    renderInputs,
    () => {
      const rows = opts.rows()
      const expanded = opts.expanded()
      const userChange = rows !== lastRows || expanded !== lastExpanded
      lastRows = rows
      lastExpanded = expanded
      const el = opts.root.value
      anchor =
        !userChange && el && el.scrollTop > 0 && variableHeights() ? firstRowInView(el) : null
    },
    { flush: 'pre' },
  )
  watch(
    renderInputs,
    () => {
      const el = opts.root.value
      if (!anchor || !el) return
      const now = firstRowInView(el)
      const held = anchor
      anchor = null
      if (!now) return
      // the same row, if it is still the first one in view; otherwise find it
      let offset = now.key === held.key ? now.offset : null
      if (offset === null) {
        const row = el.querySelector<HTMLElement>(`.vg-row[data-row-key="${CSS.escape(held.key)}"]`)
        const header =
          el.querySelector(':scope > .vg-header')?.lastElementChild ??
          el.querySelector('.vg-header-cell')
        if (!row || !header) return
        offset =
          row.firstElementChild!.getBoundingClientRect().top - header.getBoundingClientRect().bottom
      }
      // whole pixels: sub-pixel offsets would otherwise nudge the scroll back and forth
      const drift = Math.round(offset - held.offset)
      if (drift) el.scrollTop += drift
    },
    { flush: 'post' },
  )

  /** Scrolls a row (top-level or nested) to just under the header; false when not in virtual mode. */
  function scrollToKey(key: RowKey): boolean {
    const l = layout.value
    const v = opts.options()
    if (!l || !v) return false
    const at = locateRow(l, key, opts.keyOf(), v.rowHeight, subgridChrome.value.top)
    if (at && opts.root.value) opts.root.value.scrollTop = at.top
    return true
  }

  const context: VirtualRowsContext = {
    level(levelLayout, offset, ariaBase) {
      const span = computed<{ start: number; end: number } | null>((prev) => {
        const l = levelLayout()
        const r = range.value
        if (!l || !r) return null
        const next = visibleSpan(l, r.top - offset(), r.bottom - offset())
        return prev && prev.start === next.start && prev.end === next.end ? prev : next
      })
      const pads = computed(() => {
        const l = levelLayout()
        const s = span.value
        return l && s ? { top: l.tops[s.start]!, bottom: l.height - l.tops[s.end]! } : null
      })
      return {
        span,
        pads,
        info(at, key) {
          const l = levelLayout()!
          const detail = l.detail[at]!
          const sub = l.sub.get(key)
          const rowHeight = opts.options() ? (opts.options() as VirtualOptions).rowHeight : 0
          return {
            ariaIndex: ariaBase() + l.rowsBefore[at]!,
            childLayout: sub?.kind === 'rows' ? sub.layout : undefined,
            childOffset: offset() + l.tops[at]! + rowHeight + detail + subgridChrome.value.top,
            childAriaBase: ariaBase() + l.rowsBefore[at]! + 1 + (detail > 0 ? 1 : 0),
          }
        },
      }
    },
    scrolling,
    measureDetail: (key) => (el) => measure(`d:${String(key)}`, el),
    measureStatus: (key) => (el) => measure(`s:${String(key)}`, el),
    measureSubgrid,
  }

  return { layout, onScroll, scrollToKey, context }
}
