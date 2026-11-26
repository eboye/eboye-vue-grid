import { expect, test } from '@playwright/test'

// Smoke test for the Storybook build: every story and docs page renders without errors.
// The Storybook config starts (or reuses) Storybook; `npm run e2e:storybook`.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

interface IndexEntry {
  id: string
  title: string
  name: string
  type: 'story' | 'docs'
}

/**
 * The pages are split across this many tests, so workers walk them in parallel and one slow page
 * (or a busy machine) can't run a single long test out of time.
 */
const SHARDS = 8

// the parts are independent: run them on as many workers as there are
test.describe.configure({ mode: 'parallel' })

for (let shard = 0; shard < SHARDS; shard++) {
  test(`every story and docs page renders without errors — part ${shard + 1}/${SHARDS}`, async ({
    page,
    request,
  }) => {
    const index = (await (await request.get(`${base}/index.json`)).json()) as {
      entries: Record<string, IndexEntry>
    }
    const entries = Object.values(index.entries).filter((_, i) => i % SHARDS === shard)
    expect(entries.length).toBeGreaterThan(0)
    // about 1 s a page, more for the big ones or on a busy machine
    test.setTimeout(Math.max(120_000, entries.length * 6_000))

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
      const isDocs = entry.type === 'docs'
      const isGridStory = !isDocs && entry.title.startsWith('Grid/')
      const root = isDocs ? '#storybook-docs' : '#storybook-root'
      // Grid stories can mount slowly under CI load. Wait for the grid itself, allowing the
      // same time as docs pages, which can render several grids. Non-interactive grids use table.
      const content = isGridStory
        ? `${root} :is([role="grid"], [role="treegrid"], [role="table"])`
        : `${root} > *`
      await page
        .locator(content)
        .first()
        .waitFor({ timeout: isDocs || isGridStory ? 30_000 : 15_000 })
        .catch(() => errors.push(isGridStory ? 'no visible grid rendered' : 'nothing rendered'))
      // Storybook's own error overlay
      if (await page.locator('.sb-show-errordisplay').count())
        errors.push(await page.locator('#error-message').innerText())
      page.off('pageerror', onError)
      page.off('console', onConsole)
      if (errors.length) failures.push(`${entry.id}: ${errors.join(' | ')}`)
    }
    expect(failures, failures.join('\n')).toEqual([])
  })
}
