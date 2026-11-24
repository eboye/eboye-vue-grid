import { readFile } from 'node:fs/promises'
import vue from '@vitejs/plugin-vue'
import { createHighlighter } from 'shiki'
import { defineConfig, type Plugin } from 'vite'
import grid from '../packages/vue-grid/package.json' with { type: 'json' }

/**
 * `import source from './demos/X.vue?source&raw'` gives the file's own text as syntax-highlighted
 * tokens, `{ styles, lines }`: every token is `[text, styleIndex]`, and each style carries the
 * light and dark colours as `--shiki-light` / `--shiki-dark`. The page renders them as plain
 * text spans (no HTML strings), so what a demo shows is exactly the code that runs.
 * (`raw` keeps the Vue plugin off the module.)
 */
function demoSource(): Plugin {
  const highlighter = createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: ['vue', 'ts'],
  })
  return {
    name: 'site:demo-source',
    enforce: 'pre',
    async load(id) {
      const [file, query] = id.split('?')
      if (!file || !query?.split('&').includes('source')) return
      this.addWatchFile(file)
      const code = (await readFile(file, 'utf8')).trimEnd()
      const { tokens } = (await highlighter).codeToTokens(code, {
        lang: file.endsWith('.vue') ? 'vue' : 'ts',
        themes: { light: 'github-light', dark: 'github-dark' },
        defaultColor: false,
      })
      const styles: Record<string, string>[] = []
      const index = new Map<string, number>()
      const lines = tokens.map((line) =>
        line.map((token) => {
          const style = (token.htmlStyle ?? {}) as Record<string, string>
          const key = JSON.stringify(style)
          let i = index.get(key)
          if (i === undefined) {
            i = styles.push(style) - 1
            index.set(key, i)
          }
          return [token.content, i]
        }),
      )
      return `export default ${JSON.stringify({ styles, lines })}`
    },
  }
}

// The site uses the built package (`npm run build` first), like any app that installs it.
// SITE_BASE is the path it is served under: `/eboye-vue-grid/` on GitHub Pages.
export default defineConfig({
  base: process.env.SITE_BASE ?? '/',
  plugins: [vue(), demoSource()],
  define: { __GRID_VERSION__: JSON.stringify(grid.version) },
  // Browsers with native light-dark(), so the minifier keeps it rather than rewriting it into
  // variables that only follow a color-scheme set in a stylesheet.
  build: { cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'] },
})
