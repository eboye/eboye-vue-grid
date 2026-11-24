// A Model Context Protocol server over stdio (newline-delimited JSON-RPC 2.0), with no SDK: the
// protocol surface a docs-and-validation server needs is small — initialize, ping, tools and
// resources — so it ships without dependencies besides @nocopypaste/vue-grid itself.
import { createInterface } from 'node:readline'
import { loadDocs } from './docs.js'
import { resources, tools } from './tools.js'

const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05']
const NAME = 'vue-grid'

const INSTRUCTIONS =
  'Tools for @nocopypaste/vue-grid (<VGrid>, a Vue 3 data grid). Before writing or editing grid code, call ' +
  'vue_grid_guide once (rules + recipes). Look up exact props / column options / renderer options with ' +
  'vue_grid_api and vue_grid_renderer instead of guessing, and run vue_grid_validate on the grid config ' +
  'you wrote: options whose feature is not registered silently do nothing.'

/**
 * Handles one JSON-RPC message; returns the response (or undefined for notifications).
 * Exported for tests.
 */
export async function handle(message, docs, version) {
  const { id, method, params = {} } = message
  const reply = (result) => (id === undefined ? undefined : { jsonrpc: '2.0', id, result })
  const fail = (code, msg) =>
    id === undefined ? undefined : { jsonrpc: '2.0', id, error: { code, message: msg } }
  try {
    switch (method) {
      case 'initialize': {
        const requested = params.protocolVersion
        return reply({
          protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[0],
          capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
          serverInfo: { name: NAME, title: '@nocopypaste/vue-grid', version },
          instructions: INSTRUCTIONS,
        })
      }
      case 'ping':
        return reply({})
      case 'tools/list':
        return reply({
          tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({
            name,
            title,
            description,
            inputSchema,
            annotations,
          })),
        })
      case 'tools/call': {
        const tool = tools.find((t) => t.name === params.name)
        if (!tool) return fail(-32602, `Unknown tool: ${params.name}`)
        try {
          const text = await tool.run(docs, params.arguments ?? {})
          return reply({ content: [{ type: 'text', text }] })
        } catch (error) {
          // tool errors are results the model can read and act on, not protocol errors
          return reply({
            content: [{ type: 'text', text: String(error?.message ?? error) }],
            isError: true,
          })
        }
      }
      case 'resources/list':
        return reply({
          resources: resources(docs).map(({ uri, name, title, mimeType }) => ({
            uri,
            name,
            title,
            mimeType,
          })),
        })
      case 'resources/read': {
        const r = resources(docs).find((x) => x.uri === params.uri)
        if (!r) return fail(-32602, `Unknown resource: ${params.uri}`)
        return reply({ contents: [{ uri: r.uri, mimeType: r.mimeType, text: r.text() }] })
      }
      case 'resources/templates/list':
        return reply({ resourceTemplates: [] })
      case 'prompts/list':
        return reply({ prompts: [] })
      default:
        if (method?.startsWith('notifications/')) return undefined
        return fail(-32601, `Method not found: ${method}`)
    }
  } catch (error) {
    return fail(-32603, String(error?.message ?? error))
  }
}

/** Runs the server on stdin / stdout. Logs go to stderr (stdout is the protocol). */
export async function serve({
  input = process.stdin,
  output = process.stdout,
  cwd = process.cwd(),
} = {}) {
  const docs = await loadDocs(cwd)
  const version = docs.version
  process.stderr.write(`[vue-grid-mcp] @nocopypaste/vue-grid ${version} from ${docs.dir}\n`)
  const lines = createInterface({ input, crlfDelay: Infinity })
  for await (const line of lines) {
    if (!line.trim()) continue
    let message
    try {
      message = JSON.parse(line)
    } catch {
      output.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        }) + '\n',
      )
      continue
    }
    const batch = Array.isArray(message) ? message : [message]
    for (const m of batch) {
      const response = await handle(m, docs, version)
      if (response) output.write(JSON.stringify(response) + '\n')
    }
  }
}
