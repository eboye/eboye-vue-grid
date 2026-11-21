import { expect, test, type Page } from '@playwright/test'

// Opt-in features, driven with real mouse input against the Grid/Features stories (an app that
// registers no features app-wide).
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root [role="grid"]').first().waitFor()
}
const header = (page: Page, key: string) => page.locator(`.vg-header > [data-col-key="${key}"]`)
const players = (page: Page) => page.locator('.vg-row > [data-col-key="player"]').allTextContents()

test('no features: a plain table; clicking a sortable header does nothing; no funnels, filter row or pager', async ({ page }) => {
  await story(page, 'grid-features--no-features')
  const before = await players(page)
  await header(page, 'player').hover()
  await expect(page.locator('.vg-filter-button')).toHaveCount(0)
  await expect(page.locator('.vg-sort')).toHaveCount(0)
  await header(page, 'player').click()
  expect(await players(page)).toEqual(before)
  await expect(header(page, 'player')).not.toHaveAttribute('aria-sort', /.+/)
  // the header menu still opens, without sort or filter items
  await header(page, 'player').click({ button: 'right' })
  const menu = page.locator('.vg-menu:popover-open')
  await expect(menu.getByRole('menuitem', { name: 'Hide column' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Sort/ })).toHaveCount(0)
  await expect(menu.getByRole('menuitem', { name: /Filter/ })).toHaveCount(0)
})

test('opting in, feature by feature', async ({ page }) => {
  await story(page, 'grid-features--opt-in')
  await expect(page.locator('.vg-sort')).toHaveCount(0)
  await expect(page.locator('.vg-filter-input')).toHaveCount(0)
  await expect(page.locator('.vg-grid-pagination')).toHaveCount(0)
  await expect(page.locator('.vg-row')).toHaveCount(40)

  await page.getByLabel('sortingFeature').check()
  await header(page, 'player').locator('.vg-sort').click()
  await expect(header(page, 'player')).toHaveAttribute('aria-sort', 'ascending')
  const sorted = await players(page)
  expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b)))
  await expect(page.locator('.vg-filter-button')).toHaveCount(0)

  await page.getByLabel('paginationFeature').check()
  await expect(page.locator('.vg-grid-pagination')).toBeVisible()
  await expect(page.locator('.vg-row')).toHaveCount(10)

  await page.getByLabel('filteringFeature').check()
  await expect(page.locator('.vg-filter-input').first()).toBeVisible()
  await header(page, 'player').hover()
  await expect(header(page, 'player').locator('.vg-filter-button')).toHaveCSS('opacity', '1')
  const first = (await players(page))[0]!
  await page.getByRole('searchbox', { name: 'Search rows' }).fill(first)
  await expect.poll(async () => (await players(page)).every((p) => p.includes(first))).toBe(true)
})
