import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { api, validateGridConfig, type Diagnostic } from '../src/agent'
import { allFeatures } from '../src/features'
import { allRenderers } from '../src/renderers'

const root = resolve(__dirname, '..')
const find = (ds: Diagnostic[], path: string) => ds.filter((d) => d.path === path)
const columns = [
  { key: 'id', header: '#', width: 'min-content' },
  { key: 'customer', field: 'customer.name', sortable: true },
  { key: 'total', renderer: 'currency', rendererOptions: { currency: 'EUR' }, aggregate: 'sum' },
]

it('rejects invalid pinned-row keys without rejecting a valid mixed-key array', () => {
  const config = { rowKey: 'id', columns, features: ['rowPinningFeature'] }
  expect(validateGridConfig({ ...config, pinnedRows: { top: [42, '42'] } }).ok).toBe(true)
  const { diagnostics } = validateGridConfig({ ...config, pinnedRows: { top: 42, bottom: [{}] } })
  expect(find(diagnostics, 'props.pinnedRows.top')[0]?.severity).toBe('error')
  expect(find(diagnostics, 'props.pinnedRows.bottom')[0]?.severity).toBe('error')
})

describe('agent API reference (generated)', () => {
  it('is up to date with the sources', { timeout: 30_000 }, async () => {
    // The generator runs in a separate Node process and can take over 5 seconds on CI.
    await promisify(execFile)(process.execPath, ['scripts/gen-agent.mjs', '--check'], {
      cwd: root,
      timeout: 25_000,
    })
  })

  it('covers every feature and renderer the package exports', () => {
    expect(api.features.map((f) => f.id).sort()).toEqual(allFeatures.map((f) => f.feature).sort())
    expect(api.renderers.map((r) => r.name).sort()).toEqual(allRenderers.map((r) => r.name).sort())
  })

  it('documents every prop, model, event, slot and column option', () => {
    const undocumented = [
      ...api.props,
      ...api.models,
      ...api.events,
      ...api.slots,
      ...api.column,
      ...api.methods,
    ]
      .filter((m) => !m.description)
      .map((m) => m.name)
    expect(undocumented).toEqual([])
  })

  it('documents every renderer option and every field of the public types', () => {
    const options = api.renderers.flatMap((r) =>
      r.options.filter((o) => !o.description).map((o) => `${r.name}.${o.name}`),
    )
    const fields = Object.entries(api.types).flatMap(([type, ms]) =>
      ms.filter((m) => !m.description).map((m) => `${type}.${m.name}`),
    )
    expect([...options, ...fields]).toEqual([])
  })

  it('ships the agent files in the package', () => {
    const pkg = JSON.parse(readFileSync(`${root}/package.json`, 'utf8'))
    expect(pkg.files).toEqual(
      expect.arrayContaining(['AGENTS.md', 'llms.txt', 'llms-full.txt', 'agent']),
    )
    expect(pkg.exports['./agent']).toBeTruthy()
    const schema = JSON.parse(readFileSync(`${root}/agent/grid-config.schema.json`, 'utf8'))
    expect(schema.required).toEqual(['columns', 'rowKey'])
    expect(schema.$defs.ColumnDef.properties.aggregate).toBeTruthy()
    expect(schema.properties.features.items.enum).toContain('sortingFeature')
    const llms = readFileSync(`${root}/llms.txt`, 'utf8')
    expect(llms).toMatch(/^# @nocopypaste\/vue-grid/)
  })
})

describe('validateGridConfig', () => {
  const base = {
    rowKey: 'id',
    columns,
    features: ['sortingFeature', 'aggregationFeature'],
    renderers: ['currencyRenderer'],
    sortMode: 'client',
    totals: true,
  }

  it('passes a correct config', () => {
    const r = validateGridConfig(base)
    expect(r.diagnostics).toEqual([])
    expect(r.ok).toBe(true)
  })

  it('accepts the function string used in JSON server-data configurations', () => {
    const result = validateGridConfig({
      ...base,
      features: ['serverDataFeature'],
      dataSource: 'async () => ({ rows: [] })',
    })
    expect(result.ok).toBe(true)
    expect(find(result.diagnostics, 'props.dataSource')).toEqual([])
  })

  it('requires rowKey and columns; flags duplicate keys', () => {
    const r = validateGridConfig({ columns: [{ key: 'a' }, { key: 'a' }], features: [] })
    expect(r.ok).toBe(false)
    expect(find(r.diagnostics, 'rowKey')[0]!.severity).toBe('error')
    expect(find(r.diagnostics, 'columns[1].key')[0]!.message).toMatch(/Duplicate/)
    expect(validateGridConfig({ rowKey: 'id', features: [] }).diagnostics[0]!.path).toBe('columns')
  })

  it('catches unknown column options and renderer options, with suggestions', () => {
    const r = validateGridConfig({
      ...base,
      columns: [
        { key: 'a', sortabel: true, rendererOptions: { elipsis: true } },
        { key: 'b', renderer: 'currency', rendererOptions: { curency: 'EUR' } },
      ],
    })
    expect(find(r.diagnostics, 'columns[0].sortabel')[0]!.fix).toMatch(/`sortable`/)
    expect(find(r.diagnostics, 'columns[0].rendererOptions.elipsis')[0]!.fix).toMatch(/`ellipsis`/)
    expect(find(r.diagnostics, 'columns[1].rendererOptions.curency')[0]!.fix).toMatch(/`currency`/)
  })

  it('warns when an option needs a feature that is not registered', () => {
    const r = validateGridConfig({
      ...base,
      features: [],
      selectable: true,
      columns: [{ key: 'a', pinned: 'left', sortable: true }],
    })
    const fixes = r.diagnostics.filter((d) => d.severity === 'warning').map((d) => d.fix)
    expect(fixes).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/selectionFeature/),
        expect.stringMatching(/columnPinningFeature/),
        expect.stringMatching(/sortingFeature/),
      ]),
    )
    // opt-outs don't need the feature
    expect(
      validateGridConfig({
        ...base,
        totals: false,
        columns: [{ key: 'a', pinnable: false, resizable: false }],
      }).diagnostics,
    ).toEqual([])
    // allFeatures covers everything
    expect(
      validateGridConfig({
        ...base,
        features: ['allFeatures'],
        columns: [
          { key: 'a', pinned: 'left', group: 'G' },
          { key: 'b', groupPath: [{ key: 'g', label: 'Group' }] },
        ],
      }).ok,
    ).toBe(true)
    expect(
      find(
        validateGridConfig({
          ...base,
          columns: [{ key: 'a', groupPath: [{ key: 'g', label: 'Group' }] }],
        }).diagnostics,
        'columns[0].groupPath',
      )[0]?.message,
    ).toContain('columnGroupsFeature')
  })

  it('flags unknown and unregistered renderers', () => {
    const r = validateGridConfig({
      ...base,
      renderers: [],
      columns: [
        { key: 'a', renderer: 'currency' },
        { key: 'b', renderer: 'curency' },
      ],
    })
    expect(find(r.diagnostics, 'columns[0].renderer')[0]).toMatchObject({
      severity: 'warning',
      fix: expect.stringMatching(/currencyRenderer/),
    })
    expect(find(r.diagnostics, 'columns[1].renderer')[0]).toMatchObject({
      severity: 'error',
      fix: expect.stringMatching(/`currency`/),
    })
  })

  it('checks value types and enums', () => {
    const r = validateGridConfig({
      ...base,
      selectable: 'true',
      density: 'tiny',
      virtual: { overscan: 2 },
      columns: [{ key: 'a', width: 120, align: 'right', aggregate: 'total' }],
    })
    expect(find(r.diagnostics, 'columns[0].width')[0]!.fix).toMatch(/'120px'/)
    expect(find(r.diagnostics, 'columns[0].align')[0]!.fix).toMatch(/'end'/)
    expect(find(r.diagnostics, 'columns[0].aggregate')[0]!.severity).toBe('error')
    expect(find(r.diagnostics, 'props.selectable').some((d) => /string/.test(d.message))).toBe(true)
    expect(find(r.diagnostics, 'props.density')[0]!.severity).toBe('error')
    expect(find(r.diagnostics, 'props.virtual').some((d) => /rowHeight/.test(d.fix ?? ''))).toBe(
      true,
    )
  })

  it('accepts template spellings (kebab-case, v-model:, :prop, @event) and flags unknown ones', () => {
    const r = validateGridConfig({
      ...base,
      'row-key': 'id',
      'v-model:pinned-rows': { top: [1] },
      ':sort-mode': 'client',
      '@row-click': true,
      '@rowclick': true,
      filterRows: true,
      features: [...base.features, 'rowPinningFeature'],
    })
    expect(r.diagnostics.map((d) => d.path)).toEqual(['@rowclick', 'props.filterRows'])
    expect(find(r.diagnostics, 'props.filterRows')[0]!.fix).toMatch(/filterRow/)
  })

  it('explains combinations that look right but do nothing', () => {
    const controlled = validateGridConfig({ ...base, sortMode: undefined })
    expect(find(controlled.diagnostics, 'props.sortMode')[0]!.fix).toMatch(/sort-mode="client"/)
    const noAggregates = validateGridConfig({ ...base, columns: [{ key: 'a' }] })
    expect(find(noAggregates.diagnostics, 'props.totals')[0]!.severity).toBe('warning')
    const virtualPaged = validateGridConfig({
      ...base,
      features: ['allFeatures'],
      virtual: { rowHeight: 40 },
      pagination: true,
    })
    expect(find(virtualPaged.diagnostics, 'props.pagination')[0]!.message).toMatch(/ignored/)
    const both = validateGridConfig({
      ...base,
      features: ['allFeatures'],
      dataSource: () => null,
      rows: [],
    })
    expect(find(both.diagnostics, 'props.rows')[0]!.severity).toBe('warning')
  })

  it('reports unknown features with suggestions', () => {
    const r = validateGridConfig({ ...base, features: ['sortFeature', { feature: 'filtering' }] })
    expect(find(r.diagnostics, 'features[0]')[0]!.fix).toMatch(/sortingFeature/)
    expect(r.diagnostics.some((d) => d.path === 'features[1]')).toBe(false)
  })
})
