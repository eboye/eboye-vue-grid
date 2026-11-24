import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import VGridPagination from '../src/components/VGridPagination.vue'
import VGridSearch from '../src/components/VGridSearch.vue'
import type { DataSource } from '../src/composables/useDataSource'
import { allFeatures } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { GridMessages, GridParts } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  city: string
  stake: number
  meta?: object
}
const rows: Row[] = [
  { id: 1, name: 'Ana', city: 'Niš', stake: 10, meta: { a: 1 } },
  { id: 2, name: 'Marko', city: 'Beograd', stake: 20 },
  { id: 3, name: 'Jelena', city: 'Niš', stake: 30 },
]
const columns = [
  { key: 'name', header: 'Player', sortable: true, filterable: true },
  { key: 'city', header: 'City', filterable: true, groupable: true },
  { key: 'stake', header: 'Stake', renderer: 'number', aggregate: 'sum' },
]
/** A grid in an app with these app-wide messages / parts. */
const app = (config: { messages?: GridMessages; parts?: GridParts } = {}) => ({
  global: {
    plugins: [createVueGrid({ renderers: allRenderers, features: allFeatures, ...config })],
  },
})
const menuItems = (w: ReturnType<typeof mount>) =>
  w.findAll('[role="menu"] [role="menuitem"]').map((b) => b.text())
async function openHeaderMenu(w: ReturnType<typeof mount>, key: string) {
  w.find(`[role="columnheader"][data-col-key="${key}"]`).element.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
  )
  await flushPromises()
}

describe('messages', () => {
  it('app-wide messages translate the built-in text; a grid’s own win', async () => {
    const w = mount(VGrid, {
      ...app({
        messages: { empty: 'Nema podataka.', sortAscending: 'Rastuće', total: 'Ukupno' },
      }),
      props: { rows: [], columns, rowKey: 'id', messages: { empty: 'Prazno.' } },
    })
    await flushPromises()
    expect(w.find('.vg-empty').text()).toBe('Prazno.') // the grid's own
    await w.setProps({ rows, totals: true })
    await flushPromises()
    expect(w.find('.vg-pinned-rows').text()).toContain('Ukupno') // app-wide
  })

  it('the header menu, with functions for text that takes a value', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows,
        columns: columns.map((c) => ({ ...c, sortable: true })),
        rowKey: 'id',
        messages: {
          sortAscending: 'A → Ž',
          hideColumn: 'Sakrij kolonu',
          groupBy: (column: string) => `Grupiši po: ${column}`,
        },
      },
    })
    await openHeaderMenu(w, 'city')
    const items = menuItems(w)
    expect(items).toContain('A → Ž')
    expect(items).toContain('Sakrij kolonu')
    expect(items).toContain('Grupiši po: City')
    expect(items).toContain('Sort descending') // not set: English
    w.unmount()
  })

  it('props that name a text still win over messages', async () => {
    const w = mount(VGrid, {
      props: {
        rows: [],
        columns,
        rowKey: 'id',
        emptyText: 'From the prop',
        messages: { empty: 'x' },
      },
    })
    await flushPromises()
    expect(w.find('.vg-empty').text()).toBe('From the prop')
  })

  it('filters, pager, status bar and renderers', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns: [...columns, { key: 'meta', header: 'Meta', renderer: 'json' }],
        rowKey: 'id',
        filterRow: true,
        pagination: { pageSizes: [10, 25] },
        statusBar: true,
        messages: {
          filterPlaceholder: 'Filtriraj…',
          filterColumn: (c: string) => `Filter za ${c}`,
          rowsPerPage: 'Redova po strani',
          pageSize: (n: number) => `${n} po strani`,
          pageSummary: (from: string, to: string, total: string) => `${from}-${to} od ${total}`,
          nextPage: 'Sledeća',
          rowCount: (shown: string) => `${shown} redova`,
          view: 'Prikaži',
        },
      },
    })
    await vi.waitFor(() => expect(w.find('.vg-pagination').exists()).toBe(true))
    await vi.waitFor(() => expect(w.find('.vg-status-bar').text()).not.toBe(''))
    const input = w.find('.vg-filter-input input')
    expect(input.attributes('placeholder')).toBe('Filtriraj…')
    expect(input.attributes('aria-label')).toBe('Filter za Player')
    expect(w.find('.vg-filter-button').attributes('aria-label')).toBe('Filter za Player')
    expect(w.find('.vg-pagination .vg-sr-only').text()).toBe('Redova po strani')
    expect(w.find('.vg-pagination option').text()).toBe('10 po strani')
    expect(w.find('.vg-pagination').text()).toContain('1-3 od 3')
    expect(w.find('[aria-label="Sledeća"]').exists()).toBe(true)
    expect(w.find('.vg-status-bar').text()).toBe('3 redova')
    expect(w.find('[data-col-key="meta"] button').text()).toBe('Prikaži')
  })

  it('components on their own use the app’s messages', async () => {
    const pager = mount(VGridPagination, {
      ...app({ messages: { firstPage: 'Prva', pagination: 'Strane' } }),
      props: { total: 100 },
    })
    expect(pager.find('nav').attributes('aria-label')).toBe('Strane')
    expect(pager.find('[aria-label="Prva"]').exists()).toBe(true)
    const search = mount(VGridSearch, {
      ...app({ messages: { searchPlaceholder: 'Traži…' } }),
      props: { modelValue: '' },
    })
    expect(search.find('input').attributes('placeholder')).toBe('Traži…')
    // a prop still wins
    const own = mount(VGridSearch, {
      ...app({ messages: { searchPlaceholder: 'Traži…' } }),
      props: { modelValue: '', placeholder: 'Mine' },
    })
    expect(own.find('input').attributes('placeholder')).toBe('Mine')
  })
})

describe('parts', () => {
  const failing = (): DataSource<Row> => {
    // The first request (no sort) works; a sorted one fails.
    return async (q) => {
      if (q.sort) throw new Error('boom')
      return { rows, total: 3 }
    }
  }

  it('all on by default; app-wide parts off; a grid turns one back on', async () => {
    const w = mount(VGrid, {
      ...app({ parts: { filterButtons: false, resizeGrips: false, selectAll: false } }),
      props: { rows, columns, rowKey: 'id', selectable: true, parts: { selectAll: true } },
    })
    await flushPromises()
    expect(w.find('.vg-filter-button').exists()).toBe(false)
    expect(w.find('.vg-resize-handle').exists()).toBe(false)
    expect(w.find('.vg-header input[type="checkbox"]').exists()).toBe(true) // the grid's own wins
    const plain = mount(VGrid, { props: { rows, columns, rowKey: 'id', selectable: true } })
    await flushPromises()
    expect(plain.find('.vg-filter-button').exists()).toBe(true)
    expect(plain.find('.vg-resize-handle').exists()).toBe(true)
  })

  it('load error: no notice, no Retry; or your own through #load-error', async () => {
    const w = mount(VGrid, {
      props: {
        dataSource: failing(),
        columns,
        rowKey: 'id',
        parts: { loadErrorNotice: false },
      },
    })
    await flushPromises()
    await w.setProps({ sort: { key: 'name', dir: 'asc' } })
    await flushPromises()
    expect(w.emitted('load-error')).toHaveLength(1)
    expect(w.find('.vg-load-error-banner').exists()).toBe(false)

    const retry = vi.fn()
    const custom = mount(VGrid, {
      props: { dataSource: failing(), columns, rowKey: 'id' },
      slots: {
        'load-error': (s: { stale: boolean; retry: () => void }) =>
          h('p', { class: 'mine' }, [
            `stale: ${s.stale}`,
            h('button', { onClick: () => (retry(), s.retry()) }, 'again'),
          ]),
      },
    })
    await flushPromises()
    await custom.setProps({ sort: { key: 'name', dir: 'asc' } })
    await flushPromises()
    expect(custom.find('.mine').text()).toContain('stale: true')
    await custom.find('.mine button').trigger('click')
    expect(retry).toHaveBeenCalled()

    const noRetry = mount(VGrid, {
      props: { dataSource: failing(), columns, rowKey: 'id', parts: { retry: false } },
    })
    await flushPromises()
    await noRetry.setProps({ sort: { key: 'name', dir: 'asc' } })
    await flushPromises()
    expect(noRetry.find('.vg-load-error-banner').exists()).toBe(true)
    expect(noRetry.find('.vg-load-error-banner button').exists()).toBe(false)
  })

  it('no-match: without the Clear filters button, or your own through #no-match', async () => {
    const filters = {
      columns: { city: { type: 'text', op: 'equals', value: 'Zagreb' } },
      search: '',
    }
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', filters, parts: { clearFiltersButton: false } },
    })
    await flushPromises()
    expect(w.find('.vg-no-match').text()).toBe('No rows match the current filters.')
    expect(w.find('.vg-no-match button').exists()).toBe(false)
    const custom = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', filters },
      slots: { 'no-match': (s: { filterCount: number }) => `nothing (${s.filterCount})` },
    })
    await flushPromises()
    expect(custom.find('.vg-empty').text()).toBe('nothing (1)')
  })

  it('progress bar, group counts and Ctrl+C can be turned off', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows,
        columns,
        rowKey: 'id',
        loading: true,
        groupBy: ['city'],
        selectable: true,
        selected: [1],
        parts: { progressBar: false, groupCounts: false, copyShortcut: false },
      },
    })
    await flushPromises()
    expect(w.find('.vg-progress').exists()).toBe(false)
    expect(w.find('.vg-rowgroup-count').exists()).toBe(false)
    const event = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    w.find('.vg').element.dispatchEvent(event)
    await flushPromises()
    expect(event.defaultPrevented).toBe(false)
    expect(w.emitted('copy')).toBeUndefined()
    w.unmount()
  })

  it('select-all banner: off, or your own through #select-all-banner', async () => {
    const source: DataSource<Row> = async (q) => ({
      rows: rows.slice(0, q.pageSize ?? 3),
      total: 240,
    })
    const props = {
      dataSource: source,
      columns,
      rowKey: 'id',
      selectable: true,
      pagination: true,
      pageSize: 2,
      selected: [1, 2],
    }
    const off = mount(VGrid, { props: { ...props, parts: { selectAllBanner: false } } })
    await flushPromises()
    expect(off.find('.vg-selection-banner').exists()).toBe(false)
    const custom = mount(VGrid, {
      props,
      slots: {
        'select-all-banner': (s: { total: number; selectAll: () => void }) =>
          h('button', { class: 'mine', onClick: s.selectAll }, `all ${s.total}`),
      },
    })
    await flushPromises()
    expect(custom.find('.mine').text()).toBe('all 240')
    await custom.find('.mine').trigger('click')
    expect(custom.emitted('update:selectAllMatching')?.at(-1)).toEqual([true])
  })

  it('pager options: no first / last buttons, no summary', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        pagination: { firstLast: false, summary: '' },
        pageSize: 1,
      },
    })
    await vi.waitFor(() => expect(w.find('.vg-pagination').exists()).toBe(true))
    expect(w.find('.vg-page-first').exists()).toBe(false)
    expect(w.find('.vg-page-last').exists()).toBe(false)
    expect(w.find('.vg-pagination').text()).not.toContain('of')
  })

  it('status bar items can be left out', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        selectable: true,
        selected: [1],
        filters: { columns: { city: { type: 'text', op: 'equals', value: 'Niš' } }, search: '' },
        statusBar: { rows: false, clear: false },
      },
    })
    await vi.waitFor(() => expect(w.find('.vg-status-bar').text()).not.toBe(''))
    const text = w.find('.vg-status-bar').text()
    expect(text).not.toContain('rows')
    expect(text).toContain('1 selected')
    expect(text).toContain('1 filter')
    expect(w.find('.vg-status-bar button').exists()).toBe(false)
  })
})
