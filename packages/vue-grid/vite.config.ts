import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const cssPath = fileURLToPath(new URL('./src/styles/vue-grid.css', import.meta.url))

/** Ships the theme as a standalone, un-hashed `dist/vue-grid.css` (imported via `@eboye/vue-grid/style.css`). */
function emitTheme(): Plugin {
  return {
    name: 'vue-grid:emit-theme',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'vue-grid.css', source: readFileSync(cssPath, 'utf8') })
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
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
  },
})
