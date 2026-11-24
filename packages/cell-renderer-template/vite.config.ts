import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const cssPath = fileURLToPath(new URL('./src/rating.css', import.meta.url))

function emitCss(): Plugin {
  return {
    name: 'rating:emit-css',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'rating.css',
        source: readFileSync(cssPath, 'utf8'),
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), emitCss()],
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      // Never bundle the host library or Vue: the app provides them (peer dependencies).
      external: ['vue', '@nocopypaste/vue-grid'],
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
  },
})
