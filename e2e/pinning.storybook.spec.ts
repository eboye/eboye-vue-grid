import { expect, test, type Page } from '@playwright/test'

// Pinned columns that would crowd out a narrow grid scroll like the others (`pinned-max-share`).
// Grid / Columns → Pinned with column menu: # (4rem) and Player (11rem) left, Open (6rem) right.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page, story = 'pinned-with-column-menu') => {
  await page.goto(`${base}/iframe.html?id=grid-columns--${story}&viewMode=story`)
  await page.locator('#storybook-root .vg .vg-row').first().waitFor()
  await page.evaluate(() => localStorage.clear()) // the story persists column state
}
const grid = (page: Page) => page.locator('#storybook-root .vg')
const player = (page: Page) => page.locator('#storybook-root .vg-header > [data-col-key="player"]')
/** Player's header x before and after scrolling the grid 240px to the right. */
async function scrollShift(page: Page) {
  const before = (await player(page).boundingBox())!.x
  await grid(page).evaluate((el) => (el.scrollLeft = 240))
  await expect.poll(() => grid(page).evaluate((el) => el.scrollLeft)).toBeGreaterThan(200)
  await page.waitForTimeout(100)
  const after = (await player(page).boundingBox())!.x
  await grid(page).evaluate((el) => (el.scrollLeft = 0))
  return before - after
}

test('desktop: pinned columns stay put while the grid scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await open(page)
  await expect(grid(page)).not.toHaveClass(/vg-pins-dropped/)
  expect(await scrollShift(page)).toBeLessThan(1)
})

test('phone: pinned columns that would take most of the grid scroll with the rest', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await open(page)
  await expect(grid(page)).toHaveClass(/vg-pins-dropped/)
  expect(await scrollShift(page)).toBeGreaterThan(200)
  await expect(player(page)).not.toHaveClass(/vg-pin-left/)

  // wide again (a rotated tablet, a closed side panel): pinned again
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(grid(page)).not.toHaveClass(/vg-pins-dropped/)
  await expect(player(page)).toHaveClass(/vg-pin-left/)
  expect(await scrollShift(page)).toBeLessThan(1)
})

test('pinned-max-share false keeps them pinned on a phone too', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await open(page, 'always-pinned')
  await expect(grid(page)).not.toHaveClass(/vg-pins-dropped/)
  expect(await scrollShift(page)).toBeLessThan(1)
})
