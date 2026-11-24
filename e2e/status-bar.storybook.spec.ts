import { expect, test, type Page } from '@playwright/test'

const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=grid-status-bar--${id}&viewMode=story`)
  await page.locator('#storybook-root [role="grid"]').first().waitFor()
}
const bar = (page: Page) => page.locator('.vg-status-bar')
const money = (s: string) => Number(s.replace(/[^\d.-]/g, ''))

/** The Stake cells of the ticked rows, as shown. */
const tickedStakes = (page: Page) =>
  page
    .locator('.vg-row:has(input[type="checkbox"]:checked) > [data-col-key="stake"]')
    .allTextContents()

test.describe('status bar', () => {
  test('counts, the selection summary, and filters with Clear', async ({ page }) => {
    await story(page, 'with-summary')
    await expect(bar(page)).toHaveAttribute('role', 'group')
    await expect(bar(page)).toContainText('200 rows')
    await expect(bar(page)).toContainText('3 selected')

    // the sum is the selected rows' stakes, formatted like the cells
    const sumOf = async () => (await tickedStakes(page)).reduce((t, s) => t + money(s), 0)
    let expected = await sumOf()
    await expect(bar(page).locator('.vg-status-value').first()).toHaveText(
      `Sum €${expected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    )

    // tick a row with the mouse: the count and the sum follow
    await page.locator('.vg-row').nth(9).locator('input[type="checkbox"]').click()
    await expect(bar(page)).toContainText('4 selected')
    expected = await sumOf()
    await expect(bar(page).locator('.vg-status-value').first()).toHaveText(
      `Sum €${expected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    )
    await expect(bar(page)).toContainText('Average €')

    // filter from the filter row: "N of 200 rows", "1 filter", Clear
    await page.locator('.vg-header > [data-col-key="city"] .vg-filter-input input').click()
    await page.keyboard.type('Niš')
    await expect(bar(page)).toContainText(/\d+ of 200 rows/)
    await expect(bar(page)).toContainText('1 filter')
    const shown = await page.locator('.vg-row').count()
    await expect(bar(page)).toContainText(`${shown} of 200 rows`)
    await bar(page).getByRole('button', { name: 'Clear' }).click()
    await expect(bar(page)).toContainText('200 rows')
    await expect(bar(page)).not.toContainText(' of ')
    await expect(bar(page)).not.toContainText('filter')

    // untick everything: the summary goes, the counts stay
    await page.locator('.vg-header input[type="checkbox"]').click() // select all
    await expect(bar(page)).toContainText('200 selected')
    await page.locator('.vg-header input[type="checkbox"]').click() // none
    await expect(bar(page)).not.toContainText('selected')
    await expect(bar(page).locator('.vg-status-summary')).toHaveCount(0)
  })

  test('min and max', async ({ page }) => {
    await story(page, 'min-and-max')
    const stakes = (await tickedStakes(page)).map(money)
    const fmt = (n: number) =>
      `€${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    await expect(bar(page)).toContainText(`Min ${fmt(Math.min(...stakes))}`)
    await expect(bar(page)).toContainText(`Max ${fmt(Math.max(...stakes))}`)
    await expect(bar(page)).not.toContainText('Sum')
  })

  test('the #status-bar slot replaces the content', async ({ page }) => {
    await story(page, 'custom-content')
    await expect(page.getByTestId('custom')).toHaveText('200 bets')
    await page.locator('.vg-row').first().locator('input[type="checkbox"]').click()
    await expect(page.getByTestId('custom')).toContainText('200 bets, 1 ticked · Stake €')
    await expect(bar(page).locator('.vg-status-item')).toHaveCount(0)
  })

  test('server data: the server total; all matching rows hide the summary', async ({ page }) => {
    await story(page, 'server-data')
    await expect(bar(page)).toContainText('240 rows')
    await page.locator('.vg-header input[type="checkbox"]').click()
    await expect(bar(page)).toContainText('10 selected')
    await expect(bar(page)).toContainText('Sum €')
    await page.getByRole('button', { name: 'Select all 240 rows' }).click()
    await expect(bar(page)).toContainText('All 240 selected')
    await expect(bar(page)).not.toContainText('Sum')
  })

  test('phone width: the bar wraps inside the grid, no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await story(page, 'with-summary')
    await expect(bar(page)).toContainText('Average')
    const box = await bar(page).boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(360)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
  })
})
