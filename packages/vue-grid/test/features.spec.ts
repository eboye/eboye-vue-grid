import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { createVueGrid } from '../src/registry/plugin'
import {
  allFeatures,
  columnGroupsFeature,
  columnPinningFeature,
  columnReorderFeature,
  columnResizingFeature,
  columnVisibilityFeature,
  filteringFeature,
  keyboardNavigationFeature,
  menusFeature,
  paginationFeature,
  selectionFeature,
  serverDataFeature,
  sortingFeature,
  subGridsFeature,
  virtualScrollingFeature,
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
const names = (w: ReturnType<typeof mount>) =>
  w.findAll('.vg-row [data-col-key="name"]').map((c) => c.text())

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
      props: {
        rows,
        columns,
        rowKey: 'id',
        sortMode: 'client',
        filterRow: true,
        pagination: true,
        pageSize: 2,
      },
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
    expect(warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain(
      'needs the serverData feature',
    )
  })

  it('menus: none without the feature (the browser menu stays); with it, no sort / filter items unless those are on', async () => {
    const bare = mount(VGrid, { props: { rows, columns, rowKey: 'id' }, attachTo: document.body })
    expect(bare.find('.vg-menu').exists()).toBe(false)
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    bare.find('.vg-header [data-col-key="name"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    bare.unmount()

    const plain = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', features: [menusFeature] },
      attachTo: document.body,
    })
    await plain.find('.vg-header [data-col-key="name"]').trigger('contextmenu')
    await flushPromises()
    const labels = () =>
      [...document.querySelectorAll('.vg-menu [role="menuitem"]')].map((e) => e.textContent?.trim())
    expect(labels()).toContain('Reset columns') // the menu did open
    expect(labels()).not.toContain('Sort ascending')
    expect(labels()).not.toContain('Filter…')
    plain.unmount()
  })

  it('selection and sub-grids: off without their features, on with them', async () => {
    interface Node extends Row {
      kids?: Node[]
    }
    const tree: Node[] = [{ id: 10, name: 'Group', score: 0, kids: [rows[0]!, rows[1]!] }]
    const props = {
      rows: tree,
      columns,
      rowKey: 'id',
      selectable: true,
      subRows: (r: Node) => r.kids,
      expanded: [10],
    }

    const bare = mount(VGrid, { props })
    expect(bare.find('.vg-cell-select').exists()).toBe(false)
    expect(bare.find('.vg-subgrid').exists()).toBe(false)
    expect(bare.find('.vg-expander').exists()).toBe(false)
    expect(bare.find('[role="treegrid"]').exists()).toBe(false)
    const hints = warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')
    expect(hints).toContain('needs the selection feature')
    expect(hints).toContain('needs the subGrids feature')

    const full = mount(VGrid, {
      props: { ...props, features: [selectionFeature, subGridsFeature, keyboardNavigationFeature] },
    })
    expect(full.find('[role="treegrid"]').exists()).toBe(true)
    expect(full.findAll('.vg-subgrid .vg-row')).toHaveLength(2)
    await full.find('.vg-header [type="checkbox"]').setValue(true)
    expect(
      ((full.emitted('update:selected') as number[][][]).at(-1)![0]! as number[]).sort(),
    ).toEqual([1, 10, 2])
  })

  it('column reorder and pinning: off without their features (pins ignored, no drag / move items)', async () => {
    const cols = [{ key: 'name', pinned: 'left' as const }, { key: 'score' }]
    const headerKeys = (w: ReturnType<typeof mount>) =>
      w.findAll('.vg-header > [data-col-key]').map((h) => h.attributes('data-col-key'))
    const labels = () =>
      [...document.querySelectorAll('.vg-menu [role="menuitem"]')].map((e) => e.textContent?.trim())

    const bare = mount(VGrid, {
      props: { rows, columns: cols, rowKey: 'id', features: [menusFeature] },
      attachTo: document.body,
    })
    expect(bare.find('.vg-pin-left').exists()).toBe(false)
    expect(bare.find('.vg-reorderable').exists()).toBe(false)
    await bare
      .find('.vg-header [data-col-key="name"]')
      .trigger('keydown', { key: 'ArrowRight', altKey: true })
    expect(headerKeys(bare)).toEqual(['name', 'score'])
    await bare.find('.vg-header [data-col-key="name"]').trigger('contextmenu')
    await flushPromises()
    expect(labels()).toContain('Reset columns')
    expect(labels()).not.toContain('Pin left')
    expect(labels()).not.toContain('Move right')
    expect(warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain(
      'needs the columnPinning feature',
    )
    bare.unmount()

    const full = mount(VGrid, {
      props: {
        rows,
        columns: cols,
        rowKey: 'id',
        features: [menusFeature, columnReorderFeature, columnPinningFeature],
      },
      attachTo: document.body,
    })
    expect(full.find('.vg-header .vg-pin-left[data-col-key="name"]').exists()).toBe(true)
    expect(full.find('.vg-header [data-col-key="score"]').classes()).toContain('vg-reorderable')
    await full.find('.vg-header [data-col-key="score"]').trigger('contextmenu')
    await flushPromises()
    expect(labels()).toEqual(
      expect.arrayContaining(['Pin left', 'Pin right', 'Move left', 'Move right']),
    )
    full.unmount()
  })

  it('keyboard navigation: an ARIA table with tabbable controls without it; a roving-focus grid with it', async () => {
    const props = { rows, columns, rowKey: 'id', selectable: true }
    const bare = mount(VGrid, {
      props: { ...props, features: [selectionFeature, sortingFeature] },
      attachTo: document.body,
    })
    expect(bare.find('.vg').attributes('role')).toBe('table')
    expect(bare.find('.vg-row [data-col-key="name"]').attributes('role')).toBe('cell')
    expect(bare.find('.vg-row [data-col-key="name"]').attributes('tabindex')).toBeUndefined()
    expect(bare.find('.vg-header .vg-sort').attributes('tabindex')).toBeUndefined() // in the Tab order
    expect(bare.find('.vg-row input[type="checkbox"]').attributes('tabindex')).toBeUndefined()
    expect(bare.find('.vg').attributes('aria-multiselectable')).toBeUndefined()
    expect(bare.find('.vg-row').attributes('aria-selected')).toBeUndefined()
    // arrow keys do nothing
    ;(bare.find('.vg').element as HTMLElement).focus()
    await bare.find('.vg').trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(bare.find('.vg').element)
    bare.unmount()

    const nav = mount(VGrid, {
      props: { ...props, features: [selectionFeature, sortingFeature, keyboardNavigationFeature] },
      attachTo: document.body,
    })
    expect(nav.find('.vg').attributes('role')).toBe('grid')
    expect(nav.find('.vg-row [data-col-key="name"]').attributes('role')).toBe('gridcell')
    expect(nav.find('.vg-header .vg-sort').attributes('tabindex')).toBe('-1')
    expect(nav.find('.vg-row input[type="checkbox"]').attributes('tabindex')).toBe('-1')
    ;(nav.find('.vg').element as HTMLElement).focus()
    expect((document.activeElement as HTMLElement).getAttribute('role')).toBe('columnheader') // focus moves into the grid
    nav.unmount()
  })

  it('column resizing: no handles and stored widths ignored without it; resize, persist and reset with it', async () => {
    const cols = [
      { key: 'name', width: '10rem' },
      { key: 'score', resizable: false },
    ]
    const template = (w: ReturnType<typeof mount>) =>
      (w.find('.vg').element as HTMLElement).style.getPropertyValue('--vg-columns')
    const stored = { order: ['name', 'score'], hidden: [], widths: { name: '300px' } }

    const bare = mount(VGrid, { props: { rows, columns: cols, rowKey: 'id', columnState: stored } })
    expect(bare.find('.vg-resize-handle').exists()).toBe(false)
    expect(template(bare)).toBe('10rem auto') // the stored width is ignored

    const w = mount(VGrid, {
      props: {
        rows,
        columns: cols,
        rowKey: 'id',
        columnState: stored,
        features: [columnResizingFeature, menusFeature],
      },
      attachTo: document.body,
    })
    expect(template(w)).toBe('300px auto')
    expect(w.findAll('.vg-resize-handle')).toHaveLength(1) // `resizable: false` opts out
    expect(w.find('.vg-header [data-col-key="name"]').classes()).toContain('vg-col-sized')

    // keyboard on the focused handle: jsdom has no layout (width 0), so it clamps to the 40px minimum
    await w.find('.vg-resize-handle').trigger('keydown', { key: 'ArrowRight' })
    const states = w.emitted('update:columnState') as { widths?: Record<string, string> }[][]
    expect(states.at(-1)![0]!.widths).toEqual({ name: '40px' })

    // header menu: Reset width drops the override
    await w.setProps({ columnState: states.at(-1)![0] })
    await w.find('.vg-header [data-col-key="name"]').trigger('contextmenu')
    await flushPromises()
    const reset = [...document.querySelectorAll<HTMLElement>('.vg-menu [role="menuitem"]')].find(
      (e) => e.textContent?.trim() === 'Reset width',
    )!
    expect(reset.hasAttribute('disabled')).toBe(false)
    reset.click()
    await flushPromises()
    expect(
      (w.emitted('update:columnState') as { widths?: unknown }[][]).at(-1)![0]!.widths,
    ).toBeUndefined()
    w.unmount()
  })

  it('column groups: a flat header without it; spanning group cells with it, split at pins, hidden columns drop out', async () => {
    const cols = [
      { key: 'id', pinned: 'left' as const, group: 'Bet' },
      { key: 'name', group: 'Bet' },
      { key: 'score', group: 'Odds' },
      { key: 'extra', group: 'Odds', value: () => 1 },
      { key: 'plain' as const, value: () => 'x' },
    ]
    const groups = (w: ReturnType<typeof mount>) =>
      w
        .findAll('.vg-group-cell')
        .map((c) => [c.text(), c.attributes('style')?.match(/grid-column: ([^;]+)/)?.[1]])

    const bare = mount(VGrid, { props: { rows, columns: cols, rowKey: 'id' } })
    expect(bare.find('.vg-header-groups').exists()).toBe(false)
    expect(warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain(
      'needs the columnGroups feature',
    )

    const w = mount(VGrid, {
      props: {
        rows,
        columns: cols,
        rowKey: 'id',
        features: [columnGroupsFeature, columnPinningFeature, columnVisibilityFeature],
      },
    })
    expect(w.find('.vg').classes()).toContain('vg-has-groups')
    // "Bet" is split by the pin boundary; "Odds" spans two columns; "plain" gets an empty cell
    expect(groups(w)).toEqual([
      ['Bet', '1 / span 1'],
      ['Bet', '2 / span 1'],
      ['Odds', '3 / span 2'],
      ['', '5 / span 1'],
    ])
    expect(w.find('.vg-group-cell.vg-pin-left').text()).toBe('Bet')
    expect(w.findAll('.vg-group-cell')[2]!.attributes('aria-colspan')).toBe('2')

    await w.setProps({ columnState: { order: cols.map((c) => c.key), hidden: ['score', 'extra'] } })
    expect(groups(w).map(([label]) => label)).toEqual(['Bet', 'Bet', '']) // "Odds" is gone
  })

  it('renders nested header groups with stable keys, correct spans and virtual row indices', async () => {
    const inventory = { key: 'inventory', label: 'Inventory' }
    const shipping = { key: 'shipping', label: 'Shipping' }
    const monthly = { key: 'monthly', label: 'Monthly' }
    const cols = [
      { key: 'id', pinned: 'left', groupPath: [inventory, monthly] },
      { key: 'name', groupPath: [inventory, monthly] },
      { key: 'score', groupPath: [shipping, monthly] },
      { key: 'extra', group: 'Notes' },
    ]
    const w = mount(VGrid, {
      props: {
        rows,
        columns: cols,
        rowKey: 'id',
        virtual: { rowHeight: 40 },
        features: [
          columnGroupsFeature,
          columnPinningFeature,
          columnVisibilityFeature,
          virtualScrollingFeature,
        ],
      },
      slots: {
        'column-group': ({ group }: { group: { label: string } }) => `Group ${group.label}`,
      },
    })
    try {
      const groups = () =>
        w
          .findAll('.vg-header-groups')
          .map((row) =>
            row.findAll('.vg-group-cell').map((cell) => cell.attributes('data-group-key')),
          )
      expect(groups()).toEqual([
        ['inventory', 'inventory', 'shipping', 'Notes'],
        ['monthly', 'monthly', 'monthly', undefined],
      ])
      expect(w.findAll('.vg-header-groups').map((row) => row.attributes('aria-rowindex'))).toEqual([
        '1',
        '2',
      ])
      expect(w.get('.vg').attributes('aria-rowcount')).toBe('6')
      expect(w.get('.vg-header').attributes('aria-rowindex')).toBe('3')
      expect(w.get('.vg-row').attributes('aria-rowindex')).toBe('4')
      expect(w.get('[data-group-key="shipping"]').text()).toBe('Group Shipping')

      await w.setProps({
        columnState: { order: ['extra', 'score', 'name', 'id'], hidden: ['id', 'name', 'score'] },
      })
      expect(groups()).toEqual([['Notes']])
      expect(w.get('.vg-row').attributes('aria-rowindex')).toBe('3')
      expect(w.get('.vg').attributes('aria-rowcount')).toBe('5')
    } finally {
      w.unmount()
    }
  })

  it('column visibility: hidden columns show without the feature; hide works with it', async () => {
    const cols = [{ key: 'name' }, { key: 'score', hidden: true }]
    const headerKeys = (w: ReturnType<typeof mount>) =>
      w.findAll('.vg-header > [data-col-key]').map((h) => h.attributes('data-col-key'))
    const labels = () =>
      [...document.querySelectorAll('.vg-menu [role="menuitem"]')].map((e) => e.textContent?.trim())

    const bare = mount(VGrid, {
      props: { rows, columns: cols, rowKey: 'id', features: [menusFeature] },
      attachTo: document.body,
    })
    expect(headerKeys(bare)).toEqual(['name', 'score'])
    await bare.find('.vg-header [data-col-key="name"]').trigger('contextmenu')
    await flushPromises()
    expect(labels()).toContain('Reset columns')
    expect(labels()).not.toContain('Hide column')
    expect(warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain(
      'needs the columnVisibility feature',
    )
    // a stored hidden list is ignored too
    await bare.setProps({ columnState: { order: ['name', 'score'], hidden: ['name'] } })
    expect(headerKeys(bare)).toEqual(['name', 'score'])
    bare.unmount()

    const full = mount(VGrid, {
      props: {
        rows,
        columns: [{ key: 'name' }, { key: 'score' }, { key: 'id' }],
        rowKey: 'id',
        features: [menusFeature, columnVisibilityFeature],
      },
      attachTo: document.body,
    })
    await full.find('.vg-header [data-col-key="score"]').trigger('contextmenu')
    await flushPromises()
    const hide = [...document.querySelectorAll<HTMLElement>('.vg-menu [role="menuitem"]')].find(
      (e) => e.textContent?.trim() === 'Hide column',
    )!
    hide.click()
    await flushPromises()
    expect(headerKeys(full)).toEqual(['name', 'id'])
    full.unmount()
  })

  it('virtual scrolling: every row renders without the feature; only a window with it', async () => {
    const many = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      name: `Row ${i + 1}`,
      score: i,
    }))
    const props = { rows: many, columns, rowKey: 'id', virtual: { rowHeight: 40 } }
    const bare = mount(VGrid, { props })
    expect(bare.findAll('.vg-row')).toHaveLength(500)
    expect(bare.find('.vg-spacer').exists()).toBe(false)
    expect(bare.find('.vg').classes()).not.toContain('vg-virtual')
    expect(warn.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain(
      'needs the virtualScrolling feature',
    )

    const virtual = mount(VGrid, { props: { ...props, features: [virtualScrollingFeature] } })
    expect(virtual.find('.vg').classes()).toContain('vg-virtual')
    expect(virtual.findAll('.vg-row').length).toBeLessThan(60)
    expect(virtual.find('.vg').attributes('aria-rowcount')).toBe('501')
  })

  it('per grid: only the listed features are on', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', sortMode: 'client', features: [sortingFeature] },
    })
    expect(w.findAll('.vg-sort')).toHaveLength(2)
    expect(w.find('.vg-filter-button').exists()).toBe(false)
    await w.find('[data-col-key="name"] .vg-sort').trigger('click')
    expect(names(w)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('app-wide via createVueGrid, merged with the grid’s own', async () => {
    const dataSource = vi.fn(async () => ({ rows: rows.slice(0, 2), total: 3 }))
    const w = mount(VGrid, {
      props: {
        dataSource,
        columns,
        rowKey: 'id',
        pagination: true,
        pageSize: 2,
        features: [paginationFeature],
      },
      global: { plugins: [createVueGrid({ features: [serverDataFeature, filteringFeature] })] },
    })
    await flushPromises()
    await vi.dynamicImportSettled()
    await flushPromises()
    expect(dataSource).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 2 }),
      expect.anything(),
    )
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
