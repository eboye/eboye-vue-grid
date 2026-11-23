// Loads the grid's agent docs and API reference — from the project's own @eboye/vue-grid when the
// server runs inside a project that has it (so answers match the installed version), else from
// this package's dependency.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

function locateGrid(cwd) {
  for (const base of [join(cwd, 'package.json'), import.meta.url]) {
    try {
      const require = createRequire(base)
      return dirname(require.resolve('@eboye/vue-grid/package.json'))
    } catch {
      // not installed there
    }
  }
  throw new Error('@eboye/vue-grid is not installed (it is a dependency of this server: reinstall it).')
}

/** Splits Markdown into `## ` / `### ` sections for search. */
function sections(source, text) {
  const out = []
  let current = { source, title: source, level: 1, lines: [] }
  let inFence = false
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) inFence = !inFence
    const h = !inFence && /^(#{1,4}) (.+)$/.exec(line)
    if (h) {
      if (current.lines.length) out.push(current)
      current = { source, title: h[2].trim(), level: h[1].length, lines: [line] }
    } else current.lines.push(line)
  }
  if (current.lines.length) out.push(current)
  return out.map((s) => ({ source: s.source, title: s.title, text: s.lines.join('\n').trim() }))
}

export async function loadDocs(cwd = process.cwd()) {
  const dir = locateGrid(cwd)
  const read = (rel) => readFileSync(join(dir, rel), 'utf8')
  const pkg = JSON.parse(read('package.json'))
  const api = JSON.parse(read('agent/api.json'))
  const { validateGridConfig } = await import(pathToFileURL(join(dir, 'dist/agent/index.js')).href)
  const files = {
    'AGENTS.md': read('AGENTS.md'),
    'agent/api.md': read('agent/api.md'),
    'README.md': read('README.md'),
  }
  return {
    dir,
    version: pkg.version,
    api,
    files,
    schema: read('agent/grid-config.schema.json'),
    validateGridConfig,
    sections: Object.entries(files).flatMap(([name, text]) => sections(name, text)),
  }
}
