// Talks to the real server process over stdio, as an MCP client would.
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('../bin/vue-grid-mcp.js', import.meta.url))
let child
let nextId = 1
const pending = new Map()

function request(method, params) {
  const id = nextId++
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
  return new Promise((resolve) => pending.set(id, resolve))
}
const call = async (name, args = {}) => (await request('tools/call', { name, arguments: args })).result

before(() => {
  child = spawn(process.execPath, [bin], { stdio: ['pipe', 'pipe', 'pipe'] })
  createInterface({ input: child.stdout }).on('line', (line) => {
    const msg = JSON.parse(line)
    pending.get(msg.id)?.(msg)
    pending.delete(msg.id)
  })
})
after(() => child.kill())

test('initialize negotiates the protocol and names the server', async () => {
  const { result } = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } })
  assert.equal(result.protocolVersion, '2025-06-18')
  assert.equal(result.serverInfo.name, 'vue-grid')
  assert.match(result.instructions, /vue_grid_guide/)
  assert.ok(result.capabilities.tools && result.capabilities.resources)
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
  const old = await request('initialize', { protocolVersion: '1999-01-01' })
  assert.equal(old.result.protocolVersion, '2025-06-18') // unknown → latest supported
})

test('lists five read-only tools with input schemas', async () => {
  const { result } = await request('tools/list')
  assert.deepEqual(result.tools.map((t) => t.name), ['vue_grid_guide', 'vue_grid_api', 'vue_grid_renderer', 'vue_grid_search_docs', 'vue_grid_validate'])
  for (const t of result.tools) {
    assert.equal(t.inputSchema.type, 'object')
    assert.equal(t.annotations.readOnlyHint, true)
  }
})

test('guide returns AGENTS.md', async () => {
  const r = await call('vue_grid_guide')
  assert.match(r.content[0].text, /^# @nocopypaste\/vue-grid — guide for coding agents/)
})

test('api: index, a section entry, a search by name, and errors as tool results', async () => {
  const index = JSON.parse((await call('vue_grid_api')).content[0].text)
  assert.ok(index.sections.features.includes('sortingFeature'))
  const agg = JSON.parse((await call('vue_grid_api', { section: 'column', name: 'aggregate' })).content[0].text)
  assert.equal(agg.feature, 'aggregation')
  const pinned = JSON.parse((await call('vue_grid_api', { name: 'v-model:pinned-rows' })).content[0].text)
  assert.equal(pinned[0].section, 'models')
  const bad = await call('vue_grid_api', { section: 'nope' })
  assert.equal(bad.isError, true)
})

test('renderer: details with an example, list, unknown', async () => {
  const r = (await call('vue_grid_renderer', { name: 'currencyRenderer' })).content[0].text
  assert.match(r, /"name": "currency"/)
  assert.match(r, /renderer: currencyRenderer/)
  assert.match((await call('vue_grid_renderer')).content[0].text, /- status \(statusRenderer\)/)
  const unknown = await call('vue_grid_renderer', { name: 'curency' })
  assert.equal(unknown.isError, true)
})

test('search finds the relevant sections', async () => {
  const text = (await call('vue_grid_search_docs', { query: 'lazy sub rows', limit: 3 })).content[0].text
  assert.match(text, /load-sub-rows|loadSubRows/)
  assert.match((await call('vue_grid_search_docs', { query: 'zzqqxx' })).content[0].text, /No section/)
})

test('validate returns diagnostics with fixes', async () => {
  const text = (
    await call('vue_grid_validate', {
      config: { 'row-key': 'id', columns: [{ key: 'total', sortable: true, renderer: 'currency', with: '8rem' }], features: [] },
    })
  ).content[0].text
  assert.match(text, /^NOT OK/)
  assert.match(text, /sortingFeature/)
  assert.match(text, /Did you mean `width`/)
  assert.match(text, /currencyRenderer/)
})

test('resources list and read', async () => {
  const { result } = await request('resources/list')
  assert.ok(result.resources.some((r) => r.uri === 'vue-grid://api.json'))
  const read = await request('resources/read', { uri: 'vue-grid://grid-config.schema.json' })
  assert.equal(JSON.parse(read.result.contents[0].text).required[0], 'columns')
})

test('unknown methods and bad JSON are protocol errors', async () => {
  const r = await request('nope/nope')
  assert.equal(r.error.code, -32601)
  assert.deepEqual((await request('ping')).result, {})
})

test('CLI: validate a config file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vgm-'))
  const file = join(dir, 'grid.json')
  writeFileSync(file, JSON.stringify({ rowKey: 'id', columns: [{ key: 'a', width: 120 }], features: [] }))
  const run = spawnSync(process.execPath, [bin, 'validate', file], { encoding: 'utf8' })
  assert.equal(run.status, 1)
  assert.match(run.stdout, /'120px'/)
  writeFileSync(file, JSON.stringify({ rowKey: 'id', columns: [{ key: 'a' }], features: [] }))
  assert.equal(spawnSync(process.execPath, [bin, 'validate', file], { encoding: 'utf8' }).status, 0)
})
