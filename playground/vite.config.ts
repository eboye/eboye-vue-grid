import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Resolve the workspace packages to their sources so the playground hot-reloads library edits.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      { find: '@eboye/vue-grid/style.css', replacement: r('../packages/vue-grid/src/styles/vue-grid.css') },
      { find: '@eboye/vue-grid/base.css', replacement: r('../packages/vue-grid/src/styles/base.css') },
      { find: /^@eboye\/vue-grid$/, replacement: r('../packages/vue-grid/src/index.ts') },
      {
        find: '@eboye/vue-grid-renderer-template/style.css',
        replacement: r('../packages/cell-renderer-template/src/rating.css'),
      },
      {
        find: /^@eboye\/vue-grid-renderer-template$/,
        replacement: r('../packages/cell-renderer-template/src/index.ts'),
      },
    ],
  },
})
