import { expect, test } from '@playwright/test'

// Smoke test for the Storybook build: every story renders without errors.
// Run against a running Storybook: `npm run storybook` then `npm run e2e:storybook`.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

interface IndexEntry {
  id: string
  title: string
  name: string
  type: 'story' | 'docs'
}

test('every story and docs page renders without errors', async ({ page, request }) => {
  test.setTimeout(240_000)
  const index = (await (await request.get(`${base}/index.json`)).json()) as {
    entries: Record<string, IndexEntry>
  }
  const entries = Object.values(index.entries)
  expect(entries.length).toBeGreaterThan(0)

  const failures: string[] = []
  for (const entry of entries) {
    const errors: string[] = []
    const onError = (err: Error) => errors.push(err.message)
    const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
      // The image renderer story points one sample at an unresolvable host on purpose (placeholder demo).
      if (msg.location().url.includes('invalid.example')) return
      if (
        msg.type() === 'error' ||
        (msg.type() === 'warning' && msg.text().startsWith('[Vue warn]'))
      )
        errors.push(msg.text())
    }
    page.on('pageerror', onError)
    page.on('console', onConsole)
    await page.goto(
      `${base}/iframe.html?id=${entry.id}&viewMode=${entry.type === 'docs' ? 'docs' : 'story'}`,
    )
    const root = entry.type === 'docs' ? '#storybook-docs' : '#storybook-root'
    await page
      .locator(`${root} > *`)
      .first()
      .waitFor({ timeout: 15_000 })
      .catch(() => errors.push('nothing rendered'))
    if (entry.type === 'story' && entry.title.startsWith('Grid/')) {
      await expect(
        // `table` for grids without keyboard navigation (Grid/Features)
        page
          .locator('#storybook-root :is([role="grid"], [role="treegrid"], [role="table"])')
          .first(),
      ).toBeVisible()
    }
    // Storybook's own error overlay
    if (await page.locator('.sb-show-errordisplay').count())
      errors.push(await page.locator('#error-message').innerText())
    page.off('pageerror', onError)
    page.off('console', onConsole)
    if (errors.length) failures.push(`${entry.id}: ${errors.join(' | ')}`)
  }
  expect(failures, failures.join('\n')).toEqual([])
})
