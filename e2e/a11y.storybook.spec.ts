import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Accessibility: axe-core's WCAG 2.0–2.2 A / AA and best-practice rules on every story, in light
// and dark mode.
// Run against a running Storybook: `npm run storybook` then `npm run e2e:storybook`.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

interface IndexEntry {
  id: string
  type: 'story' | 'docs'
}

/**
 * Rules switched off, each with the reason. Everything else in WCAG 2.2 A / AA and axe's best
 * practices is enforced.
 * - `region`: a story renders one component, not a page with landmarks.
 */
const DISABLED_RULES = ['region']

/**
 * Elements left out, each with the reason.
 * - json-tree toggles: 18 px tall, under WCAG 2.5.8's 24 px. Kept on purpose: at 24 px every toggle
 *   line would stand taller than the value lines between them, a tree that is harder to read.
 */
const EXCLUDED = ['.vg-json-node summary']

/** The stories are split across this many tests, so workers check them in parallel. */
const SHARDS = 12

// the parts are independent: run them on as many workers as there are
test.describe.configure({ mode: 'parallel' })

for (let shard = 0; shard < SHARDS; shard++) {
  test(`stories pass axe (WCAG 2.2 A / AA, best practices), light and dark — part ${shard + 1}/${SHARDS}`, async ({
    page,
    request,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'axe checks markup and computed colours; one engine is enough',
    )
    test.setTimeout(600_000) // big stories (thousands of rows, every renderer) take a while in CI
    const index = (await (await request.get(`${base}/index.json`)).json()) as {
      entries: Record<string, IndexEntry>
    }
    const stories = Object.values(index.entries)
      .filter((e) => e.type === 'story')
      .filter((_, i) => i % SHARDS === shard)
    expect(stories.length).toBeGreaterThan(0)

    const failures: string[] = []
    for (const story of stories) {
      // Storybook sets `color-scheme` from its toolbar global, not from the OS preference.
      for (const scheme of ['light', 'dark'] as const) {
        await page.goto(
          `${base}/iframe.html?id=${story.id}&viewMode=story&globals=scheme:${scheme}`,
        )
        await page.locator('#storybook-root > *').first().waitFor({ timeout: 15_000 })
        await page.waitForTimeout(150) // on-demand chunks (pager, filter panels) settle
        const result = await new AxeBuilder({ page })
          .include('#storybook-root')
          .exclude(EXCLUDED)
          .withTags([
            'wcag2a',
            'wcag2aa',
            'wcag21a',
            'wcag21aa',
            'wcag22a',
            'wcag22aa',
            'best-practice',
          ])
          .disableRules(DISABLED_RULES)
          .analyze()
        for (const v of result.violations)
          failures.push(
            `${story.id} [${scheme}] ${v.id} (${v.impact}): ${v.help} — ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(' '))
              .join(' ; ')}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3})` : ''}`,
          )
      }
    }
    expect(failures, failures.join('\n')).toEqual([])
  })
}
