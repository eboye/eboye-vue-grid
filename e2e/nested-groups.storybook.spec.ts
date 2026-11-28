import { expect, test, type Locator } from '@playwright/test'

const box = async (locator: Locator) => (await locator.boundingBox())!

test('nested header groups stay aligned through scrolling, resizing, and restoring layout', async ({
  page,
}) => {
  const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
  await page.goto(`${base}/iframe.html?id=grid-columns--nested-groups&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Inventory activity' })
  const header = (key: string) => grid.locator(`.vg-header > [data-col-key="${key}"]`)
  const outerGroup = grid.locator('[data-group-key="activity"]')
  const innerGroup = grid.locator('[data-group-key="current"]')
  const pinnedGroup = grid.locator('[data-group-key="inventory"][data-group-start="id"]')
  await expect(innerGroup).toBeVisible()
  await expect(grid.locator('.vg-header')).toHaveAttribute('aria-rowindex', '3')

  const aligned = async () => {
    const outer = await box(outerGroup)
    const inner = await box(innerGroup)
    const quantity = await box(header('quantity'))
    const status = await box(header('status'))
    expect(outer.x).toBeCloseTo(quantity.x, 0)
    expect(outer.x + outer.width).toBeCloseTo(status.x + status.width, 0)
    expect(outer.y + outer.height).toBeCloseTo(inner.y, 0)
    expect(inner.y + inner.height).toBeCloseTo(quantity.y, 0)
    expect(inner.width).toBeCloseTo(quantity.width, 0)
  }
  await aligned()
  const wideName = (await box(header('name'))).width
  const fixedQuantity = (await box(header('quantity'))).width
  const top = (await box(outerGroup)).y

  await page.getByRole('button', { name: 'Narrow grid' }).click()
  expect((await box(header('name'))).width).toBeLessThan(wideName)
  expect((await box(header('quantity'))).width).toBeCloseTo(fixedQuantity, 0)
  const pinnedX = (await box(pinnedGroup)).x
  await grid.evaluate((el) => el.scrollTo(200, 200))
  expect((await box(pinnedGroup)).x).toBeCloseTo(pinnedX, 0)
  expect((await box(outerGroup)).y).toBeCloseTo(top, 0)
  await aligned()

  await page.getByRole('button', { name: 'Widen grid' }).click()
  await grid.evaluate((el) => el.scrollTo(0, 0))
  await header('quantity').focus()
  await page.keyboard.press('Alt+Shift+ArrowRight')
  await expect
    .poll(async () => (await box(header('quantity'))).width)
    .toBeGreaterThan(fixedQuantity)
  const resized = (await box(header('quantity'))).width

  await header('location').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Hide column' }).click()
  await expect(grid.locator('[data-group-key="location"]')).toHaveCount(0)

  await page.reload()
  await expect(header('quantity')).toBeVisible()
  expect((await box(header('quantity'))).width).toBeCloseTo(resized, 0)
  await expect(header('location')).toHaveCount(0)
  await aligned()
})
