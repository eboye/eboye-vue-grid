import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { setCellValue } from '../src/core/value'
import type { CellEditEvent, VGridExposed } from '../src/types'
import VGridComponent from '../src/components/VGrid.vue'
import VGridMenu from '../src/components/VGridMenu.vue'
import VGridFilterPanel from '../src/components/VGridFilterPanel.vue'

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
  it.each([['a sparse array', Array(2)]])('renders %s without throwing', (_label, value) => {
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
