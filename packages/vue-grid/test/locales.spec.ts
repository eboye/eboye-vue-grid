import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VGridComponent from '../src/components/VGrid.vue'
import { allFeatures } from '../src/features'
import { de } from '../src/locales/de'
import { en } from '../src/locales/en'
import { es } from '../src/locales/es'
import { fr } from '../src/locales/fr'
import { it as itPack } from '../src/locales/it'
import { ja } from '../src/locales/ja'
import { nl } from '../src/locales/nl'
import { pl } from '../src/locales/pl'
import { ptBR } from '../src/locales/pt-BR'
import { sr } from '../src/locales/sr'
import { srLatn } from '../src/locales/sr-Latn'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'
import type { GridMessages } from '../src/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any
const packs: Record<string, GridMessages> = {
  en,
  de,
  fr,
  es,
  it: itPack,
  ptBR,
  nl,
  pl,
  ja,
  sr,
  srLatn,
}

/** Texts that take a column's name. */
const columnTexts = new Set([
  'columnMenu',
  'groupBy',
  'resizeColumn',
  'filterColumn',
  'filterColumnActive',
  'filterCondition',
  'filterFrom',
  'filterTo',
  'editCell',
])

/** Sample arguments for every text that takes some. */
function call(fn: (...args: never[]) => string, name: string): string[] {
  const out: string[] = []
  const samples: unknown[][] =
    name === 'rowCount'
      ? [
          ['1', undefined, 1, undefined],
          ['5', '20', 5, 20],
        ]
      : name === 'selectedCount'
        ? [
            ['1', false, 1],
            ['1.234', true, 1234],
          ]
        : name === 'sortPosition'
          ? [[1, 'asc', 2]]
          : name === 'editOutOfRange'
            ? [
                [0, 10],
                [0, undefined],
                [undefined, 10],
              ]
            : name === 'filterSummary' || name === 'pageSummary'
              ? [['A', 'B', 'C']]
              : name === 'findCount'
                ? [['1', '12', 12]]
                : name === 'replacedCount'
                  ? [
                      [3, 0],
                      [1, 2],
                    ]
                  : columnTexts.has(name)
                    ? [['Stake']]
                    : [[1], [2], [5], [1234]]
  for (const args of samples) out.push((fn as (...a: unknown[]) => string)(...args))
  return out
}

describe('language packs', () => {
  const keys = Object.keys(en).sort()

  it.each(Object.entries(packs))('%s has every text, and none left blank', (_, pack) => {
    expect(Object.keys(pack).sort()).toEqual(keys)
    for (const [name, text] of Object.entries(pack)) {
      const outputs = typeof text === 'function' ? call(text, name) : [text as string]
      for (const s of outputs) {
        expect(s.trim(), name).not.toBe('')
        expect(s, name).not.toMatch(/undefined|NaN|#|\$\{/)
      }
    }
  })

  it('counts follow the language’s plural rules', () => {
    const rowsIn = (pack: GridMessages, n: number) =>
      pack.rowCount!(String(n), undefined, n, undefined)
    expect([1, 2, 5, 21, 22, 25].map((n) => rowsIn(srLatn, n))).toEqual([
      '1 red',
      '2 reda',
      '5 redova',
      '21 red',
      '22 reda',
      '25 redova',
    ])
    expect(rowsIn(sr, 3)).toBe('3 реда')
    expect([1, 2].map((n) => rowsIn(de, n))).toEqual(['1 Zeile', '2 Zeilen'])
    expect([0, 1, 2].map((n) => rowsIn(fr, n))).toEqual(['0 ligne', '1 ligne', '2 lignes'])
    // filtered: the noun agrees with the total
    expect(srLatn.rowCount!('3', '22', 3, 22)).toBe('3 od 22 reda')
    expect(en.rowCount!('1', '1', 1, 1)).toBe('1 of 1 row')
    expect(de.groupRowCount!(1234)).toBe('1.234 Zeilen')
    // Polish: one / few / many (12–14 are "many", 22–24 "few" again)
    expect([1, 2, 5, 12, 22, 25].map((n) => rowsIn(pl, n))).toEqual([
      '1 wiersz',
      '2 wiersze',
      '5 wierszy',
      '12 wierszy',
      '22 wiersze',
      '25 wierszy',
    ])
    expect(pl.cellCount!(3)).toBe('3 komórki')
    // Japanese: no plural forms, a counter
    expect([1, 5].map((n) => rowsIn(ja, n))).toEqual(['1 行', '5 行'])
    expect([1, 2].map((n) => rowsIn(ptBR, n))).toEqual(['1 linha', '2 linhas'])
    expect([1, 2].map((n) => rowsIn(itPack, n))).toEqual(['1 riga', '2 righe'])
    expect([1, 2].map((n) => rowsIn(nl, n))).toEqual(['1 rij', '2 rijen'])
  })

  it('en is the built-in text: a grid looks the same with it as without', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      city: ['Niš', 'Beograd', 'Novi Sad'][i % 3],
      stake: (i + 1) * 10,
    }))
    const columns = [
      { key: 'name', header: 'Player', sortable: true, filterable: true },
      { key: 'city', header: 'City', filterable: true, groupable: true },
      { key: 'stake', header: 'Stake', renderer: 'number', aggregate: 'sum' },
    ]
    const render = async (messages?: GridMessages) => {
      const w = mount(VGrid, {
        global: {
          plugins: [createVueGrid({ renderers: allRenderers, features: allFeatures })],
        },
        props: {
          rows,
          columns,
          rowKey: 'id',
          selectable: true,
          selected: [2, 3],
          filterRow: true,
          totals: true,
          pagination: { pageSizes: [10, 25] },
          pageSize: 10,
          statusBar: { summary: ['stake'] },
          sorts: [
            { key: 'name', dir: 'asc' },
            { key: 'city', dir: 'desc' },
          ],
          multiSort: true,
          messages,
        },
      })
      await flushPromises()
      await vi.waitFor(() => expect(w.find('.vg-status-bar').text()).not.toBe(''))
      // ids differ between mounts; everything else must match
      const html = w.html().replace(/(id|aria-controls|aria-describedby|for)="[^"]*"/g, '')
      w.unmount()
      return html
    }
    expect(await render(en)).toBe(await render())
  })
})
