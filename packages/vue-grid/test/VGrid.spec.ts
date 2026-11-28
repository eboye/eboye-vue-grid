import { describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'

// @vue/test-utils cannot infer generic SFC props (T becomes unknown); typed usage is checked in the playground.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any
import VGridColumnMenu from '../src/components/VGridColumnMenu.vue'
import VGridPagination from '../src/components/VGridPagination.vue'
import { defineCellRenderer } from '../src/registry/registry'
import { numberRenderer } from '../src/renderers'
import { createVueGrid } from '../src/registry/plugin'
import type { ColumnDef, ExpanderAttrsContext, VGridExposed } from '../src/types'

interface Row {
  id: number
  name: string
  score: number | null
  owner: { city: string }
  children?: Row[]
}

const rows: Row[] = [
  { id: 1, name: 'Bravo', score: 20, owner: { city: 'Beograd' } },
  { id: 2, name: 'alpha', score: null, owner: { city: 'Niš' } },
  { id: 3, name: 'Charlie', score: 5, owner: { city: 'Novi Sad' } },
]

const columns: ColumnDef<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'score', header: 'Score', renderer: 'number', sortable: true },
  { key: 'city', header: 'City', field: 'owner.city' },
]

const headerTexts = (w: ReturnType<typeof mount>) =>
  w.findAll('[role="columnheader"]').map((c) => c.text())
const bodyTexts = (w: ReturnType<typeof mount>, key: string) =>
  w.findAll(`[role="row"].vg-row > [data-col-key="${key}"]`).map((c) => c.text())

describe('VGrid rendering', () => {
  it('keeps header actions outside sorting and gives them independent keyboard focus', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: { rows, columns, rowKey: 'id' },
      slots: {
        'column-actions-name':
          '<button type="button" disabled>Unavailable</button><button type="button">Name options</button>',
      },
    })
    try {
      const header = w.get('.vg-header [data-col-key="name"]')
      const action = header.get('.vg-header-actions button:not(:disabled)')
      expect(action.element.closest('.vg-sort')).toBeNull()

      const pointerDown = vi.fn()
      const keyDown = vi.fn()
      w.element.addEventListener('pointerdown', pointerDown)
      w.element.addEventListener('keydown', keyDown)
      await action.trigger('pointerdown')
      await action.trigger('keydown', { key: 'ArrowDown' })
      await action.trigger('click')
      expect(pointerDown).not.toHaveBeenCalled()
      expect(keyDown).not.toHaveBeenCalled()
      expect(w.emitted('update:sort')).toBeUndefined()

      await header.trigger('keydown', { key: 'F2' })
      expect(document.activeElement).toBe(action.element)
      await header.trigger('keydown', { key: 'Enter' })
      expect(w.emitted('update:sort')).toEqual([[{ key: 'name', dir: 'asc' }]])
    } finally {
      w.unmount()
    }
  })

  it('renders headers, field paths and renderers', () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id' } })
    expect(headerTexts(w)).toEqual(['Name', 'Score', 'City'])
    expect(bodyTexts(w, 'city')).toEqual(['Beograd', 'Niš', 'Novi Sad'])
    expect(w.find('[data-col-key="score"] .vg-number').exists()).toBe(true)
    expect(w.find('.vg').attributes('style')).toContain('--vg-columns: auto auto auto')
  })

  it('cell and header slots override rendering', () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id' },
      slots: {
        'cell-name': ({ row, value }: { row: Row; value: string }) => h('b', `${value}#${row.id}`),
        'header-city': () => 'Town',
      },
    })
    expect(bodyTexts(w, 'name')[0]).toBe('Bravo#1')
    expect(headerTexts(w)[2]).toBe('Town')
  })

  it('emits sort cycle asc → desc → none and sorts locally in client mode', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', sortMode: 'client' } })
    const sortBtn = () => w.find('[data-col-key="score"] .vg-sort')
    await sortBtn().trigger('click')
    expect(w.emitted('update:sort')?.at(-1)).toEqual([{ key: 'score', dir: 'asc' }])
    expect(bodyTexts(w, 'name')).toEqual(['Charlie', 'Bravo', 'alpha']) // null last
    expect(w.find('[data-col-key="score"]').attributes('aria-sort')).toBe('ascending')
    await sortBtn().trigger('click')
    expect(bodyTexts(w, 'name')).toEqual(['Bravo', 'Charlie', 'alpha'])
    await sortBtn().trigger('click')
    expect(w.emitted('update:sort')?.at(-1)).toEqual([null])
    expect(bodyTexts(w, 'name')).toEqual(['Bravo', 'alpha', 'Charlie'])
  })

  it('controlled sort mode does not reorder rows', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', sort: { key: 'name', dir: 'asc' } },
    })
    expect(bodyTexts(w, 'name')).toEqual(['Bravo', 'alpha', 'Charlie'])
  })

  it('shows empty and loading states', async () => {
    const w = mount(VGrid, { props: { rows: [], columns, rowKey: 'id', emptyText: 'Nothing' } })
    expect(w.find('.vg-empty').text()).toBe('Nothing')
    await w.setProps({ loading: true })
    expect(w.find('.vg-empty').text()).toBe('Loading…')
    expect(w.find('.vg').attributes('aria-busy')).toBe('true')
  })

  it('emits row-click, cell-click for clickable columns, and ignores clicks on interactive content', async () => {
    const cols: ColumnDef<Row>[] = [
      { key: 'name', clickable: true },
      { key: 'score' },
      { key: 'link', value: () => 'https://example.com', renderer: 'link' },
    ]
    const w = mount(VGrid, { props: { rows, columns: cols, rowKey: 'id' } })
    await w.find('[data-row-key="1"] > [data-col-key="score"]').trigger('click')
    expect(w.emitted('row-click')?.[0]?.[0]).toEqual(rows[0])
    await w.find('[data-row-key="1"] > [data-col-key="name"]').trigger('click')
    expect(w.emitted('cell-click')?.[0]?.[0]).toMatchObject({ rowKey: 1, value: 'Bravo' })
    await w.find('[data-row-key="1"] .vg-link').trigger('click')
    expect(w.emitted('row-click')).toHaveLength(1)
    expect(w.emitted('cell-action')?.[0]?.[0]).toMatchObject({ name: 'click', rowKey: 1 })
  })

  it('never mutates the rows or columns props', async () => {
    const frozenRows = Object.freeze(rows.map((r) => Object.freeze({ ...r })))
    const frozenCols = Object.freeze(columns.map((c) => Object.freeze({ ...c })))
    const w = mount(VGrid, {
      props: { rows: frozenRows, columns: frozenCols, rowKey: 'id', sortMode: 'client' },
    })
    await w.find('[data-col-key="name"] .vg-sort').trigger('click')
    expect(frozenRows.map((r) => r.id)).toEqual([1, 2, 3])
  })
})

describe('VGrid renderers registry', () => {
  const Stars = defineComponent({
    props: ['value', 'options', 'row', 'rowKey', 'rowIndex', 'depth', 'column'],
    emits: ['action'],
    setup:
      (p, { emit }) =>
      () =>
        h(
          'button',
          { class: 'stars', onClick: () => emit('action', 'rate', 3) },
          `${p.value}/${p.options.max}`,
        ),
  })
  const stars = defineCellRenderer<{ max: number }>({
    name: 'stars',
    component: Stars,
    defaults: { max: 5 },
  })

  it('resolves plugin and local renderers, merges defaults, re-emits actions', async () => {
    const cols: ColumnDef<Row>[] = [
      { key: 'score', renderer: 'stars', rendererOptions: { max: 10 } },
    ]
    const w = mount(VGrid, {
      props: { rows, columns: cols, rowKey: 'id' },
      global: { plugins: [createVueGrid({ renderers: [stars] })] },
    })
    expect(w.find('[data-row-key="1"] .stars').text()).toBe('20/10')
    await w.find('[data-row-key="1"] .stars').trigger('click')
    expect(w.emitted('cell-action')?.[0]?.[0]).toMatchObject({
      name: 'rate',
      payload: 3,
      rowKey: 1,
    })
    expect(w.emitted('row-click')).toBeUndefined()

    const local = mount(VGrid, { props: { rows, columns: cols, rowKey: 'id', renderers: [stars] } })
    expect(local.find('.stars').exists()).toBe(true)
  })

  it('falls back to text for unknown renderers with a dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = mount(VGrid, {
      props: { rows, columns: [{ key: 'name', renderer: 'nope' }], rowKey: 'id' },
    })
    expect(bodyTexts(w, 'name')[0]).toBe('Bravo')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown renderer "nope"'))
    warn.mockRestore()
  })

  it('renderers are opt-in: only text is built in; definitions work without registration', async () => {
    const saved = config.global.plugins
    config.global.plugins = [] // a bare app: no createVueGrid({ renderers })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const w = mount(VGrid, {
        props: {
          rows,
          rowKey: 'id',
          columns: [
            { key: 'name' }, // text: always available
            {
              key: 'score',
              renderer: numberRenderer,
              rendererOptions: { format: { minimumFractionDigits: 1 } },
            },
            // unregistered name → plain text, the column's options are not handed to text
            {
              key: 'city',
              field: 'owner.city',
              renderer: 'icon',
              rendererOptions: { icon: 'not-a-text-option' },
            },
          ],
        },
      })
      expect(bodyTexts(w, 'name')).toEqual(['Bravo', 'alpha', 'Charlie'])
      expect(bodyTexts(w, 'score')[0]).toBe('20.0') // numberRenderer used straight from the column
      expect(w.find('[data-col-key="score"] .vg-number').exists()).toBe(true)
      expect(bodyTexts(w, 'city')[0]).toBe('Beograd')
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('register it by name'))
      // a locally registered name works too
      const local = mount(VGrid, {
        props: {
          rows,
          rowKey: 'id',
          renderers: [numberRenderer],
          columns: [{ key: 'score', renderer: 'number' }],
        },
      })
      expect(local.find('[data-col-key="score"] .vg-number').exists()).toBe(true)
    } finally {
      config.global.plugins = saved
      warn.mockRestore()
    }
  })

  it('renders components from reactive columns without making them reactive', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Badge = defineComponent({ props: ['value'], setup: (p) => () => h('b', String(p.value)) })
    const Icon = defineComponent({ setup: () => () => h('i', { class: 'test-icon' }) })
    // Columns kept in reactive state (ref, Pinia, Storybook args) proxy everything inside them.
    const state = reactive({
      columns: [
        { key: 'name', renderer: Badge },
        { key: 'score', renderer: 'icon', rendererOptions: { icon: Icon } },
        {
          key: 'city',
          renderer: 'action-button',
          value: () => 'Go',
          rendererOptions: { icon: Icon },
        },
      ] as ColumnDef<Row>[],
    })
    const w = mount(VGrid, { props: { rows, columns: state.columns, rowKey: 'id' } })
    await nextTick()
    expect(w.find('[data-col-key="name"] b').text()).toBe('Bravo')
    expect(w.findAll('.test-icon').length).toBe(rows.length * 2)
    expect(warn.mock.calls.filter(([msg]) => String(msg).includes('reactive object'))).toEqual([])
    warn.mockRestore()
  })
})

describe('VGrid column state', () => {
  it('applies column state, hides columns and persists through storage', async () => {
    localStorage.clear()
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', storage: 'cols' } })
    ;(w.vm as unknown as { setColumnState: (s: unknown) => void }).setColumnState({
      order: ['city', 'name', 'score'],
      hidden: ['score'],
    })
    await nextTick()
    expect(headerTexts(w)).toEqual(['City', 'Name'])
    expect(JSON.parse(localStorage.getItem('cols')!)).toEqual({
      order: ['city', 'name', 'score'],
      hidden: ['score'],
      pinned: {},
    })

    const again = mount(VGrid, { props: { rows, columns, rowKey: 'id', storage: 'cols' } })
    expect(headerTexts(again)).toEqual(['City', 'Name'])
  })

  it('column menu toggles visibility, keeps one column, and resets', async () => {
    const Host = defineComponent({
      data: () => ({ state: undefined as unknown }),
      render() {
        return h('div', [
          h(VGridColumnMenu, {
            columns,
            columnState: this.state as never,
            'onUpdate:columnState': (s: unknown) => (this.state = s),
          }),
          h(VGrid, {
            rows,
            columns,
            rowKey: 'id',
            columnState: this.state as never,
            'onUpdate:columnState': (s: unknown) => (this.state = s),
          }),
        ])
      },
    })
    const w = mount(Host, { attachTo: document.body })
    const boxes = () => w.findAll('.vg-column-option input')
    await boxes()[1]!.setValue(false)
    expect(headerTexts(w)).toEqual(['Name', 'City'])
    await boxes()[0]!.setValue(false)
    expect(headerTexts(w)).toEqual(['City'])
    expect((boxes()[2]!.element as HTMLInputElement).disabled).toBe(true) // last visible
    await w.find('.vg-column-panel .vg-button-ghost').trigger('click')
    expect(headerTexts(w)).toEqual(['Name', 'Score', 'City'])
    w.unmount()
  })

  it('retains fixed pins when controlled or stored state tries to unpin them', () => {
    const fixedColumns = columns.map((column) =>
      column.key === 'city' ? { ...column, pinned: 'left', pinnable: false } : column,
    )
    const stale = { order: ['name', 'score', 'city'], hidden: [], pinned: { city: null } }
    const controlled = mount(VGrid, {
      props: { rows, columns: fixedColumns, rowKey: 'id', columnState: stale },
    })
    const stored = mount(VGrid, {
      props: {
        rows,
        columns: fixedColumns,
        rowKey: 'id',
        storage: { load: () => stale, save: vi.fn() },
      },
    })
    try {
      for (const grid of [controlled, stored]) {
        expect(headerTexts(grid)).toEqual(['City', 'Name', 'Score'])
        expect(grid.get('.vg-header [data-col-key="city"]').classes()).toContain('vg-pin-left')
      }
    } finally {
      controlled.unmount()
      stored.unmount()
    }
  })

  it('names an icon-only column picker and exposes its native open action', () => {
    const w = mount(VGridColumnMenu, {
      props: { columns, label: 'Choose columns', iconOnly: true },
      slots: { icon: '<svg data-custom-icon />' },
    })
    try {
      const trigger = w.get('button')
      expect(trigger.text()).toBe('')
      expect(trigger.attributes('aria-label')).toBe('Choose columns')
      expect(trigger.attributes('title')).toBe('Choose columns')
      expect(trigger.find('[aria-hidden="true"] [data-custom-icon]').exists()).toBe(true)
      const panel = w.get('[role="dialog"]').element
      const showPopover = vi.fn()
      Object.defineProperty(panel, 'showPopover', { value: showPopover })
      vi.spyOn(panel, 'matches').mockReturnValue(false)
      w.vm.open()
      expect(showPopover).toHaveBeenCalledWith({ source: trigger.element })
    } finally {
      w.unmount()
    }
  })

  it('binds picker hooks to the native controls and follows column visibility', async () => {
    const w = mount(VGridColumnMenu, {
      props: {
        columns,
        partAttrs: {
          trigger: { 'data-test': 'picker' },
          panel: { 'data-test': 'panel', 'data-placement': 'wrong' },
          reset: { 'data-test': 'reset' },
          option: ({ columnKey, checked }) => ({
            label: { 'data-test': `label-${columnKey}` },
            checkbox: { 'data-test': `toggle-${columnKey}`, 'data-checked': checked },
          }),
        },
      },
    })
    try {
      expect(w.get('[data-test="picker"]').attributes('aria-haspopup')).toBe('dialog')
      expect(w.get('[data-test="panel"]').attributes('role')).toBe('dialog')
      expect(w.get('[data-test="panel"]').attributes('data-placement')).toBe('bottom-end')
      const checkbox = w.get<HTMLInputElement>(
        'label[data-test="label-name"] input[data-test="toggle-name"]',
      )
      expect(checkbox.attributes('type')).toBe('checkbox')
      await checkbox.setValue(false)
      expect(checkbox.attributes('data-checked')).toBe('false')
      await w.get('button[data-test="reset"]').trigger('click')
      expect(checkbox.attributes('data-checked')).toBe('true')
    } finally {
      w.unmount()
    }
  })
})

const tree: Row[] = [
  {
    id: 1,
    name: 'Parent',
    score: 1,
    owner: { city: 'A' },
    children: [
      {
        id: 11,
        name: 'Child 1',
        score: 2,
        owner: { city: 'B' },
        children: [{ id: 111, name: 'Grandchild', score: 3, owner: { city: 'C' } }],
      },
      { id: 12, name: 'Child 2', score: 4, owner: { city: 'D' } },
    ],
  },
  { id: 2, name: 'Leaf', score: 5, owner: { city: 'E' } },
]

describe('VGrid sub-grids', () => {
  it('exposes filtered, expanded body rows beyond the virtual viewport without details', async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      ...tree[1]!,
      id: i + 1000,
      name: `Other ${i}`,
    }))
    const w = mount(VGrid, {
      props: {
        rows: [...tree, ...many],
        columns,
        rowKey: 'id',
        subRows: (row: Row) => row.children,
        expanded: [1, 11],
        detailExpanded: [1],
        virtual: { rowHeight: 40 },
      },
      slots: { detail: '<p>Details</p>' },
    })
    try {
      const api = w.vm as unknown as VGridExposed<Row>
      const ids = () => api.getVisibleRows().map((row) => row.id)
      expect(w.findAll('.vg-row').length).toBeLessThan(105)
      expect(ids()).toEqual([1, 11, 111, 12, 2, ...many.map((row) => row.id)])

      api.setFilters({ columns: {}, search: 'Grandchild' })
      await nextTick()
      expect(ids()).toEqual([1, 11, 111])
      await w.setProps({ expanded: [] })
      expect(ids()).toEqual([1])
      api.setFilters({ columns: {}, search: 'No matching row' })
      await nextTick()
      expect(ids()).toEqual([])
    } finally {
      w.unmount()
    }
  })

  it('expands sync children into a subgrid, nested to any depth', async () => {
    const w = mount(VGrid, {
      props: { rows: tree, columns, rowKey: 'id', subRows: (r: Row) => r.children },
    })
    expect(w.find('.vg').attributes('role')).toBe('treegrid')
    expect(w.find('[data-row-key="2"] .vg-expander').exists()).toBe(false)
    await w.find('[data-row-key="1"] .vg-expander').trigger('click')
    expect(w.emitted('update:expanded')?.at(-1)).toEqual([[1]])
    const sub = w.find('.vg-subgrid[data-subgrid-for="1"]')
    expect(sub.exists()).toBe(true)
    expect(sub.findAll(':scope > .vg-row').map((r) => r.attributes('data-row-key'))).toEqual([
      '11',
      '12',
    ])
    await w.find('[data-row-key="11"] .vg-expander').trigger('click')
    expect(
      w.find('.vg-subgrid[data-subgrid-for="11"] [data-row-key="111"]').attributes('aria-level'),
    ).toBe('3')
  })

  it('loads async children with loading, error and retry', async () => {
    let fail = true
    const loadSubRows = vi.fn(async (r: Row) => {
      if (fail) throw new Error('boom')
      return r.children ?? []
    })
    const w = mount(VGrid, {
      props: {
        rows: tree,
        columns,
        rowKey: 'id',
        loadSubRows,
        hasSubRows: (r: Row) => !!r.children,
      },
    })
    expect(w.find('[data-row-key="2"] .vg-expander').exists()).toBe(false)
    await w.find('[data-row-key="1"] .vg-expander').trigger('click')
    await nextTick()
    expect(w.find('.vg-status-loading').exists()).toBe(true)
    await flushPromises()
    expect(w.find('.vg-status-error').exists()).toBe(true)
    expect(w.emitted('sub-rows-error')).toHaveLength(1)
    fail = false
    await w.find('.vg-status-error button').trigger('click')
    await flushPromises()
    expect(w.findAll('.vg-subgrid[data-subgrid-for="1"] > .vg-row')).toHaveLength(2)
    expect(loadSubRows).toHaveBeenCalledTimes(2)
  })

  it('renders detail rows from the #detail slot', async () => {
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', rowExpandable: (r: Row) => r.id !== 2 },
      slots: {
        detail: ({ row }: { row: Row }) => h('p', { class: 'detail' }, `Details of ${row.name}`),
      },
    })
    expect(w.find('[data-row-key="2"] .vg-expander').exists()).toBe(false)
    await w.find('[data-row-key="3"] .vg-expander').trigger('click')
    expect(w.find('.vg-detail .detail').text()).toBe('Details of Charlie')
  })

  it.each(['expanded', 'detailExpanded'] as const)(
    'closes a detail from its slot and returns focus to its expander (%s)',
    async (model) => {
      const w = mount(VGrid, {
        attachTo: document.body,
        props: { rows, columns, rowKey: 'id', [model]: [1, 2] },
        slots: {
          detail: ({ close }: { close?: () => void }) =>
            h('button', { type: 'button', onClick: close }, 'Close details'),
        },
      })
      try {
        const close = w.get('[data-detail-for="1"] button')
        const expander = w.get('[data-row-key="1"] .vg-expander')
        ;(close.element as HTMLButtonElement).focus()
        await close.trigger('click')
        expect(w.find('[data-detail-for="1"]').exists()).toBe(false)
        expect(w.find('[data-detail-for="2"]').exists()).toBe(true)
        expect(w.emitted(`update:${model}`)).toEqual([[[2]]])
        expect(document.activeElement).toBe(expander.element)
      } finally {
        w.unmount()
      }
    },
  )

  it.each([false, { rowHeight: 40 }] as const)(
    'opens children without a detail panel on an ineligible parent (virtual: %j)',
    async (virtual) => {
      const w = mount(VGrid, {
        props: {
          rows: tree,
          columns,
          rowKey: 'id',
          subRows: (row: Row) => row.children,
          rowExpandable: (row: Row) => !row.children?.length,
          virtual,
        },
        slots: { detail: ({ row }: { row: Row }) => h('p', `Details of ${row.name}`) },
      })
      try {
        await w.get('[data-row-key="1"] .vg-expander').trigger('click')

        expect(w.find('[data-row-key="11"]').exists()).toBe(true)
        expect(w.find('[data-detail-for="1"]').exists()).toBe(false)
        if (virtual) {
          expect(w.get('.vg').attributes('aria-rowcount')).toBe('5')
          expect(w.get('[data-row-key="11"]').attributes('aria-rowindex')).toBe('3')
        }

        await w.get('[data-row-key="2"] .vg-expander').trigger('click')
        expect(w.get('[data-detail-for="2"]').text()).toBe('Details of Leaf')
        if (virtual) expect(w.get('.vg').attributes('aria-rowcount')).toBe('6')
      } finally {
        w.unmount()
      }
    },
  )

  it.each([false, { rowHeight: 40 }] as const)(
    'opens children and details independently by key (virtual: %j)',
    async (virtual) => {
      const w = mount(VGrid, {
        props: {
          rows: tree,
          columns,
          rowKey: 'id',
          subRows: (row: Row) => row.children,
          expanded: [],
          detailExpanded: [],
          virtual,
          'onUpdate:expanded': (keys: number[]) => void w.setProps({ expanded: keys }),
          'onUpdate:detailExpanded': (keys: number[]) => void w.setProps({ detailExpanded: keys }),
        },
        slots: { detail: ({ row }: { row: Row }) => h('p', `Details of ${row.name}`) },
      })
      const parent = () => w.get('[data-row-key="1"]')
      const treeCell = () => parent().get('[data-col-key="name"]')
      const checkExpansion = (children: boolean, detail: boolean, rowCount: number) => {
        expect(w.find('[data-subgrid-for="1"]').exists()).toBe(children)
        expect(w.find('[data-detail-for="1"]').exists()).toBe(detail)
        expect(parent().attributes('aria-expanded')).toBe(String(children))
        if (virtual) expect(w.get('.vg').attributes('aria-rowcount')).toBe(String(rowCount))
      }
      try {
        checkExpansion(false, false, 3)
        await treeCell().trigger('keydown', { key: 'Enter', shiftKey: true })
        checkExpansion(false, true, 4)
        await treeCell().trigger('keydown', { key: 'ArrowRight' })
        checkExpansion(true, true, 6)
        await parent().get('button[aria-label="Hide row details"]').trigger('click')
        checkExpansion(true, false, 5)
        await treeCell().trigger('keydown', { key: 'ArrowLeft' })
        checkExpansion(false, false, 3)

        await w.setProps({ detailExpanded: [11] })
        expect(w.find('[data-detail-for="11"]').exists()).toBe(false)
        await w.setProps({ expanded: [1], rows: tree.map((row) => ({ ...row })) })
        expect(w.get('[data-detail-for="11"]').text()).toBe('Details of Child 1')
        expect(w.find('[data-detail-for="1"]').exists()).toBe(false)

        const api = w.vm as unknown as VGridExposed
        api.expandAll()
        await nextTick()
        expect(w.emitted('update:expanded')?.at(-1)).toEqual([[1, 11]])
        expect(w.emitted('update:detailExpanded')?.at(-1)).toEqual([[1, 11, 111, 12, 2]])
        api.collapseAll()
        await nextTick()
        checkExpansion(false, false, 3)
      } finally {
        w.unmount()
      }
    },
  )

  it('customizes each virtual row expander and preserves its state, keyboard, and focus', async () => {
    const ignoredHandler = vi.fn()
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows: tree,
        columns,
        rowKey: 'id',
        subRows: (row: Row) => row.children,
        detailExpanded: [],
        virtual: { rowHeight: 40 },
        messages: { showRowDetails: 'Show localized details' },
        treeExpanderAttrs: ({ row, rowKey, expanded }: ExpanderAttrsContext<Row>) => ({
          'aria-label': `${expanded ? 'Hide' : 'Show'} children of ${row.name}`,
          'data-testid': `children-${rowKey}`,
          'aria-expanded': false,
          onClick: ignoredHandler,
        }),
        detailExpanderAttrs: ({ row, rowKey, expanded }: ExpanderAttrsContext<Row>) => ({
          'aria-label':
            rowKey === 1 ? `${expanded ? 'Hide' : 'Show'} details for ${row.name}` : '  ',
          'data-testid': `details-${rowKey}`,
        }),
      },
      slots: {
        detail: ({ close }: { close: () => void }) =>
          h('button', { type: 'button', onClick: close }, 'Close details'),
      },
    })
    try {
      const row = w.get('[data-row-key="1"]')
      const cell = row.get('[data-col-key="name"]')
      const children = row.get('[data-testid="children-1"]')
      const detail = row.get('[data-testid="details-1"]')
      expect(children.attributes('aria-label')).toBe(`Show children of ${tree[0]!.name}`)
      expect(detail.attributes('aria-label')).toBe(`Show details for ${tree[0]!.name}`)
      expect(w.get('[data-testid="details-2"]').attributes('aria-label')).toBe(
        'Show localized details',
      )

      await cell.trigger('keydown', { key: 'ArrowRight' })
      expect(children.attributes('aria-label')).toBe(`Hide children of ${tree[0]!.name}`)
      expect(children.attributes('aria-expanded')).toBe('true')
      expect(detail.attributes('aria-expanded')).toBe('false')
      expect(ignoredHandler).not.toHaveBeenCalled()

      await cell.trigger('keydown', { key: 'Enter', shiftKey: true })
      expect(detail.attributes('aria-label')).toBe(`Hide details for ${tree[0]!.name}`)
      const close = w.get<HTMLButtonElement>('[data-detail-for="1"] button')
      close.element.focus()
      await close.trigger('click')
      expect(document.activeElement).toBe(detail.element)
      expect(detail.attributes('aria-expanded')).toBe('false')
      expect(children.attributes('aria-expanded')).toBe('true')
    } finally {
      w.unmount()
    }
  })

  it('falls back to the first visible data column when an expander column is unavailable', async () => {
    const w = mount(VGrid, {
      props: {
        rows: tree,
        columns,
        rowKey: 'id',
        subRows: (row: Row) => row.children,
        treeColumnKey: 'city',
        detailExpanderColumnKey: 'missing',
        detailExpanded: [],
      },
      slots: { detail: () => h('p', 'Details') },
    })
    const row = w.get('[data-row-key="1"]')
    const cell = (key: string) => row.get(`[data-col-key="${key}"]`)
    try {
      expect(cell('city').find('.vg-tree-gutter .vg-expander').exists()).toBe(true)
      expect(cell('name').find('.vg-detail-expander').exists()).toBe(true)
      await w.setProps({
        columnState: { order: ['score', 'name', 'city'], hidden: ['city'] },
      })
      expect(cell('score').find('.vg-tree-gutter .vg-expander').exists()).toBe(true)
      expect(cell('score').find('.vg-detail-expander').exists()).toBe(true)
    } finally {
      w.unmount()
    }
  })

  it('loads lazy children only when the independent tree control opens', async () => {
    const loadSubRows = vi.fn(async (row: Row) => row.children ?? [])
    const w = mount(VGrid, {
      props: {
        rows: tree,
        columns,
        rowKey: 'id',
        detailExpanded: [1],
        loadSubRows,
        hasSubRows: (row: Row) => !!row.children?.length,
      },
      slots: { detail: '<p>Details</p>' },
    })
    try {
      await flushPromises()
      expect(w.get('[data-detail-for="1"]').text()).toBe('Details')
      expect(loadSubRows).not.toHaveBeenCalled()
      await w.get('[data-row-key="1"] button[aria-label="Expand row"]').trigger('click')
      await flushPromises()
      expect(loadSubRows).toHaveBeenCalledTimes(1)
      expect(w.find('[data-subgrid-for="1"]').exists()).toBe(true)
    } finally {
      w.unmount()
    }
  })

  it('expandAll / collapseAll', async () => {
    const w = mount(VGrid, {
      props: { rows: tree, columns, rowKey: 'id', subRows: (r: Row) => r.children },
    })
    const api = w.vm as unknown as { expandAll(): void; collapseAll(): void }
    api.expandAll()
    await nextTick()
    expect(w.emitted('update:expanded')?.at(-1)).toEqual([[1, 11]])
    api.collapseAll()
    await nextTick()
    expect(w.find('.vg-subgrid').exists()).toBe(false)
  })
})

describe('VGrid selection', () => {
  it('cascades selection to children with a tri-state header', async () => {
    const w = mount(VGrid, {
      props: {
        rows: tree,
        columns,
        rowKey: 'id',
        subRows: (r: Row) => r.children,
        selectable: true,
        expanded: [1, 11],
      },
    })
    const header = () => w.find('.vg-header-select input').element as HTMLInputElement
    const rowBox = (key: number) => w.find(`[data-row-key="${key}"] .vg-checkbox input`)
    await rowBox(1).trigger('change')
    expect(new Set(w.emitted('update:selected')?.at(-1)?.[0] as number[])).toEqual(
      new Set([1, 11, 111, 12]),
    )
    expect(header().indeterminate).toBe(true)
    await rowBox(111).trigger('change')
    expect((rowBox(1).element as HTMLInputElement).indeterminate).toBe(true)
    expect((rowBox(11).element as HTMLInputElement).indeterminate).toBe(true)
    await w.find('.vg-header-select input').trigger('change')
    expect(header().checked).toBe(true)
    expect(header().indeterminate).toBe(false)
    await w.find('.vg-header-select input').trigger('change')
    expect(w.emitted('update:selected')?.at(-1)).toEqual([[]])
  })

  it('single mode selects one row', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', selectable: 'single' } })
    expect(w.find('.vg-header-select input').exists()).toBe(false)
    await w.find('[data-row-key="1"] .vg-checkbox input').trigger('change')
    await w.find('[data-row-key="3"] .vg-checkbox input').trigger('change')
    expect(w.emitted('update:selected')?.at(-1)).toEqual([[3]])
    expect(w.find('[data-row-key="3"]').attributes('aria-selected')).toBe('true')
  })
})

describe('VGrid virtual mode', () => {
  function mockMeasurements() {
    const observers = new Map<Element, ResizeObserverCallback>()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(el: Element) {
          observers.set(el, this.callback)
        }
        unobserve(el: Element) {
          observers.delete(el)
        }
        disconnect() {}
      },
    )
    return (element: Element, height: number) => {
      const size = [{ inlineSize: 100, blockSize: height }]
      observers.get(element)!(
        [
          {
            target: element,
            borderBoxSize: size,
            contentBoxSize: size,
            devicePixelContentBoxSize: size,
            contentRect: new DOMRect(0, 0, 100, height),
          },
        ],
        {} as ResizeObserver,
      )
    }
  }

  const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  it('indexes header, detail, lazy status and empty rows', async () => {
    const w = mount(VGrid, {
      props: {
        rows: [{ id: 1, name: 'Parent' }],
        columns: [{ key: 'name', group: 'Name' }],
        rowKey: 'id',
        virtual: { rowHeight: 40 },
        expanded: [1],
        loadSubRows: () => new Promise(() => {}),
      },
      slots: { detail: '<p>Detail</p>' },
    })
    try {
      await flushPromises()
      expect(w.find('.vg').attributes('aria-rowcount')).toBe('5')
      expect(w.findAll('[role="row"]').map((row) => row.attributes('aria-rowindex'))).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
      ])
      await w.setProps({ rows: [] })
      expect(w.find('.vg').attributes('aria-rowcount')).toBe('3')
      expect(w.find('.vg-empty-row').attributes('aria-rowindex')).toBe('3')
    } finally {
      w.unmount()
    }
  })

  it('renders the first reactive child of a row that is already expanded', async () => {
    type TreeRow = { id: number; name: string; kids?: TreeRow[] }
    const rows = reactive<TreeRow[]>([{ id: 1, name: 'Parent', kids: [] }])
    const w = mount(VGrid, {
      props: {
        rows,
        columns: [{ key: 'name' }],
        rowKey: 'id',
        virtual: { rowHeight: 40 },
        expanded: [1],
        subRows: (row: TreeRow) => row.kids,
      },
    })
    try {
      expect(w.find('.vg').attributes('aria-rowcount')).toBe('2')
      rows[0]!.kids!.push({ id: 2, name: 'Child' })
      await nextTick()
      expect(w.find('[data-row-key="2"]').text()).toBe('Child')
      expect(w.find('.vg').attributes('aria-rowcount')).toBe('3')
    } finally {
      w.unmount()
    }
  })

  it('keeps measured detail heights separate for numeric and string row keys', async () => {
    const measure = mockMeasurements()
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows: [{ id: 1 }, { id: '1' }, { id: 2 }],
        columns: [{ key: 'id' }],
        rowKey: 'id',
        virtual: { rowHeight: 40 },
        expanded: [1, '1'],
      },
      slots: { detail: '<p>Detail</p>' },
    })
    try {
      const details = w.findAll('.vg-detail')
      for (const [i, detail] of details.entries()) measure(detail.element, i ? 180 : 60)
      await frame()
      await nextTick()
      const api = w.vm as unknown as VGridExposed
      api.scrollToRow(2)
      expect(w.find('.vg').element.scrollTop).toBe(320)
    } finally {
      w.unmount()
      vi.unstubAllGlobals()
    }
  })

  it('anchors a virtual height change to an owned row in the unobscured body', async () => {
    const measure = mockMeasurements()
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows: [{ id: 1 }, { id: 2 }],
        columns: [{ key: 'id' }],
        rowKey: 'id',
        expanded: [1],
        virtual: { rowHeight: 40 },
        pinnedTopRows: [{ id: 9 }],
      },
      slots: {
        detail: () => h(VGrid, { rows: [{ id: 2 }], columns: [{ key: 'id' }], rowKey: 'id' }),
      },
    })
    try {
      const outer = w.find<HTMLElement>('.vg')
      const rect = (top: number, bottom: number) => new DOMRect(0, top, 100, bottom - top)
      for (const [selector, top, bottom] of [
        [':scope > .vg-header > .vg-header-cell', 0, 35],
        [':scope > .vg-pinned-top', 35, 100],
        [':scope > [data-row-key="1"] > .vg-cell', 40, 80],
        ['.vg-detail .vg-row > .vg-cell', 110, 130],
      ] as const) {
        const el = outer.find(selector).element
        vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(top, bottom))
      }
      vi.spyOn(outer.element, 'getBoundingClientRect').mockReturnValue(rect(0, 300))
      outer.element.scrollTop = 20
      await outer.trigger('scroll')
      await frame()
      await nextTick()
      const bodyCell = outer.find(':scope > [data-row-key="2"] > .vg-cell').element
      vi.spyOn(bodyCell, 'getBoundingClientRect')
        .mockReturnValueOnce(rect(140, 180))
        .mockReturnValue(rect(170, 210))
      measure(outer.find('.vg-detail').element, 190)
      await frame()
      await nextTick()
      expect(outer.element.scrollTop).toBe(50)
    } finally {
      w.unmount()
      vi.unstubAllGlobals()
    }
  })

  it('keeps outer arrow navigation out of an independent detail grid', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows: [{ id: 1 }, { id: 2 }],
        columns: [{ key: 'id' }],
        rowKey: 'id',
        expanded: [1],
      },
      slots: {
        detail: () => h(VGrid, { rows: [{ id: 3 }], columns: [{ key: 'id' }], rowKey: 'id' }),
      },
    })
    try {
      const detail = w.find<HTMLElement>('.vg-detail')
      detail.element.focus()
      await detail.trigger('keydown', { key: 'ArrowDown' })
      expect(document.activeElement).toBe(w.find('[data-row-key="2"] > [role="gridcell"]').element)
    } finally {
      w.unmount()
    }
  })

  it('enters a radio group at its active tab stop', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: { rows: [{ id: 1 }], columns: [{ key: 'id' }], rowKey: 'id' },
      slots: {
        'cell-id': `<span role="radiogroup">
          <button role="radio" tabindex="-1" aria-checked="false">First</button>
          <button role="radio" tabindex="0" aria-checked="true">Second</button>
        </span>`,
      },
    })
    try {
      await w.find('[data-row-key="1"] > [role="gridcell"]').trigger('keydown', { key: 'Enter' })
      expect(document.activeElement).toBe(w.find('[role="radio"][tabindex="0"]').element)
    } finally {
      w.unmount()
    }
  })

  it('renders a bounded window of rows', () => {
    const many = Array.from({ length: 10_000 }, (_, i) => ({
      id: i,
      name: `Row ${i}`,
      score: i,
      owner: { city: 'X' },
    }))
    const w = mount(VGrid, {
      props: { rows: many, columns, rowKey: 'id', virtual: { rowHeight: 40, overscan: 5 } },
    })
    const rendered = w.findAll('.vg-row')
    expect(rendered.length).toBeLessThan(60)
    expect(rendered[0]!.attributes('aria-rowindex')).toBe('2')
    expect(w.find('.vg').attributes('aria-rowcount')).toBe('10001')
  })

  it('keeps sub-grids in their subgrid container, windowed at every level', () => {
    // 2,000 parents with 50 children each; the first parent is expanded (50 children > one screen)
    const tree = Array.from({ length: 2000 }, (_, p) => ({
      id: `p${p}`,
      name: `Parent ${p}`,
      kids: Array.from({ length: 50 }, (_, c) => ({ id: `p${p}c${c}`, name: `Child ${p}.${c}` })),
    }))
    const w = mount(VGrid, {
      props: {
        rows: tree,
        columns: [{ key: 'name' }],
        rowKey: 'id',
        virtual: { rowHeight: 40, overscan: 2 },
        subRows: (r: { kids?: unknown[] }) => r.kids,
        expanded: ['p0'],
      },
    })
    expect(w.find('.vg').attributes('aria-rowcount')).toBe(String(2000 + 50 + 1))
    const sub = w.find('[data-subgrid-for="p0"]')
    expect(sub.exists()).toBe(true)
    const kids = sub.findAll('.vg-row')
    expect(kids.length).toBeGreaterThan(5)
    expect(kids.length).toBeLessThan(50) // the child level is windowed too…
    expect(sub.findAll(':scope > .vg-spacer').length).toBe(1) // …with a spacer for the rest
    expect(kids[0]!.attributes('aria-rowindex')).toBe('3') // header, p0, then its first child
    expect(w.findAll('.vg > .vg-row').length).toBeLessThan(5) // p1… are below the window
  })

  it('renders detail rows in virtual mode', () => {
    const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Row ${i}` }))
    const w = mount(VGrid, {
      props: {
        rows,
        columns: [{ key: 'name' }],
        rowKey: 'id',
        virtual: { rowHeight: 40 },
        expanded: [1],
      },
      slots: {
        detail: '<template #detail="{ row }"><p class="d">Detail {{ row.id }}</p></template>',
      },
    })
    expect(w.find('[data-detail-for="1"] .d').text()).toBe('Detail 1')
    expect(w.find('.vg').attributes('aria-rowcount')).toBe(String(1000 + 1 + 1))
  })
})

describe('VGrid context menus', () => {
  const menuItems = (w: ReturnType<typeof mount>) => w.findAll('[role="menu"] [role="menuitem"]')

  it('right-click on a cell shows app items and emits context-action', async () => {
    const contextMenu = vi.fn((ctx: { row: Row }) => [
      { name: 'open', label: `Open ${ctx.row.name}` },
      { separator: true as const },
      { name: 'delete', label: 'Delete', tone: 'danger' as const },
    ])
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', contextMenu },
      attachTo: document.body,
    })
    const cell = w.find('[data-row-key="3"] > [data-col-key="city"]')
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 40,
      clientY: 50,
    })
    cell.element.dispatchEvent(event)
    await flushPromises()
    expect(event.defaultPrevented).toBe(true)
    expect(contextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ rowKey: 3, value: 'Novi Sad' }),
    )
    expect(menuItems(w).map((b) => b.text())).toEqual(['Open Charlie', 'Delete'])
    expect(w.find('[role="menu"] [role="separator"]').exists()).toBe(true)
    await menuItems(w)[1]!.trigger('click')
    expect(w.emitted('context-action')?.[0]?.[0]).toMatchObject({
      name: 'delete',
      rowKey: 3,
      column: { key: 'city' },
    })
    w.unmount()
  })

  it('keeps the native menu when no items are returned', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', contextMenu: () => null } })
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
    w.find('[data-row-key="1"] > [data-col-key="name"]').element.dispatchEvent(event)
    await flushPromises()
    expect(event.defaultPrevented).toBe(false)
  })

  it('header menu sorts, pins, moves and hides columns', async () => {
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id' }, attachTo: document.body })
    const openHeader = async (key: string) => {
      w.find(`[role="columnheader"][data-col-key="${key}"]`).element.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 10,
          clientY: 10,
        }),
      )
      await flushPromises()
    }
    const click = async (label: string) => {
      const item = menuItems(w).find((b) => b.text() === label)
      expect(item, label).toBeTruthy()
      await item!.trigger('click')
    }

    await openHeader('score')
    expect(menuItems(w).map((b) => b.text())).toEqual([
      'Sort ascending',
      'Sort descending',
      'Clear sort',
      'Pin left',
      'Pin right',
      'Unpin',
      'Move left',
      'Move right',
      'Fit width',
      'Reset width',
      'Hide column',
      'Reset columns',
    ])
    await click('Sort descending')
    expect(w.emitted('update:sort')?.at(-1)).toEqual([{ key: 'score', dir: 'desc' }])

    await openHeader('city')
    await click('Pin left')
    expect(headerTexts(w)).toEqual(['City', 'Name', 'Score'])
    expect(w.emitted('update:columnState')?.at(-1)?.[0]).toMatchObject({ pinned: { city: 'left' } })

    await openHeader('city')
    expect(
      menuItems(w)
        .find((b) => b.text() === 'Pin left')!
        .attributes('disabled'),
    ).toBeDefined()
    expect(
      menuItems(w)
        .find((b) => b.text() === 'Move right')!
        .attributes('disabled'),
    ).toBeDefined()
    await click('Unpin')

    await openHeader('name')
    await click('Move right')
    expect(headerTexts(w)).toEqual(['City', 'Score', 'Name'])

    await openHeader('score')
    await click('Hide column')
    expect(headerTexts(w)).toEqual(['City', 'Name'])

    await openHeader('name')
    await click('Reset columns')
    expect(headerTexts(w)).toEqual(['Name', 'Score', 'City'])
    w.unmount()
  })

  it('custom header items emit header-action; headerMenu=false disables it', async () => {
    const w = mount(VGrid, {
      props: {
        rows,
        columns,
        rowKey: 'id',
        headerMenu: ({ items }: { items: unknown[] }) => [
          { name: 'copy', label: 'Copy column' },
          { separator: true },
          ...items,
        ],
      },
      attachTo: document.body,
    })
    w.find('[role="columnheader"][data-col-key="name"]').element.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: 5,
        clientY: 5,
      }),
    )
    await flushPromises()
    await menuItems(w)[0]!.trigger('click')
    expect(w.emitted('header-action')?.[0]?.[0]).toMatchObject({
      name: 'copy',
      column: { key: 'name' },
    })
    w.unmount()

    const off = mount(VGrid, { props: { rows, columns, rowKey: 'id', headerMenu: false } })
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 })
    off.find('[role="columnheader"][data-col-key="name"]').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('VGridPagination', () => {
  it('renders pages and updates the model', async () => {
    const w = mount(VGridPagination, { props: { total: 250, page: 5, pageSize: 25 } })
    expect(w.findAll('.vg-page:not(.vg-page-nav)').map((b) => b.text())).toEqual([
      '1',
      '4',
      '5',
      '6',
      '10',
    ])
    expect(w.find('[aria-current="page"]').text()).toBe('5')
    expect(w.find('.vg-pagination-summary').text()).toBe('101–125 of 250')
    await w.find('[aria-label="Next page"]').trigger('click')
    expect(w.emitted('update:page')?.[0]).toEqual([6])
  })
})
