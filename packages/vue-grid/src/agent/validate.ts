/* eslint-disable @typescript-eslint/no-explicit-any -- configs are untyped data here (written by an agent, parsed from JSON) */
import api from './api.json'
import {
  columnFeatures,
  featureExport,
  optOuts,
  propFeatures,
  type FeatureId,
} from './requirements'

export interface Diagnostic {
  /** `error`: wrong (TypeScript or Vue would reject it, or it can't work). `warning`: has no effect or likely not what you meant. `info`: worth knowing. */
  severity: 'error' | 'warning' | 'info'
  /** Where: `columns[2].renderer`, `props.virtual`, `features[0]`. */
  path: string
  message: string
  /** What to change. */
  fix?: string
}

export interface ValidationResult {
  /** No errors (warnings allowed). */
  ok: boolean
  diagnostics: Diagnostic[]
}

/**
 * A `<VGrid>` setup as data: its props (camelCase or kebab-case; `v-model:`, `:` and `@` prefixes
 * are accepted), `columns`, and the `features` / `renderers` registered for it — per grid and
 * app-wide together — as export names (`'sortingFeature'`, `'allFeatures'`), feature ids
 * (`'sorting'`) or the objects themselves.
 */
export interface GridConfigInput {
  columns?: unknown
  features?: unknown
  renderers?: unknown
  [prop: string]: unknown
}

type Severity = Diagnostic['severity']

const camel = (s: string) => s.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function distance(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!
      dp[j] = Math.min(
        dp[j]! + 1,
        dp[j - 1]! + 1,
        prev + (a[i - 1]!.toLowerCase() === b[j - 1]!.toLowerCase() ? 0 : 1),
      )
      prev = tmp
    }
  }
  return dp[b.length]!
}
/** The closest names, for "did you mean". */
function closest(name: string, candidates: readonly string[]): string[] {
  const max = Math.max(2, Math.floor(name.length / 3))
  return candidates
    .map((c) => ({ c, d: distance(name, c) }))
    .filter((x) => x.d <= max || x.c.toLowerCase().includes(name.toLowerCase()))
    .sort((x, y) => x.d - y.d)
    .slice(0, 3)
    .map((x) => x.c)
}
const didYouMean = (name: string, candidates: readonly string[]) => {
  const near = closest(name, candidates)
  return near.length ? `Did you mean ${near.map((n) => `\`${n}\``).join(' or ')}?` : undefined
}

const featureIds = api.features.map((f) => f.id as FeatureId)
const propDefs = new Map([...api.props, ...api.models].map((p) => [p.name, p]))
const columnDefs = new Map(api.column.map((c) => [c.name, c]))
const rendererByName = new Map(api.renderers.map((r) => [r.name, r]))
const rendererByExport = new Map(api.renderers.map((r) => [r.export, r]))
const eventNames = new Set(api.events.map((e) => e.name))

/** String-literal aliases used in prop types, spelled out for enum checks. */
const ALIASES: Record<string, string> = {
  Density: "'compact' | 'cozy' | 'comfortable'",
  FlashMode: "boolean | 'direction'",
}
const expandAliases = (type: string) =>
  type.replace(/\b(Density|FlashMode)\b/g, (name) => ALIASES[name]!)

const isSet = (v: unknown) => v !== undefined && v !== null && v !== false
const typeName = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

/** Feature ids from export names, ids or feature objects; `null` entries are reported. */
function resolveFeatures(
  input: unknown,
  report: (s: Severity, path: string, msg: string, fix?: string) => void,
) {
  const out = new Set<FeatureId>()
  if (input === undefined) return out
  const list = Array.isArray(input) ? input : [input]
  list.forEach((f, i) => {
    const name =
      typeof f === 'string'
        ? f
        : f && typeof f === 'object' && 'feature' in f
          ? String((f as any).feature)
          : null
    if (name === 'allFeatures' || name === 'all') return featureIds.forEach((id) => out.add(id))
    const id = name?.replace(/Feature$/, '') as FeatureId | undefined
    if (id && featureIds.includes(id)) out.add(id)
    else
      report(
        'error',
        `features[${i}]`,
        `Unknown feature ${JSON.stringify(f)}.`,
        didYouMean(
          String(name),
          api.features.map((x) => x.export),
        ) ?? `Use one of: ${api.features.map((x) => x.export).join(', ')}, allFeatures.`,
      )
  })
  return out
}

/**
 * Checks a grid setup against the real API: unknown props and column options (with "did you
 * mean"), options whose feature isn't registered, unknown or unregistered renderers and their
 * options, wrong value types and enums, duplicate column keys, and combinations that don't do what
 * they look like (sortable columns without client sorting, `virtual` with `pagination`, …).
 */
export function validateGridConfig(config: GridConfigInput): ValidationResult {
  const diagnostics: Diagnostic[] = []
  const report = (severity: Severity, path: string, message: string, fix?: string) =>
    diagnostics.push(fix ? { severity, path, message, fix } : { severity, path, message })

  if (!config || typeof config !== 'object') {
    report('error', '', 'The config must be an object: { columns, rowKey, features, …props }.')
    return { ok: false, diagnostics }
  }
  const features = resolveFeatures(config.features, report)
  if (config.features === undefined)
    report(
      'info',
      'features',
      'No `features` given: checked as a grid without features.',
      'List the features registered for this grid, per grid (`:features`) and app-wide (`createVueGrid({ features })`) together, e.g. ["sortingFeature"].',
    )
  const needs = (id: FeatureId, path: string, what: string) => {
    if (features.has(id)) return
    report(
      'warning',
      path,
      `${what} has no effect without \`${featureExport(id)}\`.`,
      `Add \`${featureExport(id)}\` to :features (or to createVueGrid({ features })).`,
    )
  }

  // Registered renderer names (per grid + app-wide).
  const registered = new Set<string>(['text'])
  const regList =
    config.renderers === undefined
      ? []
      : Array.isArray(config.renderers)
        ? config.renderers
        : [config.renderers]
  regList.forEach((r, i) => {
    const name =
      typeof r === 'string'
        ? (rendererByExport.get(r)?.name ?? (rendererByName.has(r) ? r : r))
        : (r as any)?.name
    if (r === 'allRenderers') return api.renderers.forEach((x) => registered.add(x.name))
    if (typeof name === 'string') registered.add(name)
    else
      report(
        'error',
        `renderers[${i}]`,
        'A registered renderer must be a definition (`currencyRenderer`) or its name.',
      )
  })

  // ── props ──────────────────────────────────────────────────────────────────────────────────
  const props: Record<string, unknown> = {}
  for (const [rawKey, value] of Object.entries(config)) {
    if (rawKey === 'columns' || rawKey === 'features' || rawKey === 'renderers') continue
    let key = rawKey.replace(/^v-model:/, '').replace(/^:/, '')
    if (key.startsWith('@') || /^on[A-Z]/.test(key)) {
      const event = key.startsWith('@') ? key.slice(1) : kebab(key.slice(2)).slice(1)
      const name = event.replace(/^update:/, '')
      if (!eventNames.has(event) && !(event.startsWith('update:') && propDefs.has(camel(name))))
        report(
          'warning',
          rawKey,
          `\`<VGrid>\` emits no \`${event}\` event.`,
          didYouMean(event, [...eventNames]),
        )
      continue
    }
    const attr = key
    key = camel(key)
    if (
      !propDefs.has(key) &&
      (['class', 'style', 'key', 'ref', 'id'].includes(attr) || /^(data|aria)-/.test(attr))
    )
      continue
    if (!propDefs.has(key)) {
      report(
        'warning',
        `props.${rawKey}`,
        `\`<VGrid>\` has no prop \`${key}\` (it would fall through to the root element).`,
        didYouMean(key, [...propDefs.keys()]),
      )
      continue
    }
    props[key] = value
  }

  if (props.rowKey === undefined)
    report(
      'error',
      'rowKey',
      '`rowKey` is required.',
      'Set `row-key="id"` (a unique, stable property) or `:row-key="(row) => row.id"`.',
    )
  else if (typeof props.rowKey !== 'string' && typeof props.rowKey !== 'function')
    report('error', 'rowKey', '`rowKey` must be a property name or a function.')

  for (const [key, value] of Object.entries(props)) {
    const def = propDefs.get(key)!
    const feature = propFeatures[key]
    if (feature && !optOuts.has(key) && isSet(value))
      needs(feature, `props.${key}`, `\`${kebab(key)}\``)
    if (key === 'headerMenu' && typeof value === 'function')
      needs('menus', 'props.headerMenu', 'A `header-menu` function')
    if (/\bboolean\b/.test(def.type) && (value === 'true' || value === 'false' || value === ''))
      report(
        'warning',
        `props.${key}`,
        `\`${kebab(key)}\` is the string ${JSON.stringify(value)}, not a boolean.`,
        value === 'false'
          ? `Bind it: \`:${kebab(key)}="false"\` (or leave it out).`
          : `Use the bare attribute (\`${kebab(key)}\`) or bind it: \`:${kebab(key)}="true"\`.`,
      )
    const literals = [...expandAliases(def.type).matchAll(/'([^']+)'/g)].map((m) => m[1]!)
    if (
      typeof value === 'string' &&
      literals.length &&
      !/\bstring\b/.test(def.type) &&
      !literals.includes(value) &&
      value !== 'true' &&
      value !== 'false' &&
      value !== ''
    )
      report(
        'error',
        `props.${key}`,
        `\`${kebab(key)}\` is ${JSON.stringify(value)}; expected ${literals.map((l) => `'${l}'`).join(' | ')}.`,
        didYouMean(value, literals),
      )
  }

  const virtual = props.virtual
  if (isSet(virtual)) {
    const h = (virtual as any)?.rowHeight
    if (typeof virtual !== 'object' || typeof h !== 'number' || !(h > 0))
      report(
        'error',
        'props.virtual',
        "`virtual` needs `{ rowHeight }`: every row's height in px.",
        'Use `:virtual="{ rowHeight: 40 }"`, and give the grid a bounded height.',
      )
    if (isSet(props.pagination))
      report(
        'warning',
        'props.pagination',
        '`pagination` is ignored while `virtual` is on.',
        'Use one: virtual scrolling or pages.',
      )
  }
  if (isSet(props.dataSource) && props.rows !== undefined)
    report(
      'warning',
      'props.rows',
      '`rows` is ignored with a `data-source` (the grid shows what the data source returns).',
      'Remove `rows`.',
    )
  if (
    props.dataSource !== undefined &&
    typeof props.dataSource !== 'function' &&
    typeof props.dataSource !== 'string'
  )
    report(
      'error',
      'props.dataSource',
      '`data-source` must be a function `(query, { signal }) => Promise<{ rows, total? }>`.',
    )
  for (const fnProp of [
    'subRows',
    'loadSubRows',
    'hasSubRows',
    'rowExpandable',
    'isRowSelectable',
    'rowClass',
    'rowAttrs',
    'cellAttrs',
    'contextMenu',
  ]) {
    const v = props[fnProp]
    if (v !== undefined && typeof v !== 'function' && typeof v !== 'string')
      report(
        'error',
        `props.${fnProp}`,
        `\`${kebab(fnProp)}\` must be a function (got ${typeName(v)}).`,
      )
  }
  const pinnedRows = props.pinnedRows
  if (
    pinnedRows != null &&
    (typeof pinnedRows !== 'object' ||
      Array.isArray(pinnedRows) ||
      Object.keys(pinnedRows).some((k) => k !== 'top' && k !== 'bottom'))
  )
    report('error', 'props.pinnedRows', '`pinned-rows` is `{ top?: RowKey[], bottom?: RowKey[] }`.')
  else if (pinnedRows && typeof pinnedRows === 'object') {
    for (const side of ['top', 'bottom'] as const) {
      const keys = (pinnedRows as Record<string, unknown>)[side]
      if (
        keys !== undefined &&
        (!Array.isArray(keys) ||
          Array.from(keys).some((key) => typeof key !== 'string' && !Number.isFinite(key)))
      )
        report(
          'error',
          `props.pinnedRows.${side}`,
          'Expected an array of string or numeric row keys.',
        )
    }
  }

  // ── columns ────────────────────────────────────────────────────────────────────────────────
  const columns = config.columns
  if (!Array.isArray(columns)) {
    report(
      'error',
      'columns',
      '`columns` must be an array of column definitions.',
      'Each: { key, header?, renderer?, … } (see ColumnDef).',
    )
    return { ok: !diagnostics.some((d) => d.severity === 'error'), diagnostics }
  }
  if (!columns.length) report('warning', 'columns', 'No columns: the grid shows nothing.')
  const keys = new Map<string, number>()
  let sortable = false
  let aggregated = false
  columns.forEach((col: any, i) => {
    const at = `columns[${i}]`
    if (!col || typeof col !== 'object' || Array.isArray(col))
      return report('error', at, 'A column must be an object.')
    if (typeof col.key !== 'string' || !col.key)
      report(
        'error',
        `${at}.key`,
        'Every column needs a unique string `key`.',
        "Add `key: '<field name>'` (it is also the default `field`).",
      )
    else if (keys.has(col.key))
      report(
        'error',
        `${at}.key`,
        `Duplicate column key \`${col.key}\` (also columns[${keys.get(col.key)}]).`,
        'Column keys must be unique: give one a different key and point `field` at the data.',
      )
    else keys.set(col.key, i)

    for (const [opt, value] of Object.entries(col)) {
      const path = `${at}.${opt}`
      if (!columnDefs.has(opt)) {
        report(
          'error',
          path,
          `Columns have no option \`${opt}\`.`,
          didYouMean(opt, [...columnDefs.keys()]),
        )
        continue
      }
      const feature = columnFeatures[opt]
      if (feature && !optOuts.has(opt) && isSet(value)) needs(feature, path, `\`${opt}\``)
      if (
        (opt === 'width' || opt === 'minWidth' || opt === 'maxWidth') &&
        value !== undefined &&
        typeof value !== 'string'
      )
        report(
          'error',
          path,
          `\`${opt}\` must be a CSS length / grid track string.`,
          typeof value === 'number'
            ? `Use '${value}px' (or '${value / 16}rem').`
            : "e.g. '8rem', '1fr', 'minmax(10rem, 2fr)', 'min-content'.",
        )
      if (opt === 'align' && !['start', 'center', 'end'].includes(value as string))
        report(
          'error',
          path,
          "`align` is 'start' | 'center' | 'end'.",
          value === 'left' ? "Use 'start'." : value === 'right' ? "Use 'end'." : undefined,
        )
      if (opt === 'pinned' && value !== undefined && !['left', 'right'].includes(value as string))
        report('error', path, "`pinned` is 'left' | 'right'.")
      if (
        opt === 'aggregate' &&
        value !== undefined &&
        typeof value !== 'function' &&
        !['sum', 'avg', 'min', 'max', 'count'].includes(value as string)
      )
        report(
          'error',
          path,
          "`aggregate` is 'sum' | 'avg' | 'min' | 'max' | 'count' or a function `(values, rows) => value`.",
          didYouMean(String(value), ['sum', 'avg', 'min', 'max', 'count']),
        )
      if (
        opt === 'filter' &&
        typeof value === 'string' &&
        !['text', 'number', 'date', 'boolean', 'set'].includes(value)
      )
        report(
          'error',
          path,
          "`filter` is 'text' | 'number' | 'date' | 'boolean' | 'set' (or `{ type, options, placeholder }`).",
        )
      for (const fnOpt of ['value', 'sortValue', 'sortFn', 'filterValue', 'filterFn'])
        if (opt === fnOpt && typeof value !== 'function' && typeof value !== 'string')
          report('error', path, `\`${opt}\` must be a function.`)
      if (opt === 'field' && typeof value !== 'string')
        report('error', path, "`field` is a dot path string, e.g. 'customer.name'.")
    }
    if (col.value && col.field) report('info', `${at}.field`, '`value` wins over `field`.')
    if (col.sortable) sortable = true
    if (col.aggregate) aggregated = true

    // renderer + rendererOptions
    const r = col.renderer
    let renderer: (typeof api.renderers)[number] | undefined
    if (typeof r === 'string') {
      const byExport = rendererByExport.get(r)
      renderer = byExport ?? rendererByName.get(r)
      if (byExport)
        report(
          'info',
          `${at}.renderer`,
          `\`${r}\` reads like the definition: in code pass the imported object (\`renderer: ${r}\`), not a string.`,
        )
      else if (!renderer && !registered.has(r))
        report(
          'error',
          `${at}.renderer`,
          `Unknown renderer \`${r}\`.`,
          didYouMean(r, [...rendererByName.keys()]) ??
            'Pass a renderer definition or register yours with createVueGrid({ renderers }).',
        )
      else if (renderer && !registered.has(r))
        report(
          'warning',
          `${at}.renderer`,
          `Renderer name \`${r}\` isn't registered for this grid: it renders as plain text.`,
          `Pass the definition: \`renderer: ${renderer.export}\` (import it), or register it: createVueGrid({ renderers: [${renderer.export}] }).`,
        )
    } else if (r && typeof r === 'object') {
      renderer = rendererByName.get((r as any).name) ?? rendererByExport.get((r as any).export)
    }
    const options = col.rendererOptions
    if (options !== undefined) {
      if (!options || typeof options !== 'object' || Array.isArray(options))
        report('error', `${at}.rendererOptions`, '`rendererOptions` must be an object.')
      else if (renderer || r === undefined) {
        const def = renderer ?? rendererByName.get('text')!
        const known = def.options.map((o) => o.name)
        for (const opt of Object.keys(options))
          if (!known.includes(opt))
            report(
              'error',
              `${at}.rendererOptions.${opt}`,
              `The \`${def.name}\` renderer has no option \`${opt}\`.`,
              didYouMean(opt, known) ?? `Its options: ${known.join(', ') || '(none)'}.`,
            )
      }
    }
  })

  if (
    sortable &&
    features.has('sorting') &&
    props.sortMode !== 'client' &&
    props.dataSource === undefined
  )
    report(
      'warning',
      'props.sortMode',
      'Sortable columns, but sorting is controlled (the default): a header click only updates `v-model:sort`, the rows stay in order.',
      'Add `sort-mode="client"` for the grid to sort, or sort the rows yourself from `v-model:sort` / `@query-change`.',
    )
  if (isSet(props.totals) && !aggregated && props.aggregates === undefined)
    report(
      'warning',
      'props.totals',
      'A totals row, but no column has an `aggregate`: it shows only its label.',
      "Add `aggregate: 'sum'` (or avg / min / max / count) to the columns to total.",
    )
  const groupBy = props.groupBy
  const groupKeys = typeof groupBy === 'string' ? [groupBy] : Array.isArray(groupBy) ? groupBy : []
  if (aggregated && !isSet(props.totals) && !groupKeys.length)
    report(
      'info',
      'props.totals',
      'Columns have an `aggregate`, but there is no totals row to show it.',
      'Add `totals` (bottom) or `totals="top"`.',
    )
  groupKeys.forEach((k, i) => {
    if (typeof k === 'string' && !keys.has(k))
      report(
        'error',
        typeof groupBy === 'string' ? 'props.groupBy' : `props.groupBy[${i}]`,
        `\`group-by\` names \`${k}\`, which is not a column key (it is ignored).`,
        didYouMean(k, [...keys.keys()]) ?? 'Group by the `key` of a column (it may be hidden).',
      )
  })

  return { ok: !diagnostics.some((d) => d.severity === 'error'), diagnostics }
}
