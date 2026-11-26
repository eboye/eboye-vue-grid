import { expect, test, type Page } from '@playwright/test'

// The cell-objects recipe (`recipes-cell-objects--from-cell-objects`, also in
// docs/migrating-from-revogrid.md): per-cell value, colour, tooltip and copy button.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const cell = (page: Page, row: number, key: string) =>
  page.locator(`[data-row-key="${row}"] > [data-col-key="${key}"]`)

test.beforeEach(async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=recipes-cell-objects--from-cell-objects&viewMode=story`)
  await page.locator('#storybook-root .vg').waitFor()
})

test('each cell takes its value and colour from its own object', async ({ page }) => {
  await expect(cell(page, 1, 'status')).toHaveText('Won')
  await expect(cell(page, 1, 'status').locator('.vg-text')).toHaveClass(
    /vg-text-fill.*vg-tone-success|vg-tone-success.*vg-text-fill/,
  )
  await expect(cell(page, 2, 'status').locator('.vg-text')).toHaveClass(/vg-tone-danger/)
  await expect(cell(page, 3, 'status').locator('.vg-text')).not.toHaveClass(/vg-tone-/)
})

test('tooltips come from the cell: lines, one line, or none', async ({ page }) => {
  const tooltip = page.locator('.vg-tooltip')
  await cell(page, 1, 'player').locator('.vg-text').hover()
  await expect(tooltip).toBeVisible()
  expect(await tooltip.evaluate((el) => (el as HTMLElement).innerText)).toBe(
    'VIP since 2024\nLimit 5,000',
  )
  await page.mouse.move(0, 0)
  await expect(tooltip).toBeHidden()
  await expect(cell(page, 2, 'player').locator('.vg-text')).not.toHaveAttribute('data-vg-tip')
  await expect(cell(page, 2, 'status').locator('.vg-text')).toHaveAttribute(
    'data-vg-tip',
    'Settled 10:42',
  )
})

test('a copy button only where the cell asks for one, copying the value or its own text', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await expect(cell(page, 3, 'ticket').getByRole('button')).toHaveCount(0)
  await cell(page, 1, 'ticket').getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByTestId('log')).toHaveText('cell-action copy #1 "TK-000481"')
  await cell(page, 2, 'ticket').getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByTestId('log')).toHaveText(
    'cell-action copy #2 "https://example.com/tickets/482"',
  )
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'https://example.com/tickets/482',
    )
})

test('sorting uses the cell values', async ({ page }) => {
  await page.locator('[data-col-key="player"] .vg-sort').click()
  const names = await page
    .locator('[data-col-key="player"].vg-cell')
    .evaluateAll((els) => els.map((e) => e.textContent?.trim()))
  expect(names).toEqual(['Ana Petrović', 'Jelena Kovač', 'Marko Ilić'])
})
