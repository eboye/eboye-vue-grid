import { expect, test, type Page } from '@playwright/test'

// Column groups (Grid/Columns → Groups), with real mouse, wheel and keyboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const header = (page: Page, key: string) => page.locator(`.vg-header > [data-col-key="${key}"]`)
const group = (page: Page, label: string) => page.locator('.vg-group-cell', { hasText: label })
const box = async (l: ReturnType<Page['locator']>) => (await l.first().boundingBox())!
const labels = (page: Page) => page.locator('.vg-group-cell').evaluateAll((els) => els.map((e) => e.textContent?.trim()))

/** A group cell covers exactly its columns' header cells. */
async function expectSpans(page: Page, label: string, keys: string[]) {
  const g = await box(group(page, label))
  const first = await box(header(page, keys[0]!))
  const last = await box(header(page, keys[keys.length - 1]!))
  expect(g.x).toBeCloseTo(first.x, 0)
  expect(g.x + g.width).toBeCloseTo(last.x + last.width, 0)
  expect(g.y + g.height).toBeCloseTo(first.y, 0) // directly above the column headers
}

test.beforeEach(async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=grid-columns--groups&viewMode=story`)
  await page.locator('#storybook-root .vg-header-groups').waitFor()
})

test('group cells span their columns; a pin boundary splits a group; ungrouped columns get empty cells', async ({ page }) => {
  expect(await labels(page)).toEqual(['Bet', 'Customer', 'Money', '', 'Odds'])
  await expectSpans(page, 'Bet', ['id', 'player'])
  await expectSpans(page, 'Customer', ['city', 'verified'])
  await expectSpans(page, 'Money', ['stake', 'payout'])
  await expectSpans(page, 'Odds', ['change', 'placedAt'])
  await expect(group(page, 'Money')).toHaveAttribute('aria-colspan', '2')
})

test('sticky: the group row and the column headers stay stacked while scrolling; pinned groups stay', async ({ page }) => {
  const scroller = page.locator('#storybook-root .vg')
  const groupY = (await box(group(page, 'Money'))).y
  await scroller.hover()
  await page.mouse.wheel(0, 500)
  await expect.poll(() => scroller.evaluate((e) => e.scrollTop)).toBeGreaterThan(200)
  expect((await box(group(page, 'Money'))).y).toBeCloseTo(groupY, 0)
  await expectSpans(page, 'Money', ['stake', 'payout']) // headers still right below

  const bet0 = (await box(group(page, 'Bet'))).x
  const odds0 = (await box(group(page, 'Odds'))).x
  await page.mouse.wheel(400, 0)
  await expect.poll(() => scroller.evaluate((e) => e.scrollLeft)).toBeGreaterThan(100)
  expect((await box(group(page, 'Bet'))).x).toBeCloseTo(bet0, 0)
  expect((await box(group(page, 'Odds'))).x).toBeLessThan(odds0 - 100)
  await expectSpans(page, 'Bet', ['id', 'player'])
})

test('groups follow hiding, reordering and resizing', async ({ page }) => {
  // hide Payout (header menu): Money shrinks to Stake
  await header(page, 'payout').click({ button: 'right' })
  await page.locator('.vg-menu:popover-open').getByRole('menuitem', { name: 'Hide column' }).click()
  await expectSpans(page, 'Money', ['stake', 'stake'])

  // drag City past Status: Customer splits around KYC… and City now sits outside the group block
  const city = await box(header(page, 'city'))
  const status = await box(header(page, 'status'))
  await page.mouse.move(city.x + city.width / 2, city.y + city.height / 2)
  await page.mouse.down()
  await page.mouse.move(status.x + status.width - 10, status.y + status.height / 2, { steps: 10 })
  await page.mouse.up()
  await expect.poll(async () => (await labels(page)).filter((l) => l === 'Customer').length).toBe(2)

  // resize Stake: the Money group follows
  const handle = header(page, 'stake').locator('.vg-resize-handle')
  const h = await box(handle)
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + h.width / 2 + 60, h.y + h.height / 2, { steps: 8 })
  await page.mouse.up()
  await expectSpans(page, 'Money', ['stake', 'stake'])
})

test('keyboard navigation skips the group row', async ({ page }) => {
  const scroller = page.locator('#storybook-root .vg')
  await scroller.focus()
  const focusedKey = () => page.evaluate(() => document.activeElement?.getAttribute('data-col-key'))
  const isGroup = () => page.evaluate(() => document.activeElement?.classList.contains('vg-group-cell'))
  expect(await isGroup()).toBe(false)
  expect(await focusedKey()).toBeTruthy() // a column header cell
  await page.keyboard.press('ArrowUp') // nothing above the column headers
  expect(await isGroup()).toBe(false)
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('gridcell')
})
