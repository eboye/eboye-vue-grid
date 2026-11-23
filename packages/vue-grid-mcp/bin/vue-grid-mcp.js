#!/usr/bin/env node
// vue-grid-mcp                 run the MCP server on stdio (for Claude Code, Cursor, …)
// vue-grid-mcp validate <file> check a grid config (JSON) and print its diagnostics; exit 1 on errors
// vue-grid-mcp guide           print AGENTS.md of the installed @eboye/vue-grid
import { readFileSync } from 'node:fs'
import { loadDocs } from '../src/docs.js'
import { serve } from '../src/server.js'

const [command, arg] = process.argv.slice(2)

if (!command) {
  await serve()
} else if (command === 'validate') {
  if (!arg) {
    console.error('usage: vue-grid-mcp validate <config.json>   ("-" reads stdin)')
    process.exit(2)
  }
  const config = JSON.parse(readFileSync(arg === '-' ? 0 : arg, 'utf8'))
  const { validateGridConfig } = await loadDocs()
  const { ok, diagnostics } = validateGridConfig(config)
  for (const d of diagnostics) console.log(`${d.severity.padEnd(7)} ${d.path || '(config)'}: ${d.message}${d.fix ? `\n        fix: ${d.fix}` : ''}`)
  console.log(ok ? `\nOK (${diagnostics.length} note(s))` : '\nNOT OK')
  process.exit(ok ? 0 : 1)
} else if (command === 'guide') {
  process.stdout.write((await loadDocs()).files['AGENTS.md'])
} else {
  console.error(`unknown command "${command}" (commands: validate <file>, guide; none = MCP server)`)
  process.exit(2)
}
