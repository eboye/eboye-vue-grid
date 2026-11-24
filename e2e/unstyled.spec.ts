import { expect, test, type Page } from '@playwright/test'

// base.css alone (no theme): the grid must still lay out and behave. playground/unstyled.html.
const box = async (page: Page, selector: string) =>
  (await page.locator(selector).first().boundingBox())!
const childXs = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => [...el.children].map((c) => Math.round(c.getBoundingClientRect().x)))

test.beforeEach(async ({ page }) => {
  await page.goto('/unstyled.html')
  await page.locator('.vg').waitFor()
})

test('no theme is loaded', async ({ page }) => {
  const bg = await page.locator('.vg-viewport').evaluate((e) => getComputedStyle(e).borderTopWidth)
  expect(bg).toBe('0px') // the theme's outer border is absent
})

test('columns line up across header, rows and sub-grid rows (CSS subgrid)', async ({ page }) => {
  const header = await childXs(page, '.vg-header')
  expect(header.length).toBe(9) // select + 8 columns
  expect(await childXs(page, '.vg-row[data-depth="0"]')).toEqual(header)
  expect(await childXs(page, '.vg-subgrid .vg-row')).toEqual(header)
  // child rows are indented in the tree column
  expect((await box(page, '.vg-subgrid .vg-tree-gutter')).width).toBeGreaterThan(
    (await box(page, '.vg-row[data-depth="0"] .vg-tree-gutter')).width,
  )
})

test('sticky header and pinned columns while scrolling (mouse wheel)', async ({ page }) => {
  const grid = page.locator('.vg')
  const headerY = (await box(page, '.vg-header > [data-col-key="name"]')).y
  await grid.hover()
  await page.mouse.wheel(0, 400)
  await expect.poll(() => grid.evaluate((e) => e.scrollTop)).toBeGreaterThan(200)
  expect((await box(page, '.vg-header > [data-col-key="name"]')).y).toBeCloseTo(headerY, 0)

  const pinned0 = (await box(page, '.vg-header > [data-col-key="id"]')).x
  const plain0 = (await box(page, '.vg-header > [data-col-key="a"]')).x
  await page.mouse.wheel(500, 0)
  await expect.poll(() => grid.evaluate((e) => e.scrollLeft)).toBeGreaterThan(200)
  expect((await box(page, '.vg-header > [data-col-key="id"]')).x).toBeCloseTo(pinned0, 0)
  expect((await box(page, '.vg-header > [data-col-key="a"]')).x).toBeLessThan(plain0 - 200)
  // pinned cells are opaque (Canvas fallback), so scrolled content doesn't show through
  const bg = await page
    .locator('.vg-row > [data-col-key="id"]')
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(bg).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/)
})

test('menus and popovers are anchored, not centred by the browser', async ({ page }) => {
  const city = await box(page, '.vg-header > [data-col-key="city"]')
  const [px, py] = [city.x + 20, city.y + city.height / 2]
  await page.mouse.click(px, py, { button: 'right' })
  const menu = page.locator('.vg-menu:popover-open')
  await expect(menu).toBeVisible()
  const m = (await menu.boundingBox())!
  expect(Math.abs(m.x - px)).toBeLessThan(12)
  expect(Math.abs(m.y - py)).toBeLessThan(12)
  await page.keyboard.press('Escape')

  const funnel = page.locator('.vg-header > [data-col-key="name"] .vg-filter-button')
  await funnel.click()
  const pop = page.locator('.vg-filter-popover:popover-open')
  await expect(pop).toBeVisible()
  const f = (await funnel.boundingBox())!
  const p = (await pop.boundingBox())!
  expect(p.y).toBeGreaterThanOrEqual(f.y + f.height - 1)
  expect(p.y).toBeLessThan(f.y + f.height + 20)
  expect(Math.abs(p.x + p.width - (f.x + f.width))).toBeLessThan(6)
})

test('the sort direction stays visible: the inactive arrow is dimmed', async ({ page }) => {
  const down = page.locator('.vg-header > [data-col-key="name"] .vg-sort-down')
  await expect(down).toHaveCSS('opacity', '0.35')
  await page.locator('.vg-header > [data-col-key="name"] .vg-sort').click()
  await expect(down).toHaveCSS('opacity', '1')
})
