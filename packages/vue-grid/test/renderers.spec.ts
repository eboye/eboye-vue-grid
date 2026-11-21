import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'

// @vue/test-utils cannot infer generic SFC props (T becomes unknown); typed usage is checked in the playground.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any
import TextCell from '../src/renderers/TextCell.vue'
import { formatCurrency, formatDate, formatSigned, safeHref, stringifyJson } from '../src/renderers/format'
import type { ColumnDef } from '../src/types'

const base = { row: {}, rowKey: 1, rowIndex: 0, depth: 0, column: { key: 'x' } }
const ctx = { locale: 'en-US', currency: 'USD', timeZone: 'UTC' }

describe('TextCell', () => {
  it('renders value, placeholder and does not leak renderer props as attributes', () => {
    const w = mount(TextCell, { props: { ...base, value: 'hello', options: {} } })
    expect(w.text()).toBe('hello')
    expect(w.attributes('row')).toBeUndefined()
    const empty = mount(TextCell, { props: { ...base, value: null, options: { placeholder: '—' } } })
    expect(empty.text()).toBe('—')
  })
})

describe('formatters', () => {
  it('formats currency, signed numbers and dates with the context', () => {
    expect(formatCurrency(1234.5, ctx)).toBe('$1,234.50')
    expect(formatCurrency(10, ctx, 'EUR')).toBe('€10.00')
    expect(formatCurrency('abc', ctx)).toBe('')
    expect(formatSigned(5, ctx)).toBe('+5')
    expect(formatSigned(-5, ctx)).toBe('-5')
    expect(formatSigned(0, ctx)).toBe('0')
    expect(formatDate('2024-03-05T10:00:00Z', ctx, { year: 'numeric', month: '2-digit', day: '2-digit' })).toBe(
      '03/05/2024',
    )
    expect(formatDate('not a date', ctx)).toBe('')
  })

  it('only allows safe link schemes', () => {
    expect(safeHref('https://x.dev')).toBe('https://x.dev')
    expect(safeHref('/relative')).toBe('/relative')
    expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c')
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref(' JavaScript:alert(1)')).toBeUndefined()
    expect(safeHref('data:text/html,<b>')).toBeUndefined()
  })

  it('pretty prints JSON strings and objects', () => {
    expect(stringifyJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(stringifyJson({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}')
    expect(stringifyJson('not json')).toBe('"not json"')
  })
})

describe('built-in renderers inside the grid', () => {
  const evil = '<img src=x onerror="window.__pwned=1">'
  const rows = [
    {
      id: 1,
      amount: 42,
      delta: -3,
      when: '2024-03-05T10:30:15.123Z',
      ok: true,
      status: 'Won',
      url: 'javascript:alert(1)',
      payload: { note: evil, list: [1, 2] },
      text: evil,
    },
  ]
  const Star = defineComponent({ render: () => h('svg', { class: 'star' }) })
  const columns: ColumnDef[] = [
    { key: 'amount', renderer: 'currency', rendererOptions: { currency: 'EUR' } },
    { key: 'signed', field: 'delta', renderer: 'signed-number' },
    { key: 'delta', renderer: 'change' },
    { key: 'when', renderer: 'datetime', rendererOptions: { milliseconds: true } },
    { key: 'ok', renderer: 'boolean' },
    { key: 'status', renderer: 'status', rendererOptions: { tone: { Won: 'success' } } },
    { key: 'url', renderer: 'link', rendererOptions: { href: (v: string) => v } },
    { key: 'payload', renderer: 'json-tree', rendererOptions: { collapseAt: 3 } },
    { key: 'json', field: 'payload', renderer: 'json' },
    { key: 'text' },
    { key: 'icon', renderer: 'icon', rendererOptions: { icon: Star, label: 'Starred' } },
    { key: 'menu', renderer: 'actions-menu', rendererOptions: { actions: [{ name: 'del', label: 'Delete' }] } },
    { key: 'btn', renderer: 'action-button', rendererOptions: { label: 'Open', action: 'open' } },
  ]
  const w = mount(VGrid, {
    props: { rows, columns, rowKey: 'id', locale: 'en-US', currency: 'USD', timeZone: 'UTC' },
  })
  const cell = (key: string) => w.find(`[data-row-key="1"] > [data-col-key="${key}"]`)

  it('formats values', () => {
    expect(cell('amount').text()).toBe('€42.00')
    expect(cell('amount').classes()).toContain('vg-align-end')
    expect(cell('signed').text()).toBe('-3')
    expect(cell('delta').find('.vg-change-down').exists()).toBe(true)
    expect(cell('when').text()).toContain('03/05/2024')
    expect(cell('when').text()).toContain('10:30:15.123')
    expect(cell('ok').text()).toBe('Yes')
    expect(cell('status').find('.vg-tone-success').text()).toBe('Won')
    expect(cell('icon').find('[role="img"]').attributes('aria-label')).toBe('Starred')
    expect(cell('menu').find('[role="menuitem"]').text()).toBe('Delete')
  })

  it('never renders values as HTML and drops unsafe hrefs', () => {
    expect(document.querySelector('img[src="x"]')).toBeNull()
    expect(cell('text').text()).toBe(evil)
    expect(cell('payload').text()).toContain(JSON.stringify(evil))
    expect(cell('json').find('pre').text()).toContain('onerror')
    expect(cell('json').find('pre img').exists()).toBe(false)
    expect(cell('url').find('a').exists()).toBe(false)
  })

  it('emits renderer actions', async () => {
    await cell('btn').find('button').trigger('click')
    expect(w.emitted('cell-action')?.at(-1)?.[0]).toMatchObject({ name: 'open', rowKey: 1 })
    await cell('menu').find('[role="menuitem"]').trigger('click')
    expect(w.emitted('cell-action')?.at(-1)?.[0]).toMatchObject({ name: 'del' })
  })
})
