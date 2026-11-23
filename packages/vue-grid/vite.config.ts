import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { transform } from 'lightningcss'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const css = (name: string) => readFileSync(fileURLToPath(new URL(`./src/styles/${name}`, import.meta.url)), 'utf8')
/**
 * Minified with Lightning CSS — no `targets`, so nothing is transpiled or prefixed: modern syntax
 * (`light-dark()`, anchor positioning, `@layer`, container queries) ships as written. ~25% smaller
 * gzipped than the commented sources.
 */
const minify = (code: string, filename: string) => transform({ filename, code: Buffer.from(code), minify: true }).code.toString()

/**
 * Ships the styles as standalone, un-hashed files (each inlined, no @import at runtime):
 * - `dist/base.css`       → `@nocopypaste/vue-grid/base.css`      structure only, no theme
 * - `dist/theme.css`      → `@nocopypaste/vue-grid/theme.css`     the default look (load after base)
 * - `dist/core.css`       → `@nocopypaste/vue-grid/core.css`      base + theme
 * - `dist/renderers.css`  → `@nocopypaste/vue-grid/renderers.css` the optional cell renderers
 * - `dist/vue-grid.css`   → `@nocopypaste/vue-grid/style.css`     everything
 */
function emitTheme(): Plugin {
  return {
    name: 'vue-grid:emit-theme',
    apply: 'build',
    generateBundle() {
      const base = css('base.css')
      const theme = css('theme.css')
      const renderers = css('renderers.css')
      const core = `${base}\n${theme}`
      const files: Record<string, string> = {
        'base.css': base,
        'theme.css': theme,
        'core.css': core,
        'renderers.css': renderers,
        'vue-grid.css': `${core}\n${renderers}`,
      }
      for (const [fileName, source] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source: minify(source, fileName) })
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), emitTheme()],
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        // `@nocopypaste/vue-grid/agent`: the API as data + validateGridConfig(), for agents and tooling.
        'agent/index': fileURLToPath(new URL('./src/agent/index.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue'],
      // One output file per source module: bundlers then drop every renderer / component an app
      // doesn't import (with `sideEffects` limited to CSS), instead of pulling one big chunk.
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    setupFiles: ['test/setup.ts'],
  },
})
