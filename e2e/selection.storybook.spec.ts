import { expect, test, type Page } from '@playwright/test'

// Batch selection (Grid / Selection): shift ranges, the toolbar bar, pruning, "select all matching".
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=grid-selection--${id}&viewMode=story`)
  await page.locator('#storybook-root .vg .vg-row').first().waitFor()
}
const grid = (page: Page) => page.locator('#storybook-root .vg')
const rowBox = (page: Page, i: number) => grid(page).locator(':scope > .vg-row').nth(i).locator('.vg-cell-select input')
const checkedCount = (page: Page) => grid(page).locator(':scope > .vg-row .vg-cell-select input:checked').count()

test('shift-click selects a range; the toolbar bar counts it, deletes it and clears it', async ({ page }) => {
  await open(page, 'batch-actions')
  await rowBox(page, 2).click()
  await rowBox(page, 7).click({ modifiers: ['Shift'] })
  await expect.poll(() => checkedCount(page)).toBe(6)
  await expect(page.getByTestId('bar')).toContainText('6 selected')
  // no page text got selected by the shift-click
  expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('')

  // a shift-click on a selected row clears the range from the anchor (row 7) to it
  await rowBox(page, 4).click({ modifiers: ['Shift'] })
  await expect.poll(() => checkedCount(page)).toBe(2)

  const before = await grid(page).locator(':scope > .vg-row').count()
  await page.getByTestId('delete').click()
  await expect(grid(page).locator(':scope > .vg-row')).toHaveCount(before - 2)
  // prune-selection: the deleted rows' keys left the selection
  await expect(page.getByTestId('selected')).toHaveText('selected = []')
  await expect(page.getByTestId('bar')).toHaveCount(0)
})

test('keyboard: Space toggles, Shift+Space selects the range', async ({ page }) => {
  await open(page, 'batch-actions')
  await grid(page).locator(':scope > .vg-row').nth(1).locator('[data-col-key="player"]').click()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Shift+Space')
  await expect.poll(() => checkedCount(page)).toBe(4)
})

test('server data: select the page, then every matching row; unticking one goes back', async ({ page }) => {
  await open(page, 'select-all-matching')
  await expect(page.locator('.vg-selection-banner')).toHaveCount(0)
  await grid(page).locator('.vg-header input[type="checkbox"]').click()
  const banner = page.locator('.vg-selection-banner')
  await expect(banner).toContainText('All 10 rows on this page are selected.')
  await banner.getByRole('button', { name: 'Select all 240 rows' }).click()
  await expect(banner).toContainText('All 240 rows are selected.')
  await expect(page.getByTestId('count')).toHaveText('240 selected')
  await expect(page.getByTestId('state')).toContainText('all matching = true')

  // the next page shows every row ticked
  await page.getByRole('button', { name: 'Next page' }).click()
  // the next page has loaded (the source answers after a delay), every row ticked
  await expect(page.locator('.vg-pagination-summary')).toHaveText('11–20 of 240')
  await expect(grid(page).locator(':scope > .vg-row').first().locator('[data-col-key="id"]')).toHaveText('11')
  await expect.poll(() => checkedCount(page)).toBe(10)

  await rowBox(page, 0).click()
  await expect(page.getByTestId('state')).toContainText('all matching = false')
  // page 1's rows (selected before) stay, plus the rest of this page
  await expect(page.getByTestId('count')).toHaveText('19 selected')
})
