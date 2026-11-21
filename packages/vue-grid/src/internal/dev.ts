// Dev-only code is written as `if (process.env.NODE_ENV !== 'production') …` at each use site —
// the same contract as Vue's esm-bundler build. Bundlers (Vite, webpack, Rollup/esbuild with a
// define) replace the expression, so production builds drop those blocks and their messages.
// Don't wrap it in a `typeof process` guard or an exported constant: the guard survives the
// replacement (warnings would ship to production browsers) and a constant isn't inlined across
// modules by every bundler. Each file that checks it declares `process` locally (module scope, so
// it never clashes with @types/node):
//   declare const process: { env: Record<string, string | undefined> }

const warned = new Set<string>()

export function warnOnce(id: string, message: string) {
  if (warned.has(id)) return
  warned.add(id)
  console.warn(`[vue-grid] ${message}`)
}
