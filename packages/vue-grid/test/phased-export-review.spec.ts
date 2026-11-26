import { expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'

import type { GridQuery } from '../src/composables/useDataSource'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any
const columns = [{ key: 'id' }, { key: 'name' }, { key: 'team' }]

it('copies a focused loaded server-group cell', async () => {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  const w = mount(VGrid, {
    props: {
      rowKey: 'id',
      columns,
      groupBy: 'team',
      dataSource: async (q: GridQuery) =>
        q.groupPath?.length
          ? { rows: [{ id: 1, name: 'Ada', team: 'Blue' }] }
          : { groups: [{ value: 'Blue', count: 1 }], total: 1 },
    },
  })
  await flushPromises()
  await w.get('[aria-label="Expand group"]').trigger('click')
  await flushPromises()
  const cell = w.get('[data-row-key="1"] [data-col-key="name"]')
  await cell.trigger('keydown', { key: 'c', ctrlKey: true })
  expect(cell.text()).toBe('Ada')
  expect(writeText).toHaveBeenCalledWith('Ada')
  w.unmount()
})

it('exports a selected cached pinned row after changing page', async () => {
  const w = mount(VGrid, {
    props: {
      rowKey: 'id',
      columns,
      selectable: true,
      pagination: true,
      pageSize: 1,
      page: 1,
      pinnedRows: { top: [1] },
      selected: [1],
      dataSource: async (q: GridQuery) => ({
        rows: [{ id: q.page, name: q.page === 1 ? 'Ada' : 'Lin', team: 'Blue' }],
        total: 2,
      }),
    },
  })
  await flushPromises()
  await w.setProps({ page: 2 })
  await flushPromises()
  expect(w.get('[data-pinned-key="1"] [data-col-key="name"]').text()).toBe('Ada')
  expect(w.get('[data-row-key="2"] [data-col-key="name"]').text()).toBe('Lin')
  expect(
    (w.vm as unknown as VGridExposed).getCsv({
      rows: 'selected',
      columns: ['name'],
      header: false,
    }),
  ).toBe('Ada')
  w.unmount()
})
