import { afterEach, describe, expect, it, vi } from 'vitest'
import { config, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { setCellValue } from '../src/core/value'
import { keyboardNavigationFeature, rangeSelectionFeature } from '../src/features'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { CellEditEvent, CellsPasteEvent, ColumnDef, VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  city: string
  stake: number
}
const columns: ColumnDef<Row>[] = [
  { key: 'id', header: '#' },
  { key: 'name', header: 'Name', editable: true },
  { key: 'city', header: 'City', editable: (r) => r.id !== 4 },
  { key: 'stake', header: 'Stake', renderer: 'currency', editable: true },
]
const makeRows = () =>
  reactive<Row[]>([
    { id: 1, name: 'Ana Ilić', city: 'Niš', stake: 120 },
    { id: 2, name: 'Bojan', city: 'Beograd', stake: 20 },
    { id: 3, name: 'ANA', city: 'Novi Sad', stake: 1200 },
    { id: 4, name: 'Dana', city: 'Niš', stake: 12 },
  ])

/** Every grid a test mounts, unmounted after it (also when the test fails half-way). */
const mounted: VueWrapper[] = []
afterEach(() => {
  for (const w of mounted.splice(0)) if (w.exists()) w.unmount()
})

function make(props: Record<string, unknown> = {}) {
  const rows = makeRows()
  const w = mount(VGrid, {
    attachTo: document.body,
    props: {
      rows,
      columns,
      rowKey: 'id',
      rangeSelection: true,
      locale: 'en-US',
      currency: 'EUR',
      'onCell-edit': (e: CellEditEvent<Row>) => setCellValue(e.row, e.column, e.value),
      ...props,
    },
  })
  mounted.push(w)
  return { w, rows }
}
const api = (w: VueWrapper) => w.vm as unknown as VGridExposed
const cell = (w: VueWrapper, id: number, key: string) =>
  w.find(`[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const bar = () => document.querySelector<HTMLElement>('.vg-find')
const box = (role: 'find' | 'replace') =>
  document.querySelector<HTMLInputElement>(`.vg-find input[data-role="${role}"]`)!
const status = () => document.querySelector('.vg-find-status')!.textContent!.trim()
const matches = (w: VueWrapper) =>
  w
    .findAll('.vg-find-match')
    .map((c) => `${c.element.parentElement!.dataset.rowKey}:${c.attributes('data-col-key')}`)
const current = (w: VueWrapper) =>
  w
    .findAll('.vg-find-current')
    .map((c) => `${c.element.parentElement!.dataset.rowKey}:${c.attributes('data-col-key')}`)
async function open(w: VueWrapper, keyInit: KeyboardEventInit = { key: 'f', ctrlKey: true }) {
  cell(w, 1, 'id').element.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...keyInit }),
  )
  await vi.waitFor(() => expect(bar()).not.toBeNull()) // its own chunk
  await flushPromises()
}
async function type(role: 'find' | 'replace', text: string) {
  const input = box(role)
  input.value = text
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}
const key = async (el: Element, init: KeyboardEventInit) => {
  el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  await flushPromises()
  await flushPromises()
}

describe('find', () => {
  it('Ctrl+F opens the bar with focus in it; matches show, case-insensitive by default', async () => {
    const { w } = make()
    await open(w)
    expect(document.activeElement).toBe(box('find'))
    await type('find', 'ana')
    expect(matches(w)).toEqual(['1:name', '3:name', '4:name']) // Ana, ANA, Dana
    expect(current(w)).toEqual(['1:name'])
    expect(status()).toBe('1 of 3')
    await key(box('find'), { key: 'Enter' })
    expect(current(w)).toEqual(['3:name'])
    await key(box('find'), { key: 'Enter', shiftKey: true })
    await key(box('find'), { key: 'Enter', shiftKey: true }) // wraps to the last
    expect(current(w)).toEqual(['4:name'])
    w.unmount()
  })

  it('matches what the cell shows; Match case and Whole cell narrow it', async () => {
    const { w } = make()
    await open(w)
    await type('find', '1,200') // the stake shows as €1,200.00
    expect(matches(w)).toEqual(['3:stake'])
    await type('find', 'ANA')
    const [matchCase, whole] = document.querySelectorAll<HTMLInputElement>(
      '.vg-find-options input[type="checkbox"]',
    )
    matchCase!.click()
    await flushPromises()
    expect(matches(w)).toEqual(['3:name'])
    matchCase!.click()
    whole!.click()
    await flushPromises()
    expect(matches(w)).toEqual(['3:name']) // "ANA" alone, case-insensitive
    await type('find', 'zzz')
    expect(status()).toBe('No matches')
    w.unmount()
  })

  it('searches the selected range only, until "In selection" is unticked', async () => {
    const { w } = make()
    api(w).selectRange({
      start: { rowKey: 2, columnKey: 'name' },
      end: { rowKey: 4, columnKey: 'city' },
    })
    await flushPromises()
    await open(w)
    await type('find', 'n')
    expect(matches(w)).toEqual(['2:name', '3:name', '3:city', '4:name', '4:city'])
    const inSelection = [
      ...document.querySelectorAll<HTMLInputElement>('.vg-find-options input'),
    ].at(-1)!
    inSelection.click()
    await flushPromises()
    expect(matches(w)).toContain('1:name')
    w.unmount()
  })

  it('Esc closes it; the current match becomes the selected, focused cell', async () => {
    const { w } = make({ features: [rangeSelectionFeature, keyboardNavigationFeature] })
    await open(w)
    await type('find', 'beograd')
    await key(box('find'), { key: 'Escape' })
    expect(bar()).toBeNull()
    expect(w.findAll('.vg-find-match')).toHaveLength(0)
    expect(document.activeElement).toBe(cell(w, 2, 'city').element)
    w.unmount()
  })
})

describe('replace', () => {
  it('Replace all: every match, read as each column’s kind; read-only skipped; one undo', async () => {
    const { w, rows } = make()
    await open(w, { key: 'h', ctrlKey: true })
    await type('find', 'Niš')
    await type('replace', 'Nis')
    const all = [...document.querySelectorAll<HTMLButtonElement>('.vg-find button')].find(
      (b) => b.textContent!.trim() === 'Replace all',
    )!
    all.click()
    await vi.waitFor(() => expect(w.emitted('cells-replace')).toHaveLength(1))
    const result = w.emitted('cells-replace')![0]![0] as CellsPasteEvent<Row>
    expect(rows.map((r) => r.city)).toEqual(['Nis', 'Beograd', 'Novi Sad', 'Niš']) // row 4 read-only
    expect(result.edits.map((e) => [e.rowKey, e.source])).toEqual([[1, 'replace']])
    expect(result.skipped.map((s) => [s.rowKey, s.reason])).toEqual([[4, 'read-only']])
    expect(status()).toBe('1 replaced, 1 left as they were')
    // numbers: €120.00 → "€150.00" read back as a number
    await type('find', '120')
    await type('replace', '150')
    all.click()
    await vi.waitFor(() => expect(w.emitted('cells-replace')).toHaveLength(2))
    expect(rows[0]!.stake).toBe(150)
    expect(rows[2]!.stake).toBe(1200) // shows €1,200.00: no "120" in it
    expect(await api(w).undo()).toBe(true)
    expect(rows[0]!.stake).toBe(120)
    w.unmount()
  })

  it('Replace changes the current match and moves on', async () => {
    const { w, rows } = make()
    await open(w, { key: 'h', ctrlKey: true })
    await type('find', 'ana')
    await type('replace', 'Eva')
    expect(current(w)).toEqual(['1:name'])
    await key(box('replace'), { key: 'Enter' }) // Enter in the replace box: Replace
    await vi.waitFor(() => expect(rows[0]!.name).toBe('Eva Ilić'))
    await flushPromises()
    expect(current(w)).toEqual(['3:name'])
    expect(matches(w)).toEqual(['3:name', '4:name'])
    w.unmount()
  })

  it('without the editing feature, find only finds', async () => {
    const saved = config.global.plugins
    config.global.plugins = [
      createVueGrid({ renderers: allRenderers, features: [rangeSelectionFeature] }),
    ]
    const { w } = make()
    config.global.plugins = saved
    await open(w, { key: 'h', ctrlKey: true })
    expect(box('replace')).toBeNull()
    expect(document.querySelector('.vg-find .vg-link-button')).toBeNull() // no "Replace…"
    w.unmount()
  })
})
