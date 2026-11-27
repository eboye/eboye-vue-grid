import { expect, test } from '@playwright/test'

const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test('initial autosizing waits for visible data, respects bounds, and preserves saved widths', async ({
  page,
}) => {
  const resizeErrors: string[] = []
  page.on('pageerror', (error) => {
    if (error.message.includes('ResizeObserver loop')) resizeErrors.push(error.message)
  })
  await page.goto(`${base}/iframe.html?id=grid-columns--initial-autosizing&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Projects' })
  const header = (key: string) => grid.locator(`.vg-header > [data-col-key="${key}"]`)
  const width = async (key: string) => (await header(key).boundingBox())?.width
  const load = () => page.getByRole('button', { name: 'Load projects' }).click()

  await expect(grid.locator('.vg-skeleton-row').first()).toBeVisible()
  await expect.poll(() => width('name')).toBe(100)
  await page.getByRole('button', { name: 'Hide table' }).click()
  await load()
  await page.getByRole('button', { name: 'Show table' }).click()
  await expect.poll(() => width('name')).toBe(240)
  await expect.poll(() => width('owner')).toBe(120)
  await expect.poll(async () => (await width('stage')) ?? 0).toBeGreaterThan(70)
  await expect(header('stage').locator('.vg-resize-handle')).toHaveCount(0)
  expect(
    await page.evaluate(() => localStorage.getItem('storybook-columns-initial-autosizing')),
  ).toBeNull()

  await page.getByRole('button', { name: 'Replace projects' }).click()
  await expect(grid.getByRole('gridcell', { name: 'Roadmap' })).toBeVisible()
  await expect.poll(() => width('name')).toBe(240)

  await header('name').locator('.vg-resize-handle').focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => width('name')).toBe(224)
  await page.reload()
  await expect(grid.locator('.vg-skeleton-row').first()).toBeVisible()
  await expect.poll(() => width('name')).toBe(224)
  await load()
  await expect(grid.getByRole('gridcell', { name: /A long project name/ })).toBeVisible()
  await expect.poll(() => width('name')).toBe(224)

  await header('name').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Reset width' }).click()
  await expect.poll(() => width('name')).toBe(240)
  expect(resizeErrors).toEqual([])
})
