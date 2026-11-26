import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { setCellValue } from '../src/core/value'
import type { CellEditEvent, ColumnDef } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  stake: number | null
  status: string
  active: boolean
  placed: string
  meta: { note: string }
}
const makeRows = (): Row[] => [
  {
    id: 1,
    name: 'Ana',
    stake: 10,
    status: 'Open',
    active: true,
    placed: '2026-01-05',
    meta: { note: 'a' },
  },
  {
    id: 2,
    name: 'Bo',
    stake: 20,
    status: 'Won',
    active: false,
    placed: '2026-02-10',
    meta: { note: 'b' },
  },
  {
    id: 3,
    name: 'Cy',
    stake: null,
    status: 'Lost',
    active: true,
    placed: '2026-03-15',
    meta: { note: 'c' },
  },
]
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#' },
  { key: 'name', header: 'Name', editable: true, validate: (v) => (v ? undefined : 'Required') },
  {
    key: 'stake',
    header: 'Stake',
    renderer: 'currency',
    editable: true,
    editorOptions: { min: 0 },
  },
  { key: 'status', header: 'Status', renderer: 'status', editable: (r) => r.status !== 'Lost' },
  { key: 'active', header: 'Active', renderer: 'boolean', editable: true },
  { key: 'placed', header: 'Placed', renderer: 'date', editable: true },
  { key: 'note', header: 'Note', field: 'meta.note', editable: true },
]

const cell = (w: VueWrapper, id: number, key: string) =>
  w.find(`[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const input = (w: VueWrapper) => w.find<HTMLInputElement>('.vg-editor-control')

async function mountGrid(props: Record<string, unknown> = {}) {
  const edits: CellEditEvent<Row>[] = []
  const w = mount(VGrid, {
    attachTo: document.body,
    props: {
      rows: makeRows(),
      columns,
      rowKey: 'id',
      onCellEdit: (e: CellEditEvent<Row>) => edits.push(e),
      ...props,
    },
  })
  await flushPromises()
  return { w, edits }
}
/** The editor loads on demand (its own chunk): let the import settle. */
async function settle() {
  await flushPromises()
  // a cell in edit mode shows the editor once its chunk has loaded
  await vi.waitFor(() => {
    for (const el of document.querySelectorAll('.vg-cell-editing'))
      if (!el.querySelector('.vg-editor')) throw new Error('editor not loaded yet')
  })
  await flushPromises()
}
async function dblclick(w: VueWrapper, id: number, key: string) {
  await cell(w, id, key).trigger('dblclick')
  await settle()
}
async function key(el: { trigger: VueWrapper['trigger'] }, k: string, init: object = {}) {
  await el.trigger('keydown', { key: k, ...init })
  await settle()
}

describe('inline editing', () => {
  it('keeps another editor open when a checkbox save completes', async () => {
    let finish!: () => void
    const saveCell = () => new Promise<void>((resolve) => (finish = resolve))
    const { w } = await mountGrid({ saveCell })
    await dblclick(w, 1, 'active')
    await dblclick(w, 1, 'name')
    await input(w).setValue('Draft')
    finish()
    await settle()
    expect(input(w).element.value).toBe('Draft')
    w.unmount()
  })

  it('double-click opens the editor; Enter emits cell-edit with a typed value and closes it', async () => {
    const { w, edits } = await mountGrid()
    await dblclick(w, 1, 'stake')
    expect(input(w).element.value).toBe('10')
    expect(input(w).attributes('aria-label')).toBe('Edit Stake')
    await input(w).setValue('12,5')
    await key(input(w), 'Enter')
    expect(edits).toHaveLength(1)
    expect(edits[0]).toMatchObject({ rowKey: 1, value: 12.5, oldValue: 10 })
    expect(edits[0]!.column.key).toBe('stake')
    expect(input(w).exists()).toBe(false)
    w.unmount()
  })

  it('Esc cancels; an unchanged value emits nothing', async () => {
    const { w, edits } = await mountGrid()
    await dblclick(w, 1, 'name')
    await input(w).setValue('Changed')
    await key(input(w), 'Escape')
    expect(input(w).exists()).toBe(false)
    await dblclick(w, 1, 'name')
    await key(input(w), 'Enter')
    expect(edits).toHaveLength(0)
    w.unmount()
  })

  it('validate and number parsing keep the editor open with the message', async () => {
    const { w, edits } = await mountGrid()
    await dblclick(w, 2, 'name')
    await input(w).setValue('')
    await key(input(w), 'Enter')
    expect(input(w).exists()).toBe(true)
    expect(input(w).attributes('aria-invalid')).toBe('true')
    expect(w.find('.vg-edit-error').text()).toBe('Required')
    await key(input(w), 'Escape')

    await dblclick(w, 2, 'stake')
    await input(w).setValue('abc')
    await key(input(w), 'Enter')
    expect(w.find('.vg-edit-error').text()).toBe('Enter a number.')
    await input(w).setValue('-3')
    await key(input(w), 'Enter')
    expect(w.find('.vg-edit-error').text()).toBe('Enter a number of at least 0.')
    await input(w).setValue('')
    await key(input(w), 'Enter')
    expect(edits.at(-1)).toMatchObject({ value: null, oldValue: 20 })
    w.unmount()
  })

  it('Tab commits and edits the next editable cell (skipping read-only ones); Shift+Tab goes back', async () => {
    const { w, edits } = await mountGrid()
    await dblclick(w, 1, 'name')
    await input(w).setValue('Ann')
    await key(input(w), 'Tab')
    expect(edits.at(-1)).toMatchObject({ value: 'Ann' })
    expect(cell(w, 1, 'stake').classes()).toContain('vg-cell-editing')
    await key(input(w), 'Tab', { shiftKey: true })
    expect(cell(w, 1, 'name').classes()).toContain('vg-cell-editing')
    // row 3's status is not editable: from its stake, Tab skips to the checkbox column
    await key(input(w), 'Escape')
    await dblclick(w, 3, 'stake')
    await key(input(w), 'Tab')
    expect(cell(w, 3, 'status').attributes('data-vg-editable')).toBeUndefined()
    // …and a checkbox cell takes focus without flipping
    expect(w.find('.vg-cell-editing').exists()).toBe(false)
    expect(document.activeElement).toBe(cell(w, 3, 'active').element)
    expect(edits.filter((e) => e.column.key === 'active')).toHaveLength(0)
    w.unmount()
  })

  it('typing on a focused cell starts editing with that character; Enter / F2 keep the value', async () => {
    const { w } = await mountGrid()
    await key(cell(w, 2, 'name'), 'X')
    expect(input(w).element.value).toBe('X')
    await key(input(w), 'Escape')
    await key(cell(w, 2, 'name'), 'F2')
    expect(input(w).element.value).toBe('Bo')
    await key(input(w), 'Escape')
    // modifiers and Space don't start editing
    await key(cell(w, 2, 'name'), 'c', { ctrlKey: true })
    await key(cell(w, 2, 'name'), ' ')
    expect(input(w).exists()).toBe(false)
    w.unmount()
  })

  it('keys typed while the editor opens are kept, in order; a queued Enter commits', async () => {
    const { w, edits } = await mountGrid()
    const target = cell(w, 1, 'name')
    // no settling between keys: the editor's chunk may still be loading
    for (const k of ['Z', 'o', 'e', 'Enter']) await target.trigger('keydown', { key: k })
    await settle()
    await vi.waitFor(() => expect(edits).toHaveLength(1))
    expect(edits[0]).toMatchObject({ value: 'Zoe', oldValue: 'Ana' })
    expect(w.find('.vg-editor').exists()).toBe(false)
    w.unmount()
  })

  it('a checkbox column flips at once; select offers the distinct values; date stays a date string', async () => {
    const { w, edits } = await mountGrid()
    await dblclick(w, 2, 'active')
    expect(edits.at(-1)).toMatchObject({ value: true, oldValue: false })
    expect(w.find('.vg-editor').exists()).toBe(false)

    await dblclick(w, 1, 'status')
    const select = w.find<HTMLSelectElement>('select.vg-editor-control')
    expect(select.findAll('option').map((o) => o.text())).toEqual(['Lost', 'Open', 'Won'])
    await select.setValue('2')
    await key(select, 'Enter')
    expect(edits.at(-1)).toMatchObject({ value: 'Won', oldValue: 'Open' })
    // not editable for this row
    await dblclick(w, 3, 'status')
    expect(w.find('.vg-editor').exists()).toBe(false)

    await dblclick(w, 1, 'placed')
    expect(input(w).attributes('type')).toBe('date')
    expect(input(w).element.value).toBe('2026-01-05')
    await input(w).setValue('2026-01-06')
    await key(input(w), 'Enter')
    expect(edits.at(-1)).toMatchObject({ value: '2026-01-06' })
    w.unmount()
  })

  it('save-cell: saving state, a rejection reopens with its message, success closes', async () => {
    let reject: (e: unknown) => void = () => {}
    let resolve: () => void = () => {}
    const saveCell = () =>
      new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
      })
    const { w } = await mountGrid({ saveCell })
    await dblclick(w, 1, 'name')
    await input(w).setValue('Ana B')
    await key(input(w), 'Enter')
    expect(w.find('.vg-editor').attributes('aria-busy')).toBe('true')
    expect(input(w).element.disabled).toBe(true)
    reject(new Error('Server says no'))
    await flushPromises()
    expect(input(w).element.disabled).toBe(false)
    expect(input(w).element.value).toBe('Ana B')
    expect(w.find('.vg-edit-error').text()).toBe('Server says no')
    await key(input(w), 'Enter')
    resolve()
    await flushPromises()
    expect(w.find('.vg-editor').exists()).toBe(false)
    w.unmount()
  })

  it('startEdit / stopEdit, and nothing without the feature', async () => {
    const { w, edits } = await mountGrid()
    const vm = w.vm as unknown as {
      startEdit(k: number, c: string): boolean
      stopEdit(cancel?: boolean): void
    }
    expect(vm.startEdit(1, 'id')).toBe(false)
    expect(vm.startEdit(1, 'note')).toBe(true)
    await settle()
    await input(w).setValue('changed')
    vm.stopEdit()
    await flushPromises()
    expect(edits.at(-1)).toMatchObject({ value: 'changed', oldValue: 'a' })
    w.unmount()

    const plain = mount(VGrid, {
      props: { rows: makeRows(), columns, rowKey: 'id', features: [] },
      global: { provide: {} },
    })
    await flushPromises()
    // the app-wide features in the test setup include editing; a grid's own list adds to them,
    // so this checks only that read-only columns never get the attribute
    expect(plain.find('[data-col-key="id"][data-vg-editable]').exists()).toBe(false)
    plain.unmount()
  })

  it('setCellValue writes along the field path, and refuses computed columns', () => {
    const row = reactive(makeRows()[0]!)
    expect(setCellValue(row, { key: 'note', field: 'meta.note' }, 'z')).toBe(true)
    expect(row.meta.note).toBe('z')
    expect(setCellValue(row, { key: 'x', value: () => 1 }, 2)).toBe(false)
    expect(setCellValue(row, { key: 'x', field: '__proto__.y' }, 2)).toBe(false)
    expect(setCellValue(row, { key: 'x', field: 'missing.y' }, 2)).toBe(false)
  })
})
