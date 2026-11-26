import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, type Component } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import ActionButtonCell from '../src/renderers/ActionButtonCell.vue'
import BooleanCell from '../src/renderers/BooleanCell.vue'
import ButtonGroupCell from '../src/renderers/ButtonGroupCell.vue'
import ChangeCell from '../src/renderers/ChangeCell.vue'
import CheckboxCell from '../src/renderers/CheckboxCell.vue'
import ChipCell from '../src/renderers/ChipCell.vue'
import CodeCell from '../src/renderers/CodeCell.vue'
import CopyCell from '../src/renderers/CopyCell.vue'
import CurrencyCell from '../src/renderers/CurrencyCell.vue'
import DetailsCell from '../src/renderers/DetailsCell.vue'
import EditCell from '../src/renderers/EditCell.vue'
import IconToggleCell from '../src/renderers/IconToggleCell.vue'
import ImageCell from '../src/renderers/ImageCell.vue'
import JsonTreeCell from '../src/renderers/JsonTreeCell.vue'
import LinkCell from '../src/renderers/LinkCell.vue'
import ListCell from '../src/renderers/ListCell.vue'
import MultiLineCell from '../src/renderers/MultiLineCell.vue'
import NumberCell from '../src/renderers/NumberCell.vue'
import RadioCell from '../src/renderers/RadioCell.vue'
import StatusCell from '../src/renderers/StatusCell.vue'
import SwitchCell from '../src/renderers/SwitchCell.vue'
import TextCell from '../src/renderers/TextCell.vue'
import { readableTextColor, resolveImageSrc, tokenizeJson } from '../src/renderers/format'

// @vue/test-utils cannot infer generic SFC props (T becomes unknown).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

const row = { id: 7, name: 'Ana', currency: 'EUR' }
const base = { row, rowKey: 7, rowIndex: 0, depth: 0, column: { key: 'x', header: 'Col' } }
const cell = (
  component: Component,
  value: unknown,
  options: Record<string, unknown> = {},
  extra = {},
) => mount(component, { props: { ...base, value, options }, ...extra })
const actions = (w: ReturnType<typeof mount>) => (w.emitted('action') ?? []) as unknown[][]

const Icon = defineComponent({ setup: () => () => h('svg', { class: 'test-icon' }) })

function mockClipboard(ok = true) {
  const writeText = vi.fn(() => (ok ? Promise.resolve() : Promise.reject(new Error('denied'))))
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('helpers', () => {
  it('picks a readable text colour for raw colours', () => {
    expect(readableTextColor('#ffffff')).toBe('#000')
    expect(readableTextColor('#fff')).toBe('#000')
    expect(readableTextColor('#1e3a8a')).toBe('#fff')
    expect(readableTextColor('rgb(250, 204, 21)')).toBe('#000')
    expect(readableTextColor('rebeccapurple')).toBe('#fff')
  })

  it('resolves image sources safely with a base URL', () => {
    expect(resolveImageSrc('img/a.png', 'https://cdn.x/')).toBe('https://cdn.x/img/a.png')
    expect(resolveImageSrc('/img/a.png', 'https://cdn.x')).toBe('https://cdn.x/img/a.png')
    expect(resolveImageSrc('https://o.x/a.png', 'https://cdn.x')).toBe('https://o.x/a.png')
    expect(resolveImageSrc('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA')
    expect(resolveImageSrc('javascript:alert(1)')).toBeUndefined()
    expect(resolveImageSrc('data:text/html,<b>')).toBeUndefined()
    expect(resolveImageSrc('')).toBeUndefined()
  })

  it('tokenizes pretty JSON', () => {
    const tokens = tokenizeJson('{\n  "a": "x:1",\n  "b": -2.5,\n  "c": true,\n  "d": null\n}')
    const typed = tokens.filter((t) => t.type !== 'punct').map((t) => `${t.type}:${t.text}`)
    expect(typed).toEqual([
      'key:"a"',
      'string:"x:1"',
      'key:"b"',
      'number:-2.5',
      'key:"c"',
      'boolean:true',
      'key:"d"',
      'null:null',
    ])
    expect(tokens.map((t) => t.text).join('')).toBe(
      '{\n  "a": "x:1",\n  "b": -2.5,\n  "c": true,\n  "d": null\n}',
    )
  })
})

describe('text options', () => {
  it('adds secondary text, badges, an icon, bold and fill', () => {
    const w = cell(TextCell, '2:1', {
      secondary: () => '(1:0)',
      badge: () => ({ text: 'A', tone: 'success', title: 'Authorized' }),
      icon: () => ({ icon: Icon, tone: 'warning', label: 'Alert' }),
      bold: true,
      tone: 'danger',
      toneMode: 'fill',
    })
    expect(w.text()).toBe('A2:1 (1:0)')
    expect(w.find('.vg-badge').classes()).toContain('vg-tone-success')
    expect(w.find('.vg-text-icon').attributes('aria-label')).toBe('Alert')
    expect(w.find('.test-icon').exists()).toBe(true)
    expect(w.find('.vg-text').classes()).toEqual(
      expect.arrayContaining(['vg-text-bold', 'vg-text-fill', 'vg-tone-danger']),
    )
  })

  it('keeps newlines on request and puts the badge at the end', () => {
    const w = cell(TextCell, 'a\nb', {
      preserveNewlines: true,
      badge: () => 'X',
      badgePosition: 'end',
    })
    expect(w.find('.vg-text').classes()).toContain('vg-text-pre')
    expect(w.find('.vg-text-adorned').element.lastElementChild!.textContent).toBe('X')
  })

  it('copyable: copies the value (or copyValue) and emits copy', async () => {
    const writeText = mockClipboard()
    const w = cell(TextCell, 'SN-1', { copyable: true, copyValue: (v: string) => `serial ${v}` })
    await vi.waitFor(() => expect(w.find('.vg-copy-button').exists()).toBe(true)) // loaded on first use
    await w.find('.vg-copy-button').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('serial SN-1')
    expect(actions(w)).toEqual([['copy', 'serial SN-1']])
    expect(w.find('.vg-copy-button').attributes('aria-label')).toBe('Copied')
  })
})

describe('status, boolean, number, change, link options', () => {
  it('status: label map, variants, placeholder and click', async () => {
    const w = cell(StatusCell, 'CANCELLED', {
      label: { CANCELLED: 'Canceled' },
      tone: { CANCELLED: 'danger' },
      variant: 'outline',
      clickable: true,
    })
    expect(w.text()).toBe('Canceled')
    expect(w.find('button').classes()).toEqual(
      expect.arrayContaining(['vg-status-outline', 'vg-tone-danger']),
    )
    await w.find('button').trigger('click')
    expect(actions(w)).toEqual([['click', 'CANCELLED']])
    expect(cell(StatusCell, '', { placeholder: 'N/A' }).text()).toBe('N/A')
  })

  it('boolean icon mode: check, nothing or cross, and the null label', () => {
    expect(
      cell(BooleanCell, true, { display: 'icon' }).find('[role="img"]').attributes('aria-label'),
    ).toBe('Yes')
    const no = cell(BooleanCell, false, { display: 'icon' })
    expect(no.find('[role="img"]').exists()).toBe(false)
    expect(no.find('.vg-sr-only').text()).toBe('No')
    expect(
      cell(BooleanCell, false, { display: 'icon', falseIcon: true }).find('[role="img"]').exists(),
    ).toBe(true)
    expect(cell(BooleanCell, null, { display: 'icon', nullLabel: 'N/A' }).text()).toBe('N/A')
  })

  it('number / currency clickable emit click; placeholders are not clickable', async () => {
    const n = cell(NumberCell, 42, { clickable: true })
    await n.find('button').trigger('click')
    expect(actions(n)).toEqual([['click', 42]])
    expect(
      cell(NumberCell, null, { clickable: true, placeholder: 'N/A' }).find('button').exists(),
    ).toBe(false)
    const c = cell(CurrencyCell, 10, {
      clickable: (_v: unknown, r: typeof row) => r.id === 7,
      currency: 'EUR',
    })
    expect(c.find('button').text()).toContain('10')
  })

  it('change: booleans as trend, icon only', () => {
    const up = cell(ChangeCell, 'true', {})
    expect(up.classes()).toContain('vg-change-up')
    expect(up.attributes('aria-label')).toBe('Increased')
    expect(cell(ChangeCell, false, {}).classes()).toContain('vg-change-down')
    const only = cell(ChangeCell, 5, { iconOnly: true })
    expect(only.find('.vg-change-value').exists()).toBe(false)
    expect(only.attributes('aria-label')).toBe('Increased 5')
  })

  it('link `to`: href fallback without a router, RouterLink with one, plain text for null', () => {
    const plain = cell(LinkCell, 5, { to: (v: number) => `/orders/${v}` })
    expect(plain.find('a').attributes('href')).toBe('/orders/5')
    expect(
      cell(LinkCell, 5, { to: () => null })
        .find('a')
        .exists(),
    ).toBe(false)
    expect(cell(LinkCell, 5, { to: () => null }).text()).toBe('5')

    const RouterLink = defineComponent({
      props: { to: { type: [String, Object], required: true } },
      setup:
        (p, { slots }) =>
        () =>
          h('a', { class: 'router-link', 'data-to': JSON.stringify(p.to) }, slots.default?.()),
    })
    const routed = cell(
      LinkCell,
      5,
      { to: (v: number) => ({ name: 'order', params: { id: v } }) },
      { global: { components: { RouterLink } } },
    )
    expect(routed.find('.router-link').attributes('data-to')).toBe(
      '{"name":"order","params":{"id":5}}',
    )
  })
})

describe('new renderers', () => {
  it('multi-line: text, links (unsafe dropped), badges, trends and action lines', async () => {
    const w = cell(MultiLineCell, null, {
      lines: () => [
        { text: 'T-1', href: 'https://x.dev/t/1' },
        { text: 'bad', href: 'javascript:alert(1)' },
        { text: 'Won', tone: 'success', fill: true },
        { text: '2.10', trend: 'up' },
        { text: 'Retry', action: 'retry' },
        'plain',
        null,
      ],
      boldLines: [0],
    })
    const lines = w.findAll('.vg-line')
    expect(lines).toHaveLength(7)
    expect(lines[0]!.find('a').attributes('href')).toBe('https://x.dev/t/1')
    expect(lines[0]!.classes()).toContain('vg-text-bold')
    expect(lines[1]!.find('a').exists()).toBe(false)
    expect(lines[2]!.classes()).toEqual(expect.arrayContaining(['vg-text-fill', 'vg-tone-success']))
    expect(lines[3]!.find('svg').attributes('aria-label')).toBe('Increased')
    await lines[4]!.find('button').trigger('click')
    expect(actions(w)).toEqual([['retry', 4]])
    expect(cell(MultiLineCell, ['a', 'b']).findAll('.vg-line')).toHaveLength(2)
    expect(cell(MultiLineCell, [], { placeholder: '—' }).text()).toBe('—')
  })

  it('copy: copies, emits copy, reports failures', async () => {
    const writeText = mockClipboard()
    const w = cell(CopyCell, 'SN-42', { title: 'Serial number' })
    expect(w.find('.vg-text').attributes('data-vg-tip')).toBe('Serial number: SN-42')
    await w.find('button').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('SN-42')
    expect(actions(w)).toEqual([['copy', 'SN-42']])

    mockClipboard(false)
    const fail = cell(
      CopyCell,
      { a: 1 },
      { iconOnly: true, copyValue: (v: object) => JSON.stringify(v, null, 2) },
    )
    expect(fail.find('.vg-text').exists()).toBe(false)
    await fail.find('button').trigger('click')
    await flushPromises()
    expect(actions(fail)).toEqual([['copy-error', '{\n  "a": 1\n}']])
  })

  it('chip: raw colour with contrast, object values, tone map, tooltip', () => {
    const raw = cell(ChipCell, { name: 'A', color: '#facc15', description: 'Low risk' })
    expect(raw.text()).toBe('A')
    // colour handed to CSS, which paints it and picks readable text (checked in the browser tests)
    expect(raw.classes()).toContain('vg-chip-raw')
    expect((raw.element as HTMLElement).style.getPropertyValue('--vg-chip-bg')).toBe('#facc15')
    expect(raw.attributes('data-vg-tip')).toBe('Low risk')
    const toned = cell(ChipCell, 'C', { tone: { A: 'success', C: 'danger' }, shape: 'circle' })
    expect(toned.classes()).toEqual(
      expect.arrayContaining(['vg-chip-circle', 'vg-tone-danger', 'vg-chip-toned']),
    )
    // only a colour can be set from data, never a background image
    const evil = cell(ChipCell, { label: 'X', color: 'url(https://evil.example/x.png)' })
    expect(evil.attributes('style') ?? '').not.toContain('url(')
  })

  it('checkbox: controlled, emits the requested state, disabled with a reason', async () => {
    const w = cell(CheckboxCell, true)
    const input = w.find('input')
    expect((input.element as HTMLInputElement).checked).toBe(true)
    expect(input.attributes('aria-label')).toBe('Col')
    await input.setValue(false)
    expect(actions(w)).toEqual([['change', false]])
    expect((input.element as HTMLInputElement).checked).toBe(true) // until the data changes
    const off = cell(CheckboxCell, false, { disabled: true, disabledReason: () => 'Locked market' })
    expect(off.find('input').attributes('disabled')).toBeDefined()
    expect(off.find('.vg-control').attributes('data-vg-tip')).toBe('Locked market')
  })

  it('switch: aria-checked and change', async () => {
    const w = cell(SwitchCell, 0, {
      checked: (_v: unknown, r: typeof row) => r.id === 7,
      label: 'Web channel',
    })
    const btn = w.find('[role="switch"]')
    expect(btn.attributes('aria-checked')).toBe('true')
    expect(btn.attributes('aria-label')).toBe('Web channel')
    await btn.trigger('click')
    expect(actions(w)).toEqual([['change', false]])
  })

  it('radio: emits select with the row key, only when not already checked', async () => {
    const w = cell(RadioCell, false)
    await w.find('input').setValue(true)
    expect(actions(w)).toEqual([['select', 7]])
    expect((w.find('input').element as HTMLInputElement).checked).toBe(false)
  })

  it('edit: value plus an edit button', async () => {
    const w = cell(EditCell, 12.5, { format: (v: number) => `${v} %` })
    expect(w.find('.vg-text').text()).toBe('12.5 %')
    expect(w.find('button').attributes('aria-label')).toBe('Edit Col')
    await w.find('button').trigger('click')
    expect(actions(w)).toEqual([['edit', 12.5]])
    expect(cell(EditCell, 1, { disabled: true }).find('button').exists()).toBe(false)
  })

  it('image: base URL, unsafe sources and load errors fall back to a placeholder', async () => {
    const w = cell(ImageCell, 'logo.png', { baseUrl: 'https://cdn.x', alt: 'Logo' })
    expect(w.find('img').attributes('src')).toBe('https://cdn.x/logo.png')
    await w.find('img').trigger('error')
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('.vg-image-placeholder').attributes('aria-label')).toBe('Logo')
    expect(cell(ImageCell, 'javascript:alert(1)').find('img').exists()).toBe(false)
  })

  it('code: highlights JSON as text nodes, never HTML', () => {
    const w = cell(CodeCell, '{"html":"<img src=x onerror=alert(1)>","n":1}')
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('.vg-code-key').text()).toBe('"html"')
    expect(w.find('.vg-code-number').text()).toBe('1')
    expect(w.text()).toContain('<img src=x onerror=alert(1)>')
    expect(cell(CodeCell, 'plain text', {}).find('span').exists()).toBe(false)
    expect(cell(CodeCell, null).html()).toBe('<!--v-if-->')
  })

  it('button-group: emits each button name, skips hidden ones', async () => {
    const w = cell(ButtonGroupCell, null, {
      buttons: (r: typeof row) => [
        { name: 'approve', label: 'Approve', tone: 'success', variant: 'solid' },
        { name: 'reject', label: 'Reject', tone: 'danger', disabled: r.id === 7 },
        { name: 'hidden', label: 'Hidden', hidden: true },
      ],
    })
    const buttons = w.findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['Approve', 'Reject'])
    expect(buttons[0]!.classes()).toContain('vg-variant-solid')
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
    await buttons[0]!.trigger('click')
    expect(actions(w)).toEqual([['approve', null]])
  })

  it('icon-toggle: aria-pressed and toggle with the next state', async () => {
    const w = cell(IconToggleCell, true, { label: 'Favourite' })
    expect(w.attributes('aria-pressed')).toBe('true')
    expect(w.classes()).toContain('vg-tone-warning')
    await w.trigger('click')
    expect(actions(w)).toEqual([['toggle', false]])
  })

  it('details: badge plus a popover listing the items', () => {
    const w = cell(DetailsCell, 'ERROR', {
      tone: { ERROR: 'danger' },
      title: 'Devices',
      items: () => [{ label: 'Printer', value: 'OK', tone: 'success', detail: 'Model X' }],
    })
    expect(w.find('.vg-status-badge').classes()).toContain('vg-tone-danger')
    const trigger = w.find('button[popovertarget]')
    const panel = w.find('[popover]')
    expect(trigger.attributes('popovertarget')).toBe(panel.attributes('id'))
    expect(trigger.attributes('aria-label')).toBe('Details: Devices')
    expect(panel.text()).toContain('Printer')
    expect(panel.text()).toContain('Model X')
    expect(cell(DetailsCell, 'OK', {}).find('button').exists()).toBe(false)
  })

  it('list: first item(s) and a +N more toggle', async () => {
    const w = cell(ListCell, [{ p: 'a' }, { p: 'b' }, { p: 'c' }], {
      itemLabel: (i: { p: string }) => i.p,
    })
    // first item visible, the rest inside a native <details> (open state is the browser's)
    expect(
      w
        .find('.vg-list > .vg-list-items')
        .findAll('li')
        .map((l) => l.text()),
    ).toEqual(['a'])
    const details = w.find('details')
    expect(details.find('summary').text()).toContain('+2 more')
    expect(details.findAll('li').map((l) => l.text())).toEqual(['b', 'c'])
    ;(details.element as HTMLDetailsElement).open = true
    await details.trigger('toggle')
    expect(actions(w)).toEqual([['expand', true]])
    expect(cell(ListCell, ['x'], {}).find('details').exists()).toBe(false)
  })
})

describe('json-tree and action-button options', () => {
  it('json-tree: nested JSON strings, max depth, collapsed start, empty text', async () => {
    const w = cell(
      JsonTreeCell,
      { payload: '{"inner":{"deep":1}}' },
      { parseNested: true, collapseAt: 9, collapsed: true },
    )
    // collapsed → a native <details> that starts closed
    const reveal = w.find('details.vg-json-reveal')
    expect((reveal.element as HTMLDetailsElement).open).toBe(false)
    expect(reveal.find('summary').text()).toBe('More info')
    expect(w.text()).toContain('deep') // nested JSON string parsed into the tree
    const shallow = cell(JsonTreeCell, { a: { b: { c: 1 } } }, { collapseAt: 9, maxDepth: 1 })
    expect(shallow.text()).toContain('{1 key}')
    expect(shallow.text()).not.toContain('c:')
    expect(cell(JsonTreeCell, null, { emptyText: 'No data to show' }).text()).toBe(
      'No data to show',
    )
  })

  it('action-button: visible predicate, icon only, variants', () => {
    expect(
      cell(ActionButtonCell, 'x', { label: 'Resolve', visible: () => false })
        .find('button')
        .exists(),
    ).toBe(false)
    const w = cell(ActionButtonCell, 'x', {
      label: 'Delete',
      icon: Icon,
      iconOnly: true,
      variant: 'ghost',
      tone: 'danger',
    })
    expect(w.attributes('aria-label')).toBe('Delete')
    expect(w.text()).toBe('')
    expect(w.classes()).toEqual(
      expect.arrayContaining(['vg-variant-ghost', 'vg-tone-danger', 'vg-action-icon-only']),
    )
  })
})

describe('new renderers inside the grid', () => {
  it('controls emit cell-action with the row and never trigger row-click', async () => {
    const rows = [
      { id: 1, active: true, fav: false },
      { id: 2, active: false, fav: true },
    ]
    const w = mount(VGrid, {
      props: {
        rows,
        rowKey: 'id',
        columns: [
          { key: 'active', header: 'Active', renderer: 'checkbox' },
          { key: 'web', header: 'Web', renderer: 'switch', field: 'active' },
          { key: 'fav', header: 'Fav', renderer: 'icon-toggle' },
        ],
      },
    })
    await w.find('[data-row-key="2"] input[type="checkbox"]').setValue(true)
    await w.find('[data-row-key="1"] [role="switch"]').trigger('click')
    await w.find('[data-row-key="2"] .vg-icon-toggle').trigger('click')
    const events = (
      w.emitted('cell-action') as { name: string; payload: unknown; rowKey: number }[][]
    ).map(([e]) => [e!.name, e!.payload, e!.rowKey])
    expect(events).toEqual([
      ['change', true, 2],
      ['change', false, 1],
      ['toggle', false, 2],
    ])
    expect(w.emitted('row-click')).toBeUndefined()
  })
})
