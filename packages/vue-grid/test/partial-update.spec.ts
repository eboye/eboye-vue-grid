import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, shallowRef, triggerRef } from 'vue'
import VGridComponent from '../src/components/VGrid.vue'
import { patchRows } from '../src/core/patch'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Row {
  id: number
  name: string
  score: number
  city: string
}

/** A renderer that counts how often each cell (row × column) renders. */
function counting() {
  const renders = new Map<string, number>()
  const Counter = defineComponent({
    props: ['value', 'row', 'rowKey', 'rowIndex', 'depth', 'column', 'options'],
    setup(props) {
      return () => {
        const id = `${props.rowKey}:${props.column.key}`
        renders.set(id, (renders.get(id) ?? 0) + 1)
        return h('span', String(props.value))
      }
    },
  })
  const reset = () => renders.clear()
  return { Counter, renders, reset }
}

const makeRows = (): Row[] =>
  Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Player ${i + 1}`,
    score: i,
    city: '—',
  }))

describe('partial updates re-render only what changed', () => {
  it('keeps default text, overflow tips, slots and configured text current across row replacements', async () => {
    const rows = reactive([{ id: 1, name: 'First', score: 1, city: 'North' }])
    const columns = [
      { key: 'name' },
      { key: 'score' },
      { key: 'city', rendererOptions: { secondary: (_value: unknown, row: Row) => row.name } },
    ]
    const w = mount(VGrid, {
      props: { rows, columns, rowKey: 'id', virtual: { rowHeight: 36 } },
      slots: { 'cell-score': ({ row }: { row: Row }) => h('strong', `${row.name} ${row.score}`) },
    })
    try {
      const name = () => w.get('[data-row-key="1"] > [data-col-key="name"] .vg-text')
      const score = () => w.get('[data-row-key="1"] > [data-col-key="score"]').text()
      const city = () => w.get('[data-row-key="1"] > [data-col-key="city"]').text()

      rows[0]!.name = 'Updated'
      await nextTick()
      expect(name().text()).toBe('Updated')
      expect(name().attributes('data-vg-tip')).toBe('Updated')
      expect(score()).toBe('Updated 1')
      expect(city()).toBe('North Updated')

      await w.setProps({ rows: [{ ...rows[0], name: 'Replaced', score: 2 }] })
      expect(name().text()).toBe('Replaced')
      expect(score()).toBe('Replaced 2')
      expect(city()).toBe('North Replaced')

      await w.setProps({ virtual: false })
      expect(name().classes()).not.toContain('vg-text-ellipsis')
      expect(name().attributes('data-vg-tip')).toBeUndefined()
    } finally {
      w.unmount()
    }
  })

  it('reactive rows: mutating one field re-renders exactly that cell', async () => {
    const { Counter, renders, reset } = counting()
    const rows = reactive(makeRows())
    const columns = ['name', 'score', 'city'].map((key) => ({ key, renderer: Counter }))
    mount(VGrid, { props: { rows, columns, rowKey: 'id' } })
    expect(renders.size).toBe(150) // initial: 50 rows × 3 columns
    reset()

    rows[9]!.city = 'Beograd' // enrich one field of row 10
    await nextTick()
    expect([...renders.keys()]).toEqual(['10:city'])
  })

  it('immutable updates (shallowRef + new array): only the replaced rows re-render', async () => {
    const { Counter, renders, reset } = counting()
    const rows = shallowRef(makeRows())
    const columns = ['name', 'score', 'city'].map((key) => ({ key, renderer: Counter }))
    const w = mount(VGrid, { props: { rows: rows.value, columns, rowKey: 'id' } })
    reset()

    // Enrich rows 3 and 7 with a new object each; every other row keeps its identity.
    rows.value = rows.value.map((r) => (r.id === 3 || r.id === 7 ? { ...r, city: 'Niš' } : r))
    await w.setProps({ rows: rows.value })
    expect([...renders.keys()].sort()).toEqual([
      '3:city',
      '3:name',
      '3:score',
      '7:city',
      '7:name',
      '7:score',
    ])
    reset()

    // Mutating in place under a shallowRef is NOT seen until the ref is triggered.
    rows.value[0]!.city = 'Subotica'
    triggerRef(rows)
    await nextTick()
    expect(renders.size).toBe(0) // the grid never saw a change: use a new array (or reactive rows)
  })

  it('patchRows + shallowRef: a batch of enrichment patches re-renders only the patched rows', async () => {
    const { Counter, renders, reset } = counting()
    const rows = shallowRef(makeRows())
    const columns = ['name', 'score', 'city'].map((key) => ({ key, renderer: Counter }))
    const w = mount(VGrid, { props: { rows: rows.value, columns, rowKey: 'id' } })
    reset()
    rows.value = patchRows(
      rows.value,
      [
        { id: 2, city: 'Novi Sad' },
        { id: 40, city: 'Kragujevac', score: 99 },
      ],
      'id',
    )
    await w.setProps({ rows: rows.value })
    expect(new Set([...renders.keys()].map((k) => k.split(':')[0]))).toEqual(new Set(['2', '40']))
    expect(w.find('[data-row-key="40"] > [data-col-key="city"]').text()).toBe('Kragujevac')
  })

  it('patchLoadedRows patches lazily loaded children inside the grid', async () => {
    const parents = [{ id: 'p', name: 'Parent', score: 0, city: '' }]
    const loadSubRows = async () => [
      { id: 'c1', name: 'Child 1', score: 1, city: '—' },
      { id: 'c2', name: 'Child 2', score: 2, city: '—' },
    ]
    const w = mount(VGrid, {
      props: {
        rows: parents,
        rowKey: 'id',
        loadSubRows,
        hasSubRows: () => true,
        columns: [{ key: 'name' }, { key: 'city' }],
      },
    })
    await w.find('.vg-expander').trigger('click')
    await flushPromises()
    const city = (key: string) => w.find(`[data-row-key="${key}"] > [data-col-key="city"]`).text()
    expect(city('c2')).toBe('—')
    const patched = (w.vm as unknown as VGridExposed).patchLoadedRows([
      { id: 'c2', city: 'Zrenjanin' },
      { id: 'nope', city: 'x' },
    ])
    await nextTick()
    expect(patched).toBe(1)
    expect(city('c2')).toBe('Zrenjanin')
    expect(city('c1')).toBe('—')
  })
})

describe('patchRows', () => {
  const rows = makeRows().slice(0, 3)

  it('replaces only patched rows, keeps identity elsewhere and for no-op patches', () => {
    const next = patchRows(rows, [{ id: 2, city: 'Niš' }], 'id')
    expect(next).not.toBe(rows)
    expect(next[0]).toBe(rows[0])
    expect(next[2]).toBe(rows[2])
    expect(next[1]).toEqual({ ...rows[1], city: 'Niš' })
    expect(rows[1]!.city).toBe('—') // input untouched
    expect(patchRows(rows, [{ id: 2, city: '—' }], 'id')).toBe(rows) // nothing changed → same array
    expect(patchRows(rows, [{ id: 99, city: 'x' }], 'id')).toBe(rows) // unknown key
  })

  it('accepts a Map, merges duplicate patches, ignores prototype keys, and recurses into children', () => {
    const viaMap = patchRows(rows, new Map([[3, { score: 7 }]]), 'id')
    expect(viaMap[2]!.score).toBe(7)
    const merged = patchRows(
      rows,
      [
        { id: 1, city: 'A' },
        { id: 1, score: 5 },
      ],
      (r) => r.id,
    )
    expect(merged[0]).toMatchObject({ city: 'A', score: 5 })
    const evil = patchRows(rows, [JSON.parse('{"id":1,"__proto__":{"polluted":true}}')], 'id')
    expect(evil).toBe(rows)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()

    interface Node {
      id: string
      label: string
      children?: Node[]
    }
    const tree: Node[] = [
      {
        id: 'a',
        label: 'A',
        children: [
          { id: 'a1', label: 'A1' },
          { id: 'a2', label: 'A2' },
        ],
      },
      { id: 'b', label: 'B' },
    ]
    const t2 = patchRows(tree, [{ id: 'a2', label: 'A2*' }], 'id', { children: 'children' })
    expect(t2[0]).not.toBe(tree[0])
    expect(t2[0]!.children![0]).toBe(tree[0]!.children![0])
    expect(t2[0]!.children![1]!.label).toBe('A2*')
    expect(t2[1]).toBe(tree[1])
  })
})

describe('flash (change highlight)', () => {
  const attrs = (w: ReturnType<typeof mount>, key: number | string, col: string) => {
    const el = w.find(`[data-row-key="${key}"] > [data-col-key="${col}"]`)
    return { n: el.attributes('data-vg-flash'), dir: el.attributes('data-vg-flash-dir') }
  }

  it('is off by default; with flash on, only changed cells flash and each change restarts it', async () => {
    const rows = reactive(makeRows().slice(0, 3))
    const columns = [{ key: 'name' }, { key: 'score' }, { key: 'city' }]
    const off = mount(VGrid, { props: { rows, columns, rowKey: 'id' } })
    rows[0]!.city = 'A'
    await nextTick()
    expect(attrs(off, 1, 'city').n).toBeUndefined()

    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', flash: true } })
    expect(w.findAll('[data-vg-flash]')).toHaveLength(0) // nothing flashes on first render
    rows[1]!.city = 'Niš'
    await nextTick()
    expect(attrs(w, 2, 'city')).toEqual({ n: '1', dir: undefined })
    expect(w.findAll('[data-vg-flash]')).toHaveLength(1) // only the changed cell (row 1 changed before mount)
    rows[1]!.city = 'Beograd'
    await nextTick()
    expect(attrs(w, 2, 'city').n).toBe('2') // alternates → the CSS animation restarts
    rows[1]!.city = 'Beograd' // same value: no flash
    await nextTick()
    expect(attrs(w, 2, 'city').n).toBe('2')
  })

  it("'direction' marks numeric increases and decreases; columns override the grid", async () => {
    const rows = reactive(makeRows().slice(0, 2))
    const columns = [
      { key: 'name', flash: false },
      { key: 'score', flash: 'direction' },
      { key: 'city' },
    ]
    const w = mount(VGrid, { props: { rows, columns, rowKey: 'id', flash: true } })
    rows[0]!.score = 10
    rows[1]!.score = -5
    rows[0]!.name = 'Renamed'
    rows[0]!.city = 'X'
    await nextTick()
    expect(attrs(w, 1, 'score').dir).toBe('up')
    expect(attrs(w, 2, 'score').dir).toBe('down')
    expect(attrs(w, 1, 'name').n).toBeUndefined() // column flash: false wins over the grid
    expect(attrs(w, 1, 'city')).toEqual({ n: '1', dir: undefined }) // grid flash: neutral tint
  })

  it('ignores re-fetched rows whose values are equal (new objects, same content)', async () => {
    const data = shallowRef(
      makeRows()
        .slice(0, 3)
        .map((r) => ({ ...r, meta: { tags: ['a'] } })),
    )
    const columns = [{ key: 'score' }, { key: 'meta' }]
    const w = mount(VGrid, { props: { rows: data.value, columns, rowKey: 'id', flash: true } })
    data.value = data.value.map((r) => ({ ...r, meta: { tags: ['a'] } })) // all new objects, same values
    await w.setProps({ rows: data.value })
    expect(w.findAll('[data-vg-flash]')).toHaveLength(0)
  })
})
