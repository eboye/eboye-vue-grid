import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*storybook.spec.ts',
  reporter: [['list']],
  use: { trace: 'retain-on-failure', viewport: { width: 1280, height: 900 } },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run storybook -- --ci',
    cwd: '..',
    url: 'http://localhost:6006/index.json',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
