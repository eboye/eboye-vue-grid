// The MCP tools: what each does, its input schema, and its handler (docs → text).

const SECTIONS = ['props', 'models', 'events', 'slots', 'methods', 'column', 'features', 'renderers', 'types']
const json = (value) => JSON.stringify(value, null, 2)

/** Search: score sections by query terms in title (×3) and body. */
function search(docs, query, limit) {
  const terms = query.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((t) => t.length > 1)
  if (!terms.length) return []
  return docs.sections
    .map((s) => {
      const title = s.title.toLowerCase()
      const body = s.text.toLowerCase()
      let score = 0
      for (const t of terms) {
        if (title.includes(t)) score += 3
        score += Math.min(body.split(t).length - 1, 5)
      }
      // prefer the agent guide and the generated reference over README prose on ties
      if (score > 0 && s.source === 'AGENTS.md') score += 0.5
      return { s, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s }) => s)
}

function findMember(api, section, name) {
  const list = section === 'types' ? Object.entries(api.types).map(([n, members]) => ({ name: n, members })) : api[section]
  const lower = name.toLowerCase().replace(/^v-model:/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase())
  return list.filter((m) => {
    const n = String(m.name ?? m.id).toLowerCase()
    return n === lower.toLowerCase() || n === name.toLowerCase() || String(m.export ?? '').toLowerCase() === name.toLowerCase()
  })
}

export const tools = [
  {
    name: 'vue_grid_guide',
    title: 'vue-grid: rules and recipes',
    description:
      'Start here before writing or changing <VGrid> code. Returns AGENTS.md for the installed @nocopypaste/vue-grid: the rules that cause silent bugs when skipped (register features, pass renderer definitions, sort-mode="client", bounded height), which feature / renderer to use for what, copy-paste recipes and pitfalls.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    run: (docs) => docs.files['AGENTS.md'],
  },
  {
    name: 'vue_grid_api',
    title: 'vue-grid: API reference lookup',
    description:
      'Exact API of <VGrid>, generated from the sources: props, v-models, events, slots, exposed methods, ColumnDef options, features (with the props / options each enables) and renderers (with every option), or the named types. Give `section` alone for the whole section, add `name` for one entry (e.g. section "column", name "aggregate"; section "props", name "virtual"; section "types", name "VirtualOptions"). With neither, returns an index.',
    inputSchema: {
      type: 'object',
      properties: {
        section: { type: 'string', enum: SECTIONS, description: 'Which part of the API.' },
        name: { type: 'string', description: 'One entry: a prop, event, slot, method, column option, feature id / export, renderer name / export or type name.' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    run: (docs, { section, name }) => {
      const { api } = docs
      if (!section && !name) {
        return json({
          package: api.package,
          version: api.version,
          sections: Object.fromEntries(
            SECTIONS.map((s) => [s, s === 'types' ? Object.keys(api.types) : api[s].map((m) => m.export ?? m.name)]),
          ),
          hint: 'Call again with section (and name) for details.',
        })
      }
      if (!section) {
        const hits = SECTIONS.flatMap((s) => findMember(api, s, name).map((m) => ({ section: s, ...m })))
        return hits.length ? json(hits) : `Nothing named "${name}". Call without arguments for the index.`
      }
      if (!SECTIONS.includes(section)) throw new Error(`Unknown section "${section}". Use one of: ${SECTIONS.join(', ')}.`)
      if (!name) return json(section === 'types' ? api.types : api[section])
      const hits = findMember(api, section, name)
      return hits.length ? json(hits.length === 1 ? hits[0] : hits) : `No ${section} entry named "${name}". Call with section "${section}" alone to list them.`
    },
  },
  {
    name: 'vue_grid_renderer',
    title: 'vue-grid: renderer details',
    description:
      'A cell renderer by name or export (e.g. "currency" or "currencyRenderer"): what it shows, its alignment and filter type, every rendererOption with its type and meaning, and a column example. Without a name, lists all renderers with one-line descriptions so you can pick by data type.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Renderer name or export name. Omit to list all.' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    run: (docs, { name }) => {
      const list = docs.api.renderers
      if (!name) return list.map((r) => `- ${r.name} (${r.export}): ${r.description}`).join('\n')
      const key = name.toLowerCase()
      const r = list.find((x) => x.name === key || x.export.toLowerCase() === key)
      if (!r) {
        const near = list.filter((x) => x.name.includes(key) || key.includes(x.name)).map((x) => x.name)
        throw new Error(`Unknown renderer "${name}".${near.length ? ` Did you mean ${near.join(', ')}?` : ''} Call without a name to list them.`)
      }
      const example = `import { ${r.export} } from '@nocopypaste/vue-grid'\n\ncol({ key: '…', renderer: ${r.export}${r.options[0] ? `, rendererOptions: { ${r.options[0].name}: … }` : ''} })`
      return `${json(r)}\n\nExample:\n${example}`
    },
  },
  {
    name: 'vue_grid_search_docs',
    title: 'vue-grid: search the docs',
    description:
      'Full-text search over the agent guide, the generated API reference and the README of the installed @nocopypaste/vue-grid. Returns the best matching sections in full (e.g. "lazy sub rows retry", "server data total", "theme dark mode tokens", "keyboard shortcuts").',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to look for.' },
        limit: { type: 'number', description: 'Sections to return (default 4, max 10).' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    run: (docs, { query, limit = 4 }) => {
      const hits = search(docs, String(query), Math.min(Math.max(1, Number(limit) || 4), 10))
      if (!hits.length) return `No section matches "${query}". Try other words, or vue_grid_api for exact names.`
      return hits.map((s) => `<!-- ${s.source} → ${s.title} -->\n${s.text}`).join('\n\n---\n\n')
    },
  },
  {
    name: 'vue_grid_validate',
    title: 'vue-grid: validate a grid config',
    description:
      'Checks a <VGrid> setup before you write or after you change it: pass its props (camelCase or kebab-case; "v-model:", ":" and "@" prefixes accepted), `columns`, and the `features` / `renderers` registered for it (per grid and app-wide together) as export names, e.g. ["sortingFeature"], ["currencyRenderer"]. Functions can be given as strings ("(row) => row.id"). Returns each problem with severity, path and the fix: unknown props / options (with did-you-mean), options whose feature is missing, unknown or unregistered renderers and options, wrong types and enums, and combinations that silently do nothing.',
    inputSchema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: 'The grid config: { rowKey, columns: [...], features: [...], renderers?: [...], ...props }.',
        },
      },
      required: ['config'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    run: (docs, { config }) => {
      const result = docs.validateGridConfig(config)
      const counts = ['error', 'warning', 'info'].map((s) => `${result.diagnostics.filter((d) => d.severity === s).length} ${s}(s)`)
      return `${result.ok ? 'OK' : 'NOT OK'}: ${counts.join(', ')}\n\n${json(result.diagnostics)}`
    },
  },
]

export const resources = (docs) => [
  { uri: 'vue-grid://AGENTS.md', name: 'AGENTS.md', title: 'vue-grid guide for coding agents', mimeType: 'text/markdown', text: () => docs.files['AGENTS.md'] },
  { uri: 'vue-grid://api.md', name: 'api.md', title: 'vue-grid API reference', mimeType: 'text/markdown', text: () => docs.files['agent/api.md'] },
  { uri: 'vue-grid://README.md', name: 'README.md', title: 'vue-grid README', mimeType: 'text/markdown', text: () => docs.files['README.md'] },
  { uri: 'vue-grid://api.json', name: 'api.json', title: 'vue-grid API reference (JSON)', mimeType: 'application/json', text: () => JSON.stringify(docs.api, null, 2) },
  { uri: 'vue-grid://grid-config.schema.json', name: 'grid-config.schema.json', title: 'JSON Schema of a grid config', mimeType: 'application/schema+json', text: () => docs.schema },
]
