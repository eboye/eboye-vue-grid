import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h, reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { setCellValue } from '../src/core/value'
import type { CellEditEvent, CellRange, ColumnDef, VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  stake: number
  vip: boolean
}
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#' },
  { key: 'name', header: 'Name', editable: true },
  { key: 'stake', header: 'Stake', renderer: 'number', editable: true },
  { key: 'vip', header: 'VIP', renderer: 'boolean', editable: true },
]

function make(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const rows = reactive<Row[]>([
    { id: 1, name: 'Ana', stake: 10, vip: false },
    { id: 2, name: 'Bo', stake: 20, vip: true },
    { id: 3, name: 'Cy', stake: 30, vip: false },
  ])
  const edits: CellEditEvent<Row>[] = []
  const w = mount(VGrid, {
    attachTo: document.body,
    props: {
      rows,
      columns,
      rowKey: 'id',
      rangeSelection: true,
      'onCell-edit': (e: CellEditEvent<Row>) => {
        edits.push(e)
        setCellValue(e.row, e.column, e.value)
      },
      ...props,
    },
    slots,
  })
  return { w, rows, edits }
}
const api = (w: VueWrapper) => w.vm as unknown as VGridExposed
const cell = (w: VueWrapper, id: number, key: string) =>
  w.find(`[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const input = (w: VueWrapper) => w.find<HTMLInputElement>('.vg-editor-control')
async function settle() {
  await flushPromises()
  await vi.waitFor(() => {
    for (const el of document.querySelectorAll('.vg-cell-editing'))
      if (!el.querySelector('.vg-editor')) throw new Error('editor not loaded yet')
  })
  await flushPromises()
}
/** Types a value into a cell's editor and presses Enter. */
async function editCell(w: VueWrapper, id: number, key: string, value: string) {
  await cell(w, id, key).trigger('dblclick')
  await settle()
  await input(w).setValue(value)
  await input(w).trigger('keydown', { key: 'Enter' })
  await settle()
}
const press = async (el: Element, init: KeyboardEventInit) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  await flushPromises()
  await flushPromises()
}

describe('undo / redo', () => {
  it('an edit undoes and redoes through cell-edit, with its source', async () => {
    const { w, rows, edits } = make()
    await flushPromises()
    await editCell(w, 2, 'name', 'Zed')
    expect(rows[1]!.name).toBe('Zed')
    expect(edits.at(-1)!.source).toBe('edit')
    expect(api(w).canUndo()).toBe(true)
    expect(await api(w).undo()).toBe(true)
    expect(rows[1]!.name).toBe('Bo')
    expect(edits.at(-1)).toMatchObject({ source: 'undo', value: 'Bo', oldValue: 'Zed', rowKey: 2 })
    expect([api(w).canUndo(), api(w).canRedo()]).toEqual([false, true])
    expect(await api(w).redo()).toBe(true)
    expect(rows[1]!.name).toBe('Zed')
    expect(edits.at(-1)!.source).toBe('redo')
    // nothing more to redo
    expect(await api(w).redo()).toBe(false)
    w.unmount()
  })

  it('a checkbox flip is a step too; a new change drops what could be redone', async () => {
    const { w, rows } = make()
    await flushPromises()
    await cell(w, 1, 'vip').trigger('dblclick') // flips at once
    await flushPromises()
    expect(rows[0]!.vip).toBe(true)
    await api(w).undo()
    expect(rows[0]!.vip).toBe(false)
    expect(api(w).canRedo()).toBe(true)
    await editCell(w, 3, 'stake', '33')
    expect(api(w).canRedo()).toBe(false)
    w.unmount()
  })

  it('Ctrl+Z undoes a whole paste at once and selects the cells; Ctrl+Y redoes it', async () => {
    const { w, rows } = make()
    await flushPromises()
    const range: CellRange = {
      start: { rowKey: 1, columnKey: 'name' },
      end: { rowKey: 2, columnKey: 'stake' },
    }
    api(w).selectRange(range)
    await flushPromises()
    await api(w).pasteText('A\t1\nB\t2')
    expect(rows.slice(0, 2).map((r) => [r.name, r.stake])).toEqual([
      ['A', 1],
      ['B', 2],
    ])
    api(w).selectRange(null)
    const target = cell(w, 3, 'name').element
    await press(target, { key: 'z', ctrlKey: true })
    expect(rows.slice(0, 2).map((r) => [r.name, r.stake])).toEqual([
      ['Ana', 10],
      ['Bo', 20],
    ])
    expect(w.emitted('update:range')!.at(-1)![0]).toEqual(range) // the undone cells
    await press(target, { key: 'y', ctrlKey: true })
    expect(rows[0]!.name).toBe('A')
    await press(target, { key: 'z', metaKey: true })
    await press(target, { key: 'Z', metaKey: true, shiftKey: true }) // ⌘⇧Z redoes too
    expect(rows[1]!.stake).toBe(2)
    w.unmount()
  })

  it('a cell changed since by something else is left alone', async () => {
    const { w, rows, edits } = make()
    await flushPromises()
    await editCell(w, 1, 'name', 'Zed')
    rows[0]!.name = 'Live update' // e.g. pushed from the server
    const before = edits.length
    expect(await api(w).undo()).toBe(false)
    expect(rows[0]!.name).toBe('Live update')
    expect(edits).toHaveLength(before)
    w.unmount()
  })

  it('does not replay old edits against a locked, rebound, or absent target', async () => {
    const { w, rows, edits } = make({
      columns: columns.map((column) =>
        column.key === 'name' ? { ...column, editable: (row: Row) => !row.vip } : column,
      ),
    })
    await flushPromises()
    await editCell(w, 1, 'name', 'First')
    rows[0]!.vip = true
    expect(await api(w).undo()).toBe(false)
    expect(rows[0]!.name).toBe('First')

    rows[0]!.vip = false
    await editCell(w, 1, 'name', 'Second')
    await w.setProps({
      columns: columns.map((column) =>
        column.key === 'name' ? { ...column, field: 'stake' } : column,
      ),
    })
    expect(await api(w).undo()).toBe(false)
    expect(rows[0]!.name).toBe('Second')

    await w.setProps({ columns })
    await editCell(w, 1, 'name', 'Third')
    const [removed] = rows.splice(0, 1)
    await flushPromises()
    expect(await api(w).undo()).toBe(false)
    expect(removed?.name).toBe('Third')
    expect(edits.map((event) => event.source)).toEqual(['edit', 'edit', 'edit'])
    w.unmount()
  })

  it('captures the original edit binding before an async save can rebind its column', async () => {
    const name = reactive<ColumnDef<Row>>({ key: 'name', field: 'name', editable: true })
    let finishSave: (() => void) | undefined
    const { w, rows, edits } = make({
      columns: [name],
      saveCell: (event: CellEditEvent<Row>) =>
        event.source === 'edit'
          ? new Promise<void>((resolve) => {
              finishSave = resolve
            })
          : undefined,
    })
    Object.assign(rows[0]!, { alias: 'Changed' })
    await flushPromises()
    await editCell(w, 1, 'name', 'Changed')
    name.field = 'alias'
    finishSave!()
    await settle()
    expect(await api(w).undo()).toBe(false)
    expect(edits.map((event) => event.source)).toEqual(['edit'])
    expect(rows[0]).toMatchObject({ name: 'Changed', alias: 'Changed' })
    w.unmount()
  })

  it('remembers a successful edit completed while another cell is being undone', async () => {
    let finishUndo: (() => void) | undefined
    const saveCell = async (e: CellEditEvent<Row>) => {
      if (e.source === 'undo' && e.rowKey === 1) {
        await new Promise<void>((resolve) => {
          finishUndo = resolve
        })
      }
      setCellValue(e.row, e.column, e.value)
    }
    const { w, rows } = make({ saveCell, 'onCell-edit': undefined })
    await flushPromises()
    await editCell(w, 1, 'stake', '11')
    const pending = api(w).undo()
    await editCell(w, 2, 'stake', '22')
    finishUndo!()
    expect(await pending).toBe(true)
    expect(rows.map((row) => row.stake)).toEqual([10, 22, 30])
    expect(api(w).canRedo()).toBe(false)
    expect(await api(w).undo()).toBe(true)
    expect(rows.map((row) => row.stake)).toEqual([10, 20, 30])
    w.unmount()
  })

  it('save-cell: a refused save is not remembered; a refused undo can be tried again', async () => {
    let refuse = false
    // the app writes once the server has saved (the pattern for save-cell)
    const saveCell = vi.fn(async (e: CellEditEvent<Row>) => {
      if (refuse) throw new Error('locked')
      setCellValue(e.row, e.column, e.value)
    })
    const { w, rows } = make({ saveCell, 'onCell-edit': undefined })
    await flushPromises()
    refuse = true
    await editCell(w, 1, 'stake', '11') // refused: the editor stays open with the error
    expect(api(w).canUndo()).toBe(false)
    await input(w).trigger('keydown', { key: 'Escape' })
    refuse = false
    await editCell(w, 1, 'stake', '12')
    expect(rows[0]!.stake).toBe(12)
    refuse = true
    expect(await api(w).undo()).toBe(false) // refused: nothing changed…
    expect(rows[0]!.stake).toBe(12)
    expect(api(w).canUndo()).toBe(true) // …and it can be undone later
    refuse = false
    expect(await api(w).undo()).toBe(true)
    expect(rows[0]!.stake).toBe(10)
    w.unmount()
  })

  it('undo-limit bounds the history; 0 turns it off', async () => {
    const { w, rows } = make({ undoLimit: 1 })
    await flushPromises()
    await editCell(w, 1, 'stake', '11')
    await editCell(w, 2, 'stake', '22')
    await api(w).undo()
    expect(await api(w).undo()).toBe(false) // only one remembered
    expect(rows.map((r) => r.stake)).toEqual([11, 20, 30])
    w.unmount()
    const off = make({ undoLimit: 0 })
    await flushPromises()
    await editCell(off.w, 1, 'stake', '11')
    expect(api(off.w).canUndo()).toBe(false)
    off.w.unmount()
  })

  it('Ctrl+Z inside an open editor is the editor’s own; parts.undoShortcut turns the keys off', async () => {
    const { w, rows } = make()
    await flushPromises()
    await editCell(w, 1, 'name', 'Zed')
    await cell(w, 2, 'name').trigger('dblclick')
    await settle()
    await press(input(w).element, { key: 'z', ctrlKey: true })
    expect(rows[0]!.name).toBe('Zed') // not undone
    await input(w).trigger('keydown', { key: 'Escape' })
    w.unmount()
    const off = make({ parts: { undoShortcut: false } })
    await flushPromises()
    await editCell(off.w, 1, 'name', 'Zed')
    await press(cell(off.w, 1, 'name').element, { key: 'z', ctrlKey: true })
    expect(off.rows[0]!.name).toBe('Zed')
    expect(await api(off.w).undo()).toBe(true) // the method still works
    off.w.unmount()
  })

  it('the toolbar gets undo / redo and whether they can run', async () => {
    const { w } = make(
      {},
      {
        toolbar: (s: { undo: () => void; canUndo: boolean; canRedo: boolean }) =>
          h('button', { class: 'undo', disabled: !s.canUndo, onClick: () => s.undo() }, 'Undo'),
      },
    )
    await flushPromises()
    expect(w.find('button.undo').attributes('disabled')).toBeDefined()
    await editCell(w, 1, 'name', 'Zed')
    expect(w.find('button.undo').attributes('disabled')).toBeUndefined()
    await w.find('button.undo').trigger('click')
    await flushPromises()
    expect(w.find('button.undo').attributes('disabled')).toBeDefined()
    w.unmount()
  })
})
