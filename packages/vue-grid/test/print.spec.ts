import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'
import type { VGridExposed } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

const data = [
  { id: 1, name: 'Ana', city: 'Niš', stake: 10 },
  { id: 2, name: 'Marko', city: 'Beograd', stake: 20.5 },
  { id: 3, name: 'Jelena', city: 'Niš', stake: 1000 },
]
const columns = [
  { key: 'name', header: 'Player', aggregate: 'count' },
  { key: 'city', header: 'City' },
  { key: 'stake', header: 'Stake', renderer: 'currency', aggregate: 'sum' },
  { key: 'actions', header: '', exportable: false, value: () => '⋯' },
]

/**
 * jsdom has no print dialog: catch the print frame as it's added, replace its `print()`, and keep
 * the document it would have printed.
 */
function capturePrint() {
  const printed: { doc: Document; frame: HTMLIFrameElement }[] = []
  const observer = new MutationObserver((records) => {
    for (const r of records)
      for (const node of r.addedNodes)
        if (node instanceof HTMLIFrameElement) {
          const frame = node
          frame.contentWindow!.print = () => {
            printed.push({ doc: frame.contentDocument!, frame })
          }
        }
  })
  observer.observe(document.body, { childList: true })
  return { printed, stop: () => observer.disconnect() }
}
let capture: ReturnType<typeof capturePrint> | undefined
afterEach(() => capture?.stop())

const texts = (root: ParentNode, selector: string) =>
  [...root.querySelectorAll(selector)].map((e) => e.textContent)

describe('grid.print (export feature)', () => {
  it('prints the filtered rows as a table: title, header, formatted cells, totals', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows: data,
        columns,
        rowKey: 'id',
        locale: 'en-US',
        currency: 'EUR',
        totals: true,
        sortMode: 'client',
        sort: { key: 'stake', dir: 'desc' },
        filters: { columns: { city: { type: 'text', op: 'equals', value: 'Niš' } }, search: '' },
      },
    })
    await flushPromises()
    capture = capturePrint()
    const done = (w.vm as unknown as VGridExposed).print({ title: 'Bets', totals: true })
    await vi.waitFor(() => expect(capture!.printed).toHaveLength(1))
    expect(capture.printed).toHaveLength(1)
    const { doc, frame } = capture.printed[0]!

    expect(doc.title).toBe('Bets')
    expect(doc.querySelector('h1')?.textContent).toBe('Bets')
    expect(texts(doc, 'thead th')).toEqual(['Player', 'City', 'Stake'])
    expect([...doc.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col'))
    // the filtered rows, sorted, as the cells show them; no action column
    expect([...doc.querySelectorAll('tbody tr:not(.total)')].map((tr) => texts(tr, 'td'))).toEqual([
      ['Jelena', 'Niš', '€1,000.00'],
      ['Ana', 'Niš', '€10.00'],
    ])
    // the totals print once, as the last row (a <tfoot> would repeat on every page)
    expect(texts(doc, 'tbody tr.total td')).toEqual(['2', '', '€1,010.00'])
    expect(doc.querySelector('tbody tr:last-child')!.className).toBe('total')
    expect(doc.querySelector('tfoot')).toBeNull()
    // numbers line up as in the grid
    expect(doc.querySelector('tbody td:nth-child(3)')!.className).toBe('end')
    expect(doc.querySelector('tbody td:nth-child(1)')!.className).toBe('')
    expect(doc.querySelector('style')!.textContent).toContain('@page')

    // printing is over when the page gets focus back: the frame goes, the promise settles
    expect(frame.isConnected).toBe(true)
    window.dispatchEvent(new Event('focus'))
    await done
    expect(frame.isConnected).toBe(false)
    w.unmount()
  })

  it('rows, columns and landscape options', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: { rows: data, columns, rowKey: 'id', selectable: true, selected: [2] },
    })
    await flushPromises()
    capture = capturePrint()
    const done = (w.vm as unknown as VGridExposed).print({
      rows: 'selected',
      columns: ['city', 'name'],
      landscape: true,
      header: false,
    })
    await vi.waitFor(() => expect(capture!.printed).toHaveLength(1))
    const { doc, frame } = capture.printed[0]!
    expect(doc.querySelector('thead')).toBeNull()
    expect(doc.querySelector('h1')).toBeNull()
    expect([...doc.querySelectorAll('tbody tr')].map((tr) => texts(tr, 'td'))).toEqual([
      ['Beograd', 'Marko'],
    ])
    expect(doc.querySelector('style')!.textContent).toContain('page: landscape')
    frame.contentWindow!.dispatchEvent(new Event('afterprint'))
    await done
    expect(frame.isConnected).toBe(false)
    w.unmount()
  })

  it('text is text: markup in a cell is not parsed', async () => {
    const w = mount(VGrid, {
      attachTo: document.body,
      props: {
        rows: [{ id: 1, name: '<img src=x onerror=alert(1)>' }],
        columns: [{ key: 'name' }],
        rowKey: 'id',
      },
    })
    await flushPromises()
    capture = capturePrint()
    const done = (w.vm as unknown as VGridExposed).print()
    await vi.waitFor(() => expect(capture!.printed).toHaveLength(1))
    const { doc } = capture.printed[0]!
    expect(doc.querySelector('tbody img')).toBeNull()
    expect(doc.querySelector('tbody td')!.textContent).toBe('<img src=x onerror=alert(1)>')
    window.dispatchEvent(new Event('focus'))
    await done
    w.unmount()
  })
})
