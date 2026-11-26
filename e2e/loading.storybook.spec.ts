import { expect, test } from '@playwright/test'

// `skeleton`: placeholder rows while loading with nothing to show yet.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test('skeleton: placeholder rows line up with the header; screen readers still hear Loading…', async ({
  page,
}) => {
  await page.goto(`${base}/iframe.html?id=grid-basics--loading-skeleton&viewMode=story`)
  const grid = page.locator('#storybook-root .vg')
  await grid.waitFor()
  const rows = grid.locator('.vg-skeleton-row')
  await expect(rows).toHaveCount(8)
  await expect(rows.first()).toHaveAttribute('aria-hidden', 'true')
  // one cell per column, under its header cell
  const headers = grid.locator('.vg-header > .vg-header-cell')
  const headerBoxes = await headers.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return [Math.round(r.left), Math.round(r.width)]
    }),
  )
  const cellBoxes = await rows
    .first()
    .locator('.vg-cell')
    .evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        return [Math.round(r.left), Math.round(r.width)]
      }),
    )
  expect(cellBoxes).toEqual(headerBoxes)
  // each bar is visible and inside its cell
  const bar = rows.first().locator('.vg-skeleton').first()
  await expect(bar).toBeVisible()
  expect((await bar.boundingBox())!.height).toBeGreaterThan(4)
  // the loading text is gone visually but still in the accessibility tree
  await expect(grid).toHaveAttribute('aria-busy', 'true')
  const named = page
    .getByRole('grid', { name: 'Bets' })
    .or(page.getByRole('table', { name: 'Bets' }))
  await expect(named).toContainText('Loading…')
  const loading = grid.locator('.vg-empty')
  expect(await loading.evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1)
})

test('without skeleton, loading with no rows shows the Loading… line', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=grid-basics--loading-empty&viewMode=story`)
  const grid = page.locator('#storybook-root .vg')
  await expect(grid.locator('.vg-empty')).toBeVisible()
  await expect(grid.locator('.vg-empty')).toHaveText('Loading…')
  await expect(grid.locator('.vg-skeleton-row')).toHaveCount(0)
})
