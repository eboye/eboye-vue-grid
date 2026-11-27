import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'
import { columnSpan, parseTracks, virtualTrack } from '../src/core/virtualColumns'
import { columnVirtualizationFeature } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { ColumnDef } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

describe('virtualTrack', () => {
  it('keeps definite tracks', () => {
    expect(virtualTrack({ width: '120px' }, '10rem')).toBe('120px')
    expect(virtualTrack({ width: 'minmax(8rem, 2fr)' }, '10rem')).toBe('minmax(8rem, 2fr)')
    expect(virtualTrack({ width: '1fr', minWidth: '6rem' }, '10rem')).toBe('minmax(6rem, 1fr)')
  })
  it('gives content-sized tracks the fallback width', () => {
    expect(virtualTrack({}, '10rem')).toBe('10rem')
    expect(virtualTrack({ width: 'min-content' }, '9rem')).toBe('9rem')
    expect(virtualTrack({ width: 'fit-content(20rem)' }, '9rem')).toBe('9rem')
    expect(virtualTrack({ minWidth: '12rem' }, '10rem')).toBe('max(12rem, 10rem)')
  })
  it('a bare fr keeps stretching from the fallback', () => {
    expect(virtualTrack({ width: '1fr' }, '10rem')).toBe('minmax(10rem, 1fr)')
    expect(virtualTrack({ width: '2.5fr' }, '8rem')).toBe('minmax(8rem, 2.5fr)')
  })
})

describe('parseTracks', () => {
  it('reads used track sizes in px', () => {
    expect(parseTracks('120px 80.5px 1e2px')).toEqual([120, 80.5, 100])
  })
  it('gives up on anything unresolved', () => {
    expect(parseTracks('var(--vg-columns)')).toBeNull()
    expect(parseTracks('120px auto')).toBeNull()
    expect(parseTracks('none')).toBeNull()
    expect(parseTracks('')).toBeNull()
  })
})

describe('columnSpan', () => {
  const sizes = Array.from({ length: 20 }, () => 100)
  it('the columns overlapping the view, plus overscan', () => {
    expect(columnSpan(sizes, 0, 350, 0)).toEqual({ first: 0, last: 3 })
    expect(columnSpan(sizes, 0, 350, 2)).toEqual({ first: 0, last: 5 })
    expect(columnSpan(sizes, 1050, 300, 1)).toEqual({ first: 9, last: 14 })
  })
  it('a column only touching the edge is not in view', () => {
    expect(columnSpan(sizes, 100, 200, 0)).toEqual({ first: 1, last: 2 })
  })
  it('clamps at the end', () => {
    expect(columnSpan(sizes, 1900, 500, 3)).toEqual({ first: 16, last: 19 })
    expect(columnSpan(sizes, 5000, 500, 0)).toEqual({ first: 19, last: 19 })
  })
})

interface Row {
  id: number
  [key: string]: number
}
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#', pinned: 'left' },
  ...Array.from({ length: 30 }, (_, i) => ({ key: `c${i}`, header: `C${i}` })),
]
const rows: Row[] = [{ id: 1 }, { id: 2 }]

const mounted: VueWrapper[] = []
afterEach(() => {
  for (const w of mounted.splice(0)) if (w.exists()) w.unmount()
})

describe('virtual-columns in the grid', () => {
  it('remeasures tracks when a pinned header gets wider in a fixed-width viewport', async () => {
    const observed = new Map<Element, Set<ResizeObserverCallback>>()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(el: Element) {
          if (!observed.has(el)) observed.set(el, new Set())
          observed.get(el)!.add(this.callback)
        }
        disconnect() {}
      },
    )
    let pinnedWidth = 40
    const originalStyle = window.getComputedStyle
    const style = vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const result = originalStyle(el)
      if (el.classList.contains('vg'))
        Object.defineProperty(result, 'gridTemplateColumns', {
          value: [`${pinnedWidth}px`, ...Array(30).fill('80px')].join(' '),
        })
      return result
    })
    const viewport = vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(100)
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        virtualColumns: { overscan: 0 },
        pinnedMaxShare: false,
      },
    })
    try {
      const grid = w.find<HTMLElement>('.vg')
      grid.element.scrollLeft = 130
      await grid.trigger('scroll')
      expect(w.find('.vg-header > [data-col-key="c0"]').exists()).toBe(false)
      const pinned = w.find('.vg-header > [data-col-key="id"]').element
      pinnedWidth = 150
      for (const resized of observed.get(pinned) ?? []) resized([], {} as ResizeObserver)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await flushPromises()
      expect(w.find('.vg-header > [data-col-key="c0"]').exists()).toBe(true)
    } finally {
      w.unmount()
      viewport.mockRestore()
      style.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('without a laid-out grid (jsdom) every column renders, each placed on its track', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', virtualColumns: true } })
    mounted.push(w)
    // first render: a screenful (the first 24 columns), until the layout is read
    expect(w.findAll('.vg-row[data-row-key="1"] > .vg-cell')).toHaveLength(24)
    await flushPromises()
    const cells = w.findAll('.vg-row[data-row-key="1"] > .vg-cell')
    expect(cells).toHaveLength(31)
    expect(cells[5]!.attributes('aria-colindex')).toBe('6')
    expect((cells[5]!.element as HTMLElement).style.gridColumn).toBe('6')
    const header = w.findAll('.vg-header > [role="columnheader"]')
    expect(header[30]!.attributes('aria-colindex')).toBe('31')
    // content-sized columns get the default width; the pinned one keeps its own
    const template = (w.find('.vg').element as HTMLElement).style.getPropertyValue('--vg-columns')
    expect(template.split(' ').slice(0, 3)).toEqual(['auto', '10rem', '10rem'])
  })

  it('off: no placement, no aria-colindex, the template as declared', () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id' } })
    mounted.push(w)
    const cell = w.find('.vg-row[data-row-key="1"] > .vg-cell[data-col-key="c3"]')
    expect(cell.attributes()).not.toHaveProperty('aria-colindex')
    expect((cell.element as HTMLElement).style.gridColumn).toBe('')
    const template = (w.find('.vg').element as HTMLElement).style.getPropertyValue('--vg-columns')
    expect(template.split(' ').slice(0, 2)).toEqual(['auto', 'auto'])
  })

  it('a resized width is kept as it is (auto-fit measures with max-content)', () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        virtualColumns: true,
        columnState: { order: [], hidden: [], widths: { c1: 'max-content', c2: '90px' } },
      },
    })
    mounted.push(w)
    const template = (w.find('.vg').element as HTMLElement).style.getPropertyValue('--vg-columns')
    expect(template.split(' ').slice(1, 4)).toEqual(['10rem', 'max-content', '90px'])
  })

  it('options: the fallback width', () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', virtualColumns: { width: '6rem', overscan: 1 } },
    })
    mounted.push(w)
    const template = (w.find('.vg').element as HTMLElement).style.getPropertyValue('--vg-columns')
    expect(template.split(' ')[1]).toBe('6rem')
  })

  it('without the feature: ignored, with a warning naming it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const saved = config.global.plugins
    config.global.plugins = [createVueGrid({ renderers: allRenderers })]
    try {
      const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', virtualColumns: true } })
      mounted.push(w)
      expect(w.find('.vg-cell').attributes()).not.toHaveProperty('aria-colindex')
      expect(warn.mock.calls.flat().join(' ')).toContain('columnVirtualizationFeature')
      const w2 = mount(VGrid, {
        props: {
          rows,
          columns,
          rowKey: 'id',
          virtualColumns: true,
          features: [columnVirtualizationFeature],
        },
      })
      mounted.push(w2)
      expect(w2.find('.vg-cell').attributes('aria-colindex')).toBe('1')
    } finally {
      config.global.plugins = saved
      warn.mockRestore()
    }
  })
})
