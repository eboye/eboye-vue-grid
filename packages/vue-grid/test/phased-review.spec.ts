import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, shallowRef } from 'vue'
import CopyButton from '../src/renderers/parts/CopyButton.vue'
import { createTooltip } from '../src/internal/tooltipController'
import { setCellValue } from '../src/core/value'
import type { CellEditEvent, VGridExposed } from '../src/types'
import VGridComponent from '../src/components/VGrid.vue'
import VGridMenu from '../src/components/VGridMenu.vue'
import VGridFilterInput from '../src/components/VGridFilterInput.vue'
import VGridFilterPanel from '../src/components/VGridFilterPanel.vue'
import VGridSearch from '../src/components/VGridSearch.vue'
import { createVueGrid } from '../src/registry/plugin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

describe('review regressions', () => {
  it('preserves an untouched datetime', async () => {
    const value = '2026-01-05T10:12:35.123Z'
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows: [{ id: 1, value }],
        rowKey: 'id',
        columns: [{ key: 'value', editable: true, editor: 'datetime' }],
      },
    })
    try {
      await w.get('.vg-cell[data-col-key=value]').trigger('dblclick')
      await vi.dynamicImportSettled()
      await flushPromises()
      await w.get('.vg-editor-control').trigger('keydown', { key: 'Enter' })
      expect(w.emitted('cell-edit')).toBeUndefined()
    } finally {
      w.unmount()
    }
  })
  it('lets a focused menu button use its native Space activation', () => {
    const w = mount(VGridMenu, {
      attachTo: document.body,
      props: { items: [{ name: 'one', label: 'One' }] },
    })
    try {
      const item = w.get('button').element
      item.focus()
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      item.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
      expect(w.emitted('select')).toBeUndefined()
    } finally {
      w.unmount()
    }
  })
  it.each([
    ['a sparse array', Array(2)],
    ['an invalid Date', new Date('invalid')],
  ])('renders %s without throwing', (_label, value) => {
    const w = mount(VGrid, {
      props: {
        rows: [{ id: 1, value }],
        rowKey: 'id',
        columns: [{ key: 'value', renderer: 'json-tree' }],
      },
    })
    expect(w.find('.vg-json-node').exists()).toBe(true)
    w.unmount()
  })
  it('gives different column keys distinct filter IDs', () => {
    const w = mount(VGrid, {
      props: {
        rows: [{ id: 1 }],
        rowKey: 'id',
        columns: [
          { key: 'amount.gross', filterable: true },
          { key: 'amount_gross', filterable: true },
        ],
      },
    })
    try {
      const ids = w.findAll('.vg-filter-button').map((b) => b.attributes('popovertarget'))
      expect(ids).toHaveLength(2)
      expect(ids[0]).not.toBe(ids[1])
    } finally {
      w.unmount()
    }
  })
  it('keeps the value-list popup when the funnel is hidden', async () => {
    const w = mount(VGrid, {
      props: {
        rows: [{ id: 1 }],
        rowKey: 'id',
        columns: [{ key: 'id', filterable: true, filter: 'set' }],
        filterRow: true,
        parts: { filterButtons: false },
      },
    })
    try {
      await vi.dynamicImportSettled()
      expect(w.find('.vg-filter-summary').exists()).toBe(true)
      expect(w.find('.vg-filter-button').exists()).toBe(false)
      expect(w.find('.vg-filter-popover').exists()).toBe(true)
    } finally {
      w.unmount()
    }
  })
  it('cancels the pending input when clearing a text filter', async () => {
    vi.useFakeTimers()
    const w = mount(VGridFilterPanel, {
      props: {
        column: { key: 'test' },
        type: 'text',
        values: [],
        modelValue: { type: 'text', op: 'contains', value: 'before' },
      },
    })
    try {
      await w.get('input').setValue('edited')
      await w.get('button').trigger('click')
      await vi.advanceTimersByTimeAsync(160)
      expect(w.emitted('update:modelValue')).toEqual([[undefined]])
    } finally {
      w.unmount()
      vi.useRealTimers()
    }
  })
  it('syncs the focused search input after an external reset', async () => {
    const w = mount(VGridSearch, { props: { modelValue: 'before' } })
    try {
      await w.get('input').trigger('focus')
      await w.setProps({ modelValue: '' })
      await w.get('input').trigger('blur')
      expect(w.get('input').element.value).toBe('')
    } finally {
      w.unmount()
    }
  })
})

it('keeps the initial unrelated filter choices selected after unchecking one searched result', async () => {
  vi.useFakeTimers()
  try {
    const w = mount(VGridFilterPanel, {
      props: {
        column: { key: 'name' },
        type: 'set',
        values: [],
        modelValue: undefined,
        loadValues: async (search) =>
          ['A', 'B', 'C'].filter((value) => value.includes(search)).map((value) => ({ value })),
      },
    })
    await flushPromises()
    expect(w.findAll('.vg-filter-values input')).toHaveLength(3)
    await w.get('input[type="search"]').setValue('B')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(w.findAll('.vg-filter-values input')).toHaveLength(1)
    await w.get('.vg-filter-values input').setValue(false)
    expect(w.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({ type: 'set', values: ['A', 'C'] })
    w.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it('clears the numeric row key independently of the string key', async () => {
  const rows = reactive([
    { id: 1, name: 'Numeric' },
    { id: '1', name: 'String' },
  ])
  const w = mount(VGrid, {
    props: {
      rows,
      rowKey: 'id',
      columns: [{ key: 'name', editable: true }],
      rangeSelection: true,
      'onCell-edit': (edit: CellEditEvent<{ id: string | number; name: string }>) => {
        setCellValue(edit.row, edit.column, edit.value)
      },
    },
  })
  const endpoint = { rowKey: 1, columnKey: 'name' }
  ;(w.vm as unknown as VGridExposed).selectRange({ start: endpoint, end: endpoint })
  await flushPromises()
  await (w.vm as unknown as VGridExposed).clearRange()
  expect(rows).toEqual([
    { id: 1, name: '' },
    { id: '1', name: 'String' },
  ])
  w.unmount()
})

it('keeps the selected radio checked when the change is declined', async () => {
  const w = mount(VGrid, {
    attachTo: document.body,
    props: {
      rows: [
        { id: 1, active: true },
        { id: 2, active: false },
      ],
      rowKey: 'id',
      columns: [{ key: 'active', renderer: 'radio', rendererOptions: { name: 'group' } }],
    },
  })
  try {
    const [first, second] = w.findAll<HTMLInputElement>('input[type=radio]')
    expect(first!.element.checked).toBe(true)
    second!.element.click()
    expect(first!.element.checked).toBe(true)
    expect(second!.element.checked).toBe(false)
  } finally {
    w.unmount()
  }
})
it('renders ordinary objects that contain BigInt or cycles', () => {
  const cycle: Record<string, unknown> = {}
  cycle.self = cycle
  const w = mount(VGrid, {
    props: {
      rows: [
        { id: 1, value: { count: 1n } },
        { id: 2, value: cycle },
      ],
      rowKey: 'id',
      columns: [{ key: 'value' }],
    },
  })
  expect(w.findAll('.vg-row .vg-text')).toHaveLength(2)
  w.unmount()
})

it('reports the exact text sent to the clipboard', async () => {
  let finish!: () => void
  const writeText = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const w = mount(CopyButton, { props: { text: 'before' } })
  try {
    await w.get('button').trigger('click')
    await w.setProps({ text: 'after' })
    finish()
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('before')
    expect(w.emitted('copied')).toEqual([['before']])
  } finally {
    w.unmount()
    vi.unstubAllGlobals()
  }
})

it('cancels the queued tooltip when the pointer returns', async () => {
  vi.useFakeTimers()
  const a = document.createElement('span')
  const b = document.createElement('span')
  const popover = document.createElement('div')
  a.setAttribute('data-vg-tip', 'a')
  b.setAttribute('data-vg-tip', 'b')
  popover.showPopover = vi.fn()
  vi.spyOn(popover, 'matches').mockReturnValue(false)
  document.body.append(a, b, popover)
  const control = createTooltip(shallowRef(popover), '--tip')
  const over = (target: HTMLElement) =>
    control.pointerover({ target, pointerType: 'mouse' } as unknown as PointerEvent)
  try {
    over(a)
    await vi.advanceTimersByTimeAsync(401)
    expect(popover.textContent).toBe('a')
    over(b)
    over(a)
    await vi.advanceTimersByTimeAsync(401)
    expect(popover.textContent).toBe('a')
  } finally {
    control.hide()
    a.remove()
    b.remove()
    popover.remove()
    vi.useRealTimers()
  }
})

it('uses the visible JSON title as the accessible dialog name', () => {
  const w = mount(VGrid, {
    props: {
      rows: [{ id: 1, payload: { k: 'value' } }],
      rowKey: 'id',
      columns: [{ key: 'payload', header: 'Payload', renderer: 'json' }],
    },
  })
  const dialog = w.get('dialog')
  const label = dialog.get('strong')
  expect(label.text()).toBe('Payload')
  expect(label.attributes('id')).toBeTruthy()
  expect(dialog.attributes('aria-labelledby')).toBe(label.attributes('id'))
  w.unmount()
})

it('localizes an advanced filter summary and the panel clear action', () => {
  const global = {
    plugins: [
      createVueGrid({
        messages: {
          filterColumn: (name: string) => `Filter für ${name}`,
          customFilter: 'Benutzerdefiniert',
          clearFilter: 'Löschen',
        },
      }),
    ],
  }
  const props = {
    type: 'text' as const,
    column: { key: 'name', header: 'Name' },
    modelValue: { type: 'text' as const, op: 'notContains' as const, value: 'A' },
  }
  const input = mount(VGridFilterInput, { global, props })
  const panel = mount(VGridFilterPanel, { global, props: { ...props, values: [] } })
  expect(input.get('button').text()).toBe('Benutzerdefiniert')
  expect(input.get('button').attributes('aria-label')).toBe('Filter für Name')
  expect(panel.get('header button').text()).toBe('Löschen')
  input.unmount()
  panel.unmount()
})
