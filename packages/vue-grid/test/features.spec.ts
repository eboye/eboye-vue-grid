import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { createVueGrid } from '../src/registry/plugin'
import {
  allFeatures,
  columnPinningFeature,
  columnReorderFeature,
  filteringFeature,
  menusFeature,
  paginationFeature,
  selectionFeature,
  serverDataFeature,
  sortingFeature,
  subGridsFeature,
} from '../src/features'
import { resolveFeatures } from '../src/internal/features'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  score: number
}
const rows: Row[] = [
  { id: 1, name: 'Bravo', score: 20 },
  { id: 2, name: 'Alpha', score: 10 },
  { id: 3, name: 'Charlie', score: 30 },
]
const columns = [
  { key: 'name', sortable: true, filterable: true },
  { key: 'score', sortable: true, filterable: true },
]
const names = (w: ReturnType<typeof mount>) => w.findAll('.vg-row [data-col-key="name"]').map((c) => c.text())

// These specs need a bare app: test/setup.ts registers every feature globally.
let saved: typeof config.global.plugins
let warn: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  saved = config.global.plugins
  config.global.plugins = []
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  config.global.plugins = saved
  warn.mockRestore()
})

describe('features are opt-in', () => {
  it('without features: no sort buttons, funnels, filter row, data source or pager — and a dev hint', async () => {
    const dataSource = vi.fn(async () => ({ rows }))
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', sortMode: 'client', filterRow: true, pagination: true, pageSize: 2 },
    })
    await flushPromises()
    expect(w.find('.vg-sort').exists()).toBe(false)
    expect(w.find('[data-col-key="name"]').attributes('aria-sort')).toBeUndefined()
    expect(w.find('.vg-filter-button').exists()).toBe(false)
    expect(w.find('.vg-filter-input').exists()).toBe(false)
    expect(w.find('.vg-grid-pagination').exists()).toBe(false)
    expect(names(w)).toEqual(['Bravo', 'Alpha', 'Charlie']) // all rows, unsorted, unpaged

    const api = w.vm as unknown as VGridExposed
    api.setFilters({ columns: { name: { type: 'text', op: 'contains', value: 'a' } } })
    await nextTick()
    expect(names(w)).toHaveLength(3)

    const hints = warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')
    expect(hints).toContain('needs the sorting feature')
    expect(hints).toContain('needs the filtering feature')
    expect(hints).toContain('needs the pagination feature')

    const server = mount(VGrid, { props: { dataSource, columns, rowKey: 'id' } })
    await flushPromises()
    expect(dataSource).not.toHaveBeenCalled()
    expect(server.find('.vg-row').exists()).toBe(false)
    expect(warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain('needs the serverData feature')
  })

  it('menus: none without the feature (the browser menu stays); with it, no sort / filter items unless those are on', async () => {
    const bare = mount(VGrid, { props: { rows, columns, rowKey: 'id' }, attachTo: document.body })
    expect(bare.find('.vg-menu').exists()).toBe(false)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    bare.find('.vg-header [data-col-key="name"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    bare.unmount()

    const plain = mount(VGrid, { props: { rows, columns, rowKey: 'id', features: [menusFeature] }, attachTo: document.body })
    await plain.find('.vg-header [data-col-key="name"]').trigger('contextmenu')
    await flushPromises()
    const labels = () => [...document.querySelectorAll('.vg-menu [role="menuitem"]')].map((e) => e.textContent?.trim())
    expect(labels()).toContain('Hide column') // the menu did open
    expect(labels()).not.toContain('Sort ascending')
    expect(labels()).not.toContain('Filter…')
    plain.unmount()
  })

  it('selection and sub-grids: off without their features, on with them', async () => {
    interface Node extends Row {
      kids?: Node[]
    }
    const tree: Node[] = [{ id: 10, name: 'Group', score: 0, kids: [rows[0]!, rows[1]!] }]
    const props = { rows: tree, columns, rowKey: 'id', selectable: true, subRows: (r: Node) => r.kids, expanded: [10] }

    const bare = mount(VGrid, { props })
    expect(bare.find('.vg-cell-select').exists()).toBe(false)
    expect(bare.find('.vg-subgrid').exists()).toBe(false)
    expect(bare.find('.vg-expander').exists()).toBe(false)
    expect(bare.find('[role="treegrid"]').exists()).toBe(false)
    const hints = warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')
    expect(hints).toContain('needs the selection feature')
    expect(hints).toContain('needs the subGrids feature')

    const full = mount(VGrid, { props: { ...props, features: [selectionFeature, subGridsFeature] } })
    expect(full.find('[role="treegrid"]').exists()).toBe(true)
    expect(full.findAll('.vg-subgrid .vg-row')).toHaveLength(2)
    await full.find('.vg-header [type="checkbox"]').setValue(true)
    expect(((full.emitted('update:selected') as number[][][]).at(-1)![0]! as number[]).sort()).toEqual([1, 10, 2])
  })

  it('column reorder and pinning: off without their features (pins ignored, no drag / move items)', async () => {
    const cols = [{ key: 'name', pinned: 'left' as const }, { key: 'score' }]
    const headerKeys = (w: ReturnType<typeof mount>) => w.findAll('.vg-header > [data-col-key]').map((h) => h.attributes('data-col-key'))
    const labels = () => [...document.querySelectorAll('.vg-menu [role="menuitem"]')].map((e) => e.textContent?.trim())

    const bare = mount(VGrid, { props: { rows, columns: cols, rowKey: 'id', features: [menusFeature] }, attachTo: document.body })
    expect(bare.find('.vg-pin-left').exists()).toBe(false)
    expect(bare.find('.vg-reorderable').exists()).toBe(false)
    await bare.find('.vg-header [data-col-key="name"]').trigger('keydown', { key: 'ArrowRight', altKey: true })
    expect(headerKeys(bare)).toEqual(['name', 'score'])
    await bare.find('.vg-header [data-col-key="name"]').trigger('contextmenu')
    await flushPromises()
    expect(labels()).toContain('Hide column')
    expect(labels()).not.toContain('Pin left')
    expect(labels()).not.toContain('Move right')
    expect(warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain('needs the columnPinning feature')
    bare.unmount()

    const full = mount(VGrid, {
      props: { rows, columns: cols, rowKey: 'id', features: [menusFeature, columnReorderFeature, columnPinningFeature] },
      attachTo: document.body,
    })
    expect(full.find('.vg-header .vg-pin-left[data-col-key="name"]').exists()).toBe(true)
    expect(full.find('.vg-header [data-col-key="score"]').classes()).toContain('vg-reorderable')
    await full.find('.vg-header [data-col-key="score"]').trigger('contextmenu')
    await flushPromises()
    expect(labels()).toEqual(expect.arrayContaining(['Pin left', 'Pin right', 'Move left', 'Move right']))
    full.unmount()
  })

  it('per grid: only the listed features are on', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', sortMode: 'client', features: [sortingFeature] } })
    expect(w.findAll('.vg-sort')).toHaveLength(2)
    expect(w.find('.vg-filter-button').exists()).toBe(false)
    await w.find('[data-col-key="name"] .vg-sort').trigger('click')
    expect(names(w)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('app-wide via createVueGrid, merged with the grid’s own', async () => {
    const dataSource = vi.fn(async () => ({ rows: rows.slice(0, 2), total: 3 }))
    const w = mount(VGrid, {
      props: { dataSource, columns, rowKey: 'id', pagination: true, pageSize: 2, features: [paginationFeature] },
      global: { plugins: [createVueGrid({ features: [serverDataFeature, filteringFeature] })] },
    })
    await flushPromises()
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(dataSource).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 2 }), expect.anything())
    expect(w.findAll('.vg-filter-button')).toHaveLength(2)
    expect(w.find('.vg-grid-pagination').exists()).toBe(true)
    expect(w.find('.vg-sort').exists()).toBe(false) // sorting not registered
  })

  it('resolveFeatures merges lists by name, later wins', () => {
    const custom = { ...sortingFeature }
    expect(resolveFeatures(allFeatures, [custom]).sorting).toBe(custom)
    expect(Object.keys(resolveFeatures(undefined, []))).toEqual([])
  })
})
