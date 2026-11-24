import { defineConfig } from '@playwright/test'
import { ciOptions, projects } from './projects'

export default defineConfig({
  testDir: '.',
  testIgnore: '*storybook.spec.ts', // has its own config: storybook.config.ts
  timeout: 30_000,
  fullyParallel: true,
  ...ciOptions,
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects,
  webServer: {
    command: 'npm run dev -w playground',
    cwd: '..',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
