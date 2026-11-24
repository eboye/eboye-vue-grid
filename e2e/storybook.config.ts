import { defineConfig } from '@playwright/test'
import { ciOptions, projects } from './projects'

export default defineConfig({
  testDir: '.',
  testMatch: '*storybook.spec.ts',
  ...ciOptions,
  use: { trace: 'retain-on-failure', viewport: { width: 1280, height: 900 } },
  projects,
  webServer: {
    command: 'npm run storybook -- --ci',
    cwd: '..',
    url: 'http://localhost:6006/index.json',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
