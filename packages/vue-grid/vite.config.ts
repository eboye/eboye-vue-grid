import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const css = (name: string) => readFileSync(fileURLToPath(new URL(`./src/styles/${name}`, import.meta.url)), 'utf8')

/**
 * Ships the theme as standalone, un-hashed files:
 * - `dist/core.css`       → `@eboye/vue-grid/core.css`      grid, menus, pagination, text renderer
 * - `dist/renderers.css`  → `@eboye/vue-grid/renderers.css` the optional cell renderers
 * - `dist/vue-grid.css`   → `@eboye/vue-grid/style.css`     both, inlined (no @import at runtime)
 */
function emitTheme(): Plugin {
  return {
    name: 'vue-grid:emit-theme',
    apply: 'build',
    generateBundle() {
      const core = css('core.css')
      const renderers = css('renderers.css')
      this.emitFile({ type: 'asset', fileName: 'core.css', source: core })
      this.emitFile({ type: 'asset', fileName: 'renderers.css', source: renderers })
      this.emitFile({ type: 'asset', fileName: 'vue-grid.css', source: `${core}\n${renderers}` })
    },
  }
}

export default defineConfig({
  plugins: [vue(), emitTheme()],
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
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
