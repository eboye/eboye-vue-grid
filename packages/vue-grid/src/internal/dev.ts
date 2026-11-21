// Library builds keep `process.env.NODE_ENV` so the consumer's bundler strips dev-only code.
declare const process: { env: Record<string, string | undefined> } | undefined

export const DEV = typeof process === 'undefined' || process.env.NODE_ENV !== 'production'

const warned = new Set<string>()

export function warnOnce(id: string, message: string) {
  if (!DEV || warned.has(id)) return
  warned.add(id)
  console.warn(`[vue-grid] ${message}`)
}
