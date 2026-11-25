import { defineConfig } from '@playwright/test'
import { ciOptions, projects } from './projects'

/**
 * Stories are tested against a static Storybook build (a few seconds to make), served as plain
 * files: the dev server compiles each story on request, and with every engine's workers loading
 * pages at once that starves the machine, which made timing-based tests time out. A Storybook
 * already running on :6006 is reused; `STORYBOOK_DEV=1` starts the dev server instead.
 */
const dev = !!process.env.STORYBOOK_DEV

export default defineConfig({
  testDir: '.',
  testMatch: '*storybook.spec.ts',
  // the virtual-scrolling stories (thousands of rows, many scroll steps) take 10–15 s alone and
  // twice that with every engine busy
  timeout: 60_000,
  ...ciOptions,
  use: { trace: 'retain-on-failure', viewport: { width: 1280, height: 900 } },
  projects,
  webServer: {
    command: dev
      ? 'npm run storybook -- --ci'
      : 'npm run build-storybook -- --quiet && npx vite preview --outDir storybook-static --port 6006 --strictPort',
    cwd: '..',
    url: 'http://localhost:6006/index.json',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
