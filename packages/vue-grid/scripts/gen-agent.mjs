// Generates the agent-facing API reference from the TypeScript sources, so it can't drift:
//
//   src/agent/api.json                 every prop, v-model, event, slot, method, column option,
//                                      feature and renderer (with options), with types and docs
//   agent/api.md                       the same as Markdown (also inside llms-full.txt)
//   agent/grid-config.schema.json      JSON Schema of a grid config (props + columns + features)
//   llms-full.txt                      AGENTS.md + api.md + README.md, for LLM context
//
//   node scripts/gen-agent.mjs          write the files
//   node scripts/gen-agent.mjs --check  exit 1 if any file is out of date (tests run this)
//
// Sources: VGrid.vue (defineProps / withDefaults / defineModel / defineEmits / defineSlots),
// types.ts (ColumnDef, VGridExposed, option types), renderers/*.ts (definitions + option
// interfaces, resolved with the type checker), features/*.ts, and src/agent/requirements.ts.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse as parseSfc } from 'vue/compiler-sfc'
import { columnFeatures, featureExport, propFeatures } from '../src/agent/requirements.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (p) => join(root, 'src', p)
const check = process.argv.includes('--check')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const docOf = (node) => {
  const docs = node.jsDoc ?? []
  const text = docs
    .map((d) => ts.getTextOfJSDocComment(d.comment) ?? '')
    .join('\n')
    .trim()
  return text.replace(/\s*\n\s*/g, ' ')
}
// Multi-line type literals keep their member separators: `{ a: T\n b: U }` → `{ a: T; b: U }`.
const clean = (text) =>
  text
    .replace(/\/\*\*[\s\S]*?\*\//g, '')
    .replace(/([^\s{(,;|&])[ \t]*\n\s*(?=[\w'"[])/g, '$1; ')
    .replace(/\s+/g, ' ')
    .trim()
const nameOf = (member) => {
  const n = member.name
  return ts.isStringLiteral(n) || ts.isIdentifier(n) ? n.text : n.getText()
}

// ── VGrid.vue ────────────────────────────────────────────────────────────────────────────────
const sfc = parseSfc(readFileSync(src('components/VGrid.vue'), 'utf8')).descriptor
const setup = ts.createSourceFile(
  'VGrid.ts',
  sfc.scriptSetup.content,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)
const props = []
const models = []
const events = []
const slots = []
const typeArg = (call) => call.typeArguments?.[0]
const isCall = (node, name) =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name

function visit(node, statement) {
  if (isCall(node, 'withDefaults')) {
    const [definePropsCall, defaultsObj] = node.arguments
    const defaults = {}
    for (const p of defaultsObj.properties) {
      let init = p.initializer
      if (ts.isArrowFunction(init)) init = init.body
      defaults[nameOf(p)] = init.getText(setup)
    }
    for (const m of typeArg(definePropsCall).members) {
      const name = nameOf(m)
      props.push({
        name,
        type: clean(m.type.getText(setup)),
        required: !m.questionToken,
        default: defaults[name],
        description: docOf(m),
        feature: propFeatures[name],
      })
    }
  } else if (isCall(node, 'defineModel')) {
    const name = node.arguments[0].text
    const opts = node.arguments[1]
    let def
    for (const p of opts?.properties ?? []) {
      if (nameOf(p) === 'default') {
        let init = p.initializer
        if (ts.isArrowFunction(init)) init = init.body
        def = init.getText(setup)
      }
    }
    models.push({
      name,
      type: clean(typeArg(node).getText(setup)),
      default: def,
      description: statement ? docOf(statement) : '',
      feature: propFeatures[name],
    })
  } else if (isCall(node, 'defineEmits')) {
    for (const m of typeArg(node).members) {
      events.push({ name: nameOf(m), payload: clean(m.type.getText(setup)), description: docOf(m) })
    }
  } else if (isCall(node, 'defineSlots')) {
    for (const m of typeArg(node).members) {
      let name
      let fn
      if (ts.isIndexSignatureDeclaration(m)) {
        // [key: `cell-${string}`] → cell-<key>
        name = m.parameters[0].type.getText(setup).replace(/`/g, '').replace('${string}', '<key>')
        fn = m.type
      } else {
        name = nameOf(m)
        fn = m.type
      }
      const scope =
        ts.isFunctionTypeNode(fn) && fn.parameters[0]
          ? clean(fn.parameters[0].type.getText(setup))
          : null
      slots.push({ name, scope, description: docOf(m) })
    }
  }
  ts.forEachChild(node, (child) => visit(child, ts.isVariableStatement(node) ? node : statement))
}
visit(setup, undefined)

// ── types.ts, renderers, features (with the type checker) ────────────────────────────────────
const program = ts.createProgram(
  [
    src('types.ts'),
    src('renderers/index.ts'),
    src('renderers/text.ts'),
    ...readdirSync(src('features')).map((f) => src(`features/${f}`)),
  ],
  {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowImportingTsExtensions: true,
  },
)
const checker = program.getTypeChecker()
const file = (p) => program.getSourceFile(src(p))

function interfaceMembers(sourceFile, name) {
  const decl = sourceFile.statements.find(
    (s) => (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) && s.name.text === name,
  )
  if (!decl) throw new Error(`type ${name} not found`)
  return membersOfType(checker.getTypeAtLocation(decl.name))
}
function membersOfType(type) {
  return checker.getPropertiesOfType(type).map((p) => {
    const d = p.valueDeclaration ?? p.declarations?.[0]
    const declared = d && (ts.isPropertySignature(d) || ts.isMethodSignature(d)) ? d : null
    const typeText = declared?.type
      ? clean(declared.type.getText())
      : declared && ts.isMethodSignature(declared)
        ? clean(
            `(${declared.parameters.map((x) => x.getText()).join(', ')}) => ${declared.type?.getText() ?? 'void'}`,
          )
        : checker.typeToString(checker.getTypeOfSymbol(p))
    return {
      name: p.name,
      type: typeText,
      required: !(p.flags & ts.SymbolFlags.Optional),
      description: ts
        .displayPartsToString(p.getDocumentationComment(checker))
        .replace(/\s+/g, ' ')
        .trim(),
    }
  })
}

const column = interfaceMembers(file('types.ts'), 'ColumnDef').map((m) => ({
  ...m,
  feature: columnFeatures[m.name],
}))
const methods = interfaceMembers(file('types.ts'), 'VGridExposed').map((m) => ({
  ...m,
  feature:
    m.name === 'pinRow'
      ? 'rowPinning'
      : /filter/i.test(m.name)
        ? 'filtering'
        : m.name === 'reload'
          ? 'serverData'
          : undefined,
}))
const typeNames = [
  'VirtualOptions',
  'PinnedRowsState',
  'ColumnState',
  'SortState',
  'ColumnFilterOptions',
  'FilterOption',
  'MenuAction',
  'CellContext',
  'CellActionEvent',
  'CellClickEvent',
  'ContextActionEvent',
  'HeaderActionEvent',
  'VueGridConfig',
]
const types = Object.fromEntries(typeNames.map((n) => [n, interfaceMembers(file('types.ts'), n)]))
// shapes that renderer options take (a text cell's `hoverCard`, `badge`, `icon`)
for (const n of ['HoverCardSpec', 'HoverCardLine', 'BadgeSpec', 'IconSpec'])
  types[n] = interfaceMembers(file('renderers/options.ts'), n)

// Renderers: `export const xRenderer = defineCellRenderer<Options>({ name, align, filterType, defaults })`
const renderers = []
for (const sf of [file('renderers/text.ts'), file('renderers/index.ts')]) {
  for (const s of sf.statements) {
    if (
      !ts.isVariableStatement(s) ||
      !s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    )
      continue
    for (const d of s.declarationList.declarations) {
      const init = d.initializer
      if (!init || !isCall(init, 'defineCellRenderer')) continue
      const obj = init.arguments[0]
      const prop = (k) => obj.properties.find((p) => nameOf(p) === k)?.initializer
      const text = (k) => {
        const v = prop(k)
        return v && ts.isStringLiteral(v) ? v.text : undefined
      }
      const optionsType = init.typeArguments?.[0]
      renderers.push({
        name: text('name'),
        export: d.name.text,
        description: docOf(s),
        align: text('align') ?? 'start',
        filterType: text('filterType') ?? 'text',
        defaults: prop('defaults')?.getText(sf),
        options: optionsType ? membersOfType(checker.getTypeFromTypeNode(optionsType)) : [],
      })
    }
  }
}

// Features: `/** doc */ export const xFeature: XFeature = { feature: 'x', … }`
const features = []
for (const f of readdirSync(src('features')).sort()) {
  if (f === 'index.ts') continue
  const sf = file(`features/${f}`)
  for (const s of sf.statements) {
    if (!ts.isVariableStatement(s)) continue
    const d = s.declarationList.declarations[0]
    const obj = d.initializer
    if (!obj || !ts.isObjectLiteralExpression(obj)) continue
    const id = obj.properties.find((p) => nameOf(p) === 'feature')?.initializer.text
    features.push({
      id,
      export: d.name.text,
      description: docOf(s),
      props: [...props, ...models].filter((p) => p.feature === id).map((p) => p.name),
      columnOptions: column.filter((c) => c.feature === id).map((c) => c.name),
    })
  }
}
for (const id of new Set([...Object.values(propFeatures), ...Object.values(columnFeatures)])) {
  if (!features.some((f) => f.id === id))
    throw new Error(`requirements.ts names an unknown feature: ${id}`)
  if (featureExport(id) !== features.find((f) => f.id === id).export)
    throw new Error(`feature export name mismatch: ${id}`)
}
for (const name of [...Object.keys(propFeatures)]) {
  if (![...props, ...models].some((p) => p.name === name))
    throw new Error(`requirements.ts: no grid prop "${name}"`)
}
for (const name of Object.keys(columnFeatures)) {
  if (!column.some((c) => c.name === name))
    throw new Error(`requirements.ts: no column option "${name}"`)
}

const api = {
  package: pkg.name,
  version: pkg.version,
  component: 'VGrid',
  props,
  models,
  events,
  slots,
  methods,
  column,
  features,
  renderers,
  types,
}

// ── Markdown ─────────────────────────────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|')
const code = (s) => (s ? `\`${esc(s)}\`` : '')
const feat = (id) => (id ? `\`${featureExport(id)}\`` : '')
const table = (head, rows) =>
  [
    `| ${head.join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n')
const md = [
  `# ${pkg.name} ${pkg.version} — API reference`,
  '',
  '> Generated from the TypeScript sources (`scripts/gen-agent.mjs`). Machine-readable: `agent/api.json`, `agent/grid-config.schema.json`.',
  '',
  '## Features',
  '',
  'Opt-in: pass them as `:features="[…]"` on `<VGrid>` or once via `createVueGrid({ features })` (`allFeatures` = all). An option whose feature is missing does nothing.',
  '',
  table(
    ['Export', 'What it enables', 'Props', 'Column options'],
    features.map((f) => [
      code(f.export),
      esc(f.description),
      f.props.map(code).join(' '),
      f.columnOptions.map(code).join(' '),
    ]),
  ),
  '',
  '## `<VGrid>` props',
  '',
  table(
    ['Prop', 'Type', 'Default', 'Needs', 'Description'],
    props.map((p) => [
      code(p.name) + (p.required ? ' (required)' : ''),
      code(p.type),
      code(p.default),
      feat(p.feature),
      esc(p.description),
    ]),
  ),
  '',
  '## `v-model`s',
  '',
  table(
    ['Model', 'Type', 'Default', 'Needs', 'Description'],
    models.map((m) => [
      code(`v-model:${m.name}`),
      code(m.type),
      code(m.default),
      feat(m.feature),
      esc(m.description),
    ]),
  ),
  '',
  '## Events',
  '',
  table(
    ['Event', 'Payload', 'Description'],
    events.map((e) => [code(e.name), code(e.payload), esc(e.description)]),
  ),
  '',
  '## Slots',
  '',
  table(
    ['Slot', 'Scope', 'Description'],
    slots.map((s) => [code(s.name), code(s.scope), esc(s.description)]),
  ),
  '',
  '## Exposed methods (`ref<VGridExposed>()`)',
  '',
  table(
    ['Method', 'Signature', 'Needs', 'Description'],
    methods.map((m) => [code(m.name), code(m.type), feat(m.feature), esc(m.description)]),
  ),
  '',
  '## `ColumnDef<T>`',
  '',
  table(
    ['Option', 'Type', 'Needs', 'Description'],
    column.map((c) => [
      code(c.name) + (c.required ? ' (required)' : ''),
      code(c.type),
      feat(c.feature),
      esc(c.description),
    ]),
  ),
  '',
  '## Renderers',
  '',
  'Set `renderer` to the definition (`renderer: currencyRenderer`, tree-shakeable) or to a name registered with `createVueGrid({ renderers })` / `:renderers`; `rendererOptions` are typed against it. Option values marked `RowFn` / `RowOption` may also be `(value, row) => …`.',
  '',
  ...renderers.flatMap((r) => [
    `### \`${r.name}\` — \`${r.export}\``,
    '',
    `${r.description} Align: \`${r.align}\` · filter type: \`${r.filterType}\`${r.defaults ? ` · defaults: \`${r.defaults}\`` : ''}.`,
    '',
    r.options.length
      ? table(
          ['Option', 'Type', 'Description'],
          r.options.map((o) => [code(o.name), code(o.type), esc(o.description)]),
        )
      : '_No options._',
    '',
  ]),
  '## Types',
  '',
  ...Object.entries(types).flatMap(([name, members]) => [
    `### \`${name}\``,
    '',
    table(
      ['Field', 'Type', 'Description'],
      members.map((m) => [
        code(m.name) + (m.required ? '' : '?'),
        code(m.type),
        esc(m.description),
      ]),
    ),
    '',
  ]),
].join('\n')

// ── JSON Schema of a grid config ─────────────────────────────────────────────────────────────
// For checking configs an agent writes as data. Functions and components can't be JSON: they're
// described, not constrained.
function schemaOf(type) {
  const t = type.replace(/^readonly /, '')
  const parts = splitUnion(t)
  if (parts.length > 1) {
    const literals = parts.filter((p) => /^'[^']*'$/.test(p))
    const rest = parts.filter((p) => !/^'[^']*'$/.test(p)).map(schemaOf)
    const out = []
    if (literals.length) out.push({ enum: literals.map((l) => l.slice(1, -1)) })
    out.push(...rest)
    const uniq = out.filter(
      (s, i) => out.findIndex((x) => JSON.stringify(x) === JSON.stringify(s)) === i,
    )
    return uniq.length === 1
      ? uniq[0]
      : uniq.some((s) => Object.keys(s).length === 0)
        ? {}
        : { anyOf: uniq }
  }
  if (/=>/.test(t) || /^\(/.test(t)) return {}
  if (t === 'string' || /^`/.test(t)) return { type: 'string' }
  if (t === 'number') return { type: 'number' }
  if (t === 'boolean') return { type: 'boolean' }
  if (t === 'null' || t === 'undefined') return { type: 'null' }
  if (t === 'false') return { const: false }
  if (t === 'true') return { const: true }
  if (/^'[^']*'$/.test(t)) return { const: t.slice(1, -1) }
  if (/\[\]$/.test(t))
    return { type: 'array', items: schemaOf(t.slice(0, -2).replace(/^\((.*)\)$/, '$1')) }
  if (/^(Record|Partial<Record)/.test(t)) return { type: 'object' }
  if (types[t]) return objectSchema(types[t])
  if (t === 'Align') return { enum: ['start', 'center', 'end'] }
  if (t === 'PinSide') return { enum: ['left', 'right'] }
  if (t === 'Density') return { enum: ['compact', 'cozy', 'comfortable'] }
  if (t === 'FlashMode') return { anyOf: [{ type: 'boolean' }, { const: 'direction' }] }
  if (t === 'RowKey') return { type: ['string', 'number'] }
  if (t === 'AggregateName') return { enum: ['sum', 'avg', 'min', 'max', 'count'] }
  if (t === 'FilterType') return { enum: ['text', 'number', 'date', 'boolean', 'set'] }
  if (/^\{.*\}$/.test(t)) return { type: 'object' }
  return {}
}
function splitUnion(t) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of t) {
    if ('<({['.includes(ch)) depth++
    if ('>)}]'.includes(ch)) depth--
    if (ch === '|' && depth === 0) {
      out.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  out.push(cur.trim())
  return out.filter(Boolean)
}
function objectSchema(members, describe = true) {
  return {
    type: 'object',
    properties: Object.fromEntries(
      members.map((m) => [
        m.name,
        {
          ...schemaOf(m.type),
          ...(describe && m.description ? { description: m.description } : {}),
        },
      ]),
    ),
    required: members.filter((m) => m.required).map((m) => m.name),
    additionalProperties: false,
  }
}
const columnSchema = objectSchema(column)
columnSchema.properties.renderer = {
  description: `${column.find((c) => c.name === 'renderer').description} Built-in names: ${renderers.map((r) => r.name).join(', ')}.`,
  anyOf: [{ enum: renderers.map((r) => r.name) }, { type: 'string' }, { type: 'object' }],
}
const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://unpkg.com/${pkg.name}/agent/grid-config.schema.json`,
  title: `${pkg.name} grid config`,
  description:
    'A <VGrid> configuration as data: its props (camelCase), `columns` and the `features` it registers (export names, e.g. "sortingFeature"). Functions and components are allowed where the API takes them but are not checked. Validate fully with validateGridConfig() from @nocopypaste/vue-grid/agent.',
  type: 'object',
  properties: {
    ...objectSchema([...props, ...models]).properties,
    columns: {
      type: 'array',
      items: { $ref: '#/$defs/ColumnDef' },
      description: 'Column definitions.',
    },
    features: {
      type: 'array',
      items: { enum: ['allFeatures', ...features.map((f) => f.export)] },
      description: 'Registered features by export name (per grid and app-wide together).',
    },
  },
  required: ['columns', 'rowKey'],
  additionalProperties: false,
  $defs: { ColumnDef: columnSchema },
}

// ── llms-full.txt ────────────────────────────────────────────────────────────────────────────
const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8')
const readme = readFileSync(join(root, 'README.md'), 'utf8')
const full = [agents.trim(), md.trim(), `# README\n\n${readme.trim()}`].join('\n\n---\n\n') + '\n'

// ── write / check ────────────────────────────────────────────────────────────────────────────
const outputs = {
  'src/agent/api.json': JSON.stringify(api, null, 2) + '\n',
  // the same, as a plain file in the package (`@nocopypaste/vue-grid/agent/api.json`)
  'agent/api.json': JSON.stringify(api, null, 2) + '\n',
  'agent/api.md': md + '\n',
  'agent/grid-config.schema.json': JSON.stringify(schema, null, 2) + '\n',
  'llms-full.txt': full,
}
let stale = []
for (const [rel, content] of Object.entries(outputs)) {
  const path = join(root, rel)
  let current = null
  try {
    current = readFileSync(path, 'utf8')
  } catch {}
  if (current === content) continue
  if (check) stale.push(rel)
  else {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
    console.log('wrote', rel)
  }
}
if (check && stale.length) {
  console.error(`Out of date (run: node scripts/gen-agent.mjs): ${stale.join(', ')}`)
  process.exit(1)
}
if (!check)
  console.log(
    `${props.length} props, ${models.length} models, ${events.length} events, ${slots.length} slots, ${methods.length} methods, ${column.length} column options, ${features.length} features, ${renderers.length} renderers`,
  )
