import { fileURLToPath, URL } from 'node:url'
import type { StorybookConfig } from '@storybook/vue3-vite'
import vue from '@vitejs/plugin-vue'
import { mergeConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

const config: StorybookConfig = {
  framework: {
    name: '@storybook/vue3-vite',
    // Reads prop/event/slot types (incl. generic SFCs) for the autodocs tables.
    options: { docgen: { plugin: 'vue-component-meta', tsconfig: 'stories/tsconfig.json' } },
  },
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  core: { disableTelemetry: true },
  viteFinal: (base) =>
    mergeConfig(base, {
      plugins: [vue()],
      // A built Storybook (what the browser tests use) keeps native `light-dark()`: rewritten into
      // variables, colours would only follow a color-scheme set in a stylesheet, not dark mode.
      build: { cssTarget: ['chrome123', 'edge123', 'firefox120', 'safari17.5'] },
      // Stories run against the package sources (like the playground), so edits hot-reload.
      resolve: {
        alias: [
          // Stories use runtime `template` strings, which need Vue's template compiler.
          { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
          {
            find: '@nocopypaste/vue-grid/style.css',
            replacement: r('../packages/vue-grid/src/styles/vue-grid.css'),
          },
          { find: /^@nocopypaste\/vue-grid$/, replacement: r('../packages/vue-grid/src/index.ts') },
          {
            find: /^@nocopypaste\/vue-grid\/locales\/(.+)$/,
            replacement: r('../packages/vue-grid/src/locales/$1.ts'),
          },
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
    }),
}

export default config
