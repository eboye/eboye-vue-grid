import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Resolve the workspace packages to their sources so the playground hot-reloads library edits.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        find: '@nocopypaste/vue-grid/style.css',
        replacement: r('../packages/vue-grid/src/styles/vue-grid.css'),
      },
      {
        find: '@nocopypaste/vue-grid/base.css',
        replacement: r('../packages/vue-grid/src/styles/base.css'),
      },
      { find: /^@nocopypaste\/vue-grid$/, replacement: r('../packages/vue-grid/src/index.ts') },
      {
        find: '@nocopypaste/vue-grid-renderer-template/style.css',
        replacement: r('../packages/cell-renderer-template/src/rating.css'),
      },
      {
        find: /^@nocopypaste\/vue-grid-renderer-template$/,
        replacement: r('../packages/cell-renderer-template/src/index.ts'),
      },
    ],
  },
})
