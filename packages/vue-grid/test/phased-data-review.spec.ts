import { flushPromises, mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { matchesFilter, type TextFilter, type SetFilter } from '../src/core/filter'
import type { DataSource } from '../src/composables/useDataSource'
import type { VGridExposed } from '../src/types'

type Row = { id: number; group: string; name: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const grid = VGridComponent as any
const columns = [{ key: 'group' }, { key: 'name' }]
const pending = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('updates matching after mutating an existing filter', () => {
  const text = reactive<TextFilter>({ type: 'text', op: 'equals', value: 'Alpha' })
  const set = reactive<SetFilter>({ type: 'set', values: ['Alpha'] })
  expect(matchesFilter('Alpha', text)).toBe(true)
  expect(matchesFilter('Alpha', set)).toBe(true)
  text.value = 'Beta'
  set.values[0] = 'Beta'
  expect.soft(matchesFilter('Beta', text)).toBe(true)
  expect.soft(matchesFilter('Beta', set)).toBe(true)
})

it('skips locked group rows in shift selection', async () => {
  const source: DataSource<Row> = async (query) => {
    const group = query.groupPath?.[0]?.value
    return group
      ? {
          rows: [
            { id: 'ABC'.indexOf(String(group)) + 1, group: String(group), name: String(group) },
          ],
        }
      : { groups: ['A', 'B', 'C'].map((value) => ({ value, count: 1 })) }
  }
  const w = mount(grid, {
    attachTo: document.body,
    props: {
      dataSource: source,
      rowKey: 'id',
      columns,
      groupBy: 'group',
      selectable: true,
      groupsExpanded: true,
      selectedGroups: [[{ key: 'group', value: 'B' }]],
    },
  })
  await flushPromises()
  await flushPromises()
  const checkbox = (key: number) => w.get(`.vg-row[data-row-key="${key}"] input[type="checkbox"]`)
  expect(checkbox(2).attributes('disabled')).toBeDefined()
  await checkbox(1).trigger('click')
  await checkbox(3).trigger('click', { shiftKey: true })
  expect(w.emitted('update:selected')?.at(-1)?.[0]).toEqual([1, 3])
  w.unmount()
})

it('aborts group fetches on unmount', async () => {
  let childSignal: AbortSignal | undefined
  const child = pending<{ rows: Row[] }>()
  const source: DataSource<Row> = async (query, { signal }) => {
    if (!query.groupPath?.length) return { groups: [{ value: 'A', count: 1 }] }
    childSignal = signal
    return child.promise
  }
  const w = mount(grid, {
    props: { dataSource: source, columns, rowKey: 'id', groupBy: 'group', groupsExpanded: true },
  })
  await flushPromises()
  await flushPromises()
  expect(childSignal?.aborted).toBe(false)
  w.unmount()
  expect(childSignal?.aborted).toBe(true)
})

it('removes a deleted client row from the pinned section', async () => {
  const w = mount(grid, {
    props: {
      rows: [{ id: 1, group: 'A', name: 'pending' }],
      columns,
      rowKey: 'id',
      pinnedRows: { top: [1] },
    },
  })
  expect(w.find('[data-pinned-key="1"]').exists()).toBe(true)
  await w.setProps({ rows: [] })
  expect(w.find('[data-pinned-key="1"]').exists()).toBe(false)
  w.unmount()
})

it('keeps counting a server-group selection on a different page', async () => {
  const source: DataSource<Row> = async (query) => ({
    groups: [{ value: query.page === 1 ? 'A' : 'B', count: 25 }],
    total: 2,
  })
  const w = mount(grid, {
    props: {
      dataSource: source,
      rowKey: 'id',
      columns,
      groupBy: 'group',
      pagination: true,
      pageSize: 1,
      page: 1,
      selectable: true,
      statusBar: false,
      selectedGroups: [[{ key: 'group', value: 'A' }]],
    },
    slots: {
      'status-bar': ({ selectedCount }: { selectedCount: number }) =>
        `Selected count: ${selectedCount}`,
    },
  })
  await flushPromises()
  await vi.dynamicImportSettled()
  await flushPromises()
  await w.setProps({ page: 2 })
  await flushPromises()
  await w.setProps({ statusBar: true })
  await vi.dynamicImportSettled()
  await flushPromises()
  expect(w.text()).toContain('Selected count: 25')
  w.unmount()
})

it('refreshes open group children on reload when the source reuses unchanged group metadata', async () => {
  const groups = [{ value: 'A', count: 1 }]
  let name = 'first version'
  const source: DataSource<Row> = async (query) =>
    query.groupPath?.length ? { rows: [{ id: 1, group: 'A', name }] } : { groups }
  const w = mount(grid, {
    props: { dataSource: source, rowKey: 'id', columns, groupBy: 'group', groupsExpanded: true },
  })
  await flushPromises()
  await flushPromises()
  expect(w.text()).toContain('first version')
  name = 'second version'
  await (w.vm as unknown as VGridExposed).reload()
  await flushPromises()
  expect(w.text()).toContain('second version')
  w.unmount()
})

it('provides a status summary over individually selected grouped rows', async () => {
  const source: DataSource<Row> = async (query) =>
    query.groupPath?.length
      ? { rows: [{ id: 100, group: 'A', name: 'First' }] }
      : { groups: [{ value: 'A', count: 1 }] }
  const w = mount(grid, {
    props: {
      dataSource: source,
      rowKey: 'id',
      columns: [...columns, { key: 'id' }],
      groupBy: 'group',
      groupsExpanded: true,
      selectable: true,
      selected: [100],
      statusBar: { summary: ['id'], aggregates: ['sum'] },
    },
    slots: {
      'status-bar': ({ summary }: { summary: { items: { value: number }[] }[] }) =>
        `Summary sum: ${summary[0]?.items[0]?.value}`,
    },
  })
  await flushPromises()
  await flushPromises()
  await vi.dynamicImportSettled()
  await flushPromises()
  expect(w.text()).toContain('First')
  expect(w.text()).toContain('Summary sum: 100')
  w.unmount()
})

it('does not refetch when the same query values are supplied again', async () => {
  const source = vi.fn<DataSource<Row>>(async () => ({
    rows: [{ id: 1, group: 'A', name: 'First' }],
  }))
  const sameFilters = () => ({ search: '', columns: {} })
  const w = mount(grid, {
    props: { dataSource: source, rowKey: 'id', columns, filters: sameFilters() },
  })
  await flushPromises()
  expect(source).toHaveBeenCalledTimes(1)
  await w.setProps({ filters: sameFilters() })
  await flushPromises()
  expect(source).toHaveBeenCalledTimes(1)
  w.unmount()
})

it('renders a server group label when the row renderer requires a data row', async () => {
  const label = vi.fn((_value: unknown, row: Row) => row.name)
  const dataSource: DataSource<Row> = async () => ({ groups: [{ value: 'A', count: 2 }] })
  const w = mount(grid, {
    props: {
      dataSource,
      rowKey: 'id',
      groupBy: 'group',
      columns: [{ key: 'group', renderer: 'status', rendererOptions: { label } }],
    },
  })
  await flushPromises()
  expect(w.get('.vg-rowgroup-value').text()).toBe('A')
  expect(label).not.toHaveBeenCalled()
  w.unmount()
})
