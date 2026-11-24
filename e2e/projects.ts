import { devices, type PlaywrightTestConfig } from '@playwright/test'

const viewport = { width: 1280, height: 900 }
const ci = !!process.env.CI

/**
 * Browsers for both configs: Chromium and Firefox always; WebKit in CI (GitHub's Ubuntu runners
 * support it) or locally with `E2E_WEBKIT=1` (some Linux distributions need extra libraries).
 */
export const projects: PlaywrightTestConfig['projects'] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport } },
  ...(ci || process.env.E2E_WEBKIT ? [{ name: 'webkit', use: { ...devices['Desktop Safari'], viewport } }] : []),
]

/** CI: retry flaky runs, fail on a stray `test.only`, report in the pull request too. */
export const ciOptions: Partial<PlaywrightTestConfig> = ci
  ? { retries: 2, forbidOnly: true, workers: 2, reporter: [['list'], ['github']] }
  : { reporter: [['list']] }
