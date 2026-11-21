import { expect, test, type Page } from '@playwright/test'

// Real-input checks of the interactive renderers, against their Storybook stories.
// `npm run e2e:storybook` (starts Storybook unless one is already running on :6006).
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root [role="grid"]').waitFor()
}
const valueCell = (page: Page, row: number) =>
  page.locator(`[data-row-key="${row}"] > [data-col-key="value"]`)

test('checkbox: click and keyboard request a change; the story applies it; disabled shows a reason', async ({
  page,
}) => {
  await story(page, 'renderers--checkbox')
  const box = valueCell(page, 2).getByRole('checkbox')
  await expect(box).not.toBeChecked()
  await box.click()
  await expect(box).toBeChecked()
  // keyboard: focus the cell (grid navigation), Enter moves into the control, Space toggles it
  await valueCell(page, 1).click({ position: { x: 4, y: 4 } })
  await page.keyboard.press('Enter')
  await expect(valueCell(page, 1).getByRole('checkbox')).toBeFocused()
  await page.keyboard.press('Space')
  await expect(valueCell(page, 1).getByRole('checkbox')).not.toBeChecked()
  const locked = valueCell(page, 3).getByRole('checkbox')
  await expect(locked).toBeDisabled()
  await expect(valueCell(page, 3).locator('.vg-control')).toHaveAttribute(
    'title',
    'Settled markets are locked',
  )
})

test('switch, radio and icon-toggle reflect the applied state', async ({ page }) => {
  await story(page, 'renderers--switch')
  const sw = valueCell(page, 2).getByRole('switch', { name: 'Mobile channel' })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  const thumb = sw.locator('.vg-switch-thumb')
  const swBox = (await sw.boundingBox())!
  const thumbBox = (await thumb.boundingBox())!
  expect(thumbBox.x - swBox.x).toBeGreaterThan(swBox.width / 2 - thumbBox.width) // thumb moved to the end

  await story(page, 'renderers--radio')
  await valueCell(page, 3).getByRole('radio').click()
  await expect(valueCell(page, 3).getByRole('radio')).toBeChecked()
  await expect(valueCell(page, 1).getByRole('radio')).not.toBeChecked()

  await story(page, 'renderers--icon-toggle')
  const star = valueCell(page, 2).getByRole('button', { name: 'Favourite' })
  await expect(star).toHaveAttribute('aria-pressed', 'false')
  await star.click()
  await expect(star).toHaveAttribute('aria-pressed', 'true')
})

test('copy: writes the value to the clipboard and confirms', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await story(page, 'renderers--copy')
  const button = valueCell(page, 1).getByRole('button', { name: 'Copy Serial number' })
  await button.click()
  await expect(valueCell(page, 1).getByRole('button', { name: 'Copied' })).toBeVisible()
  if (browserName === 'chromium') {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('SN-7F3A-22C9')
  }
})

test('details: popover anchored under its button, lists items, closes with Esc and the close button', async ({
  page,
}) => {
  await story(page, 'renderers--details')
  const trigger = valueCell(page, 1).getByRole('button', { name: /^Details/ })
  await trigger.click()
  const panel = page.locator('.vg-details-panel:popover-open')
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('Printer')
  await expect(panel).toContainText('Paper jam')
  const t = (await trigger.boundingBox())!
  const p = (await panel.boundingBox())!
  expect(p.y).toBeGreaterThanOrEqual(t.y + t.height - 1)
  expect(p.y - (t.y + t.height)).toBeLessThan(12)
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await trigger.click()
  await page
    .locator('.vg-details-panel:popover-open')
    .getByRole('button', { name: 'Close' })
    .click()
  await expect(page.locator('.vg-details-panel:popover-open')).toHaveCount(0)
  await expect(valueCell(page, 3).getByRole('button')).toHaveCount(0) // no devices → no button
})

test('native <details>: list "+N more", collapsed json-tree and tree nodes, by mouse and keyboard', async ({
  page,
}) => {
  await story(page, 'renderers--list')
  const cell = valueCell(page, 1)
  const visibleItems = cell.locator('li:visible')
  await expect(visibleItems).toHaveCount(1)
  await cell.locator('summary', { hasText: '+2 more' }).click()
  await expect(visibleItems).toHaveCount(3)
  // "Show less" sits under the revealed items
  const less = cell.locator('summary', { hasText: 'Show less' })
  await expect(less).toBeVisible()
  expect((await less.boundingBox())!.y).toBeGreaterThan(
    (await visibleItems.last().boundingBox())!.y,
  )
  await less.click()
  await expect(visibleItems).toHaveCount(1)
  // keyboard: focus the summary and press Enter
  await cell.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(visibleItems).toHaveCount(3)

  await story(page, 'renderers--json-tree-nested')
  const tree = valueCell(page, 1)
  await expect(tree.locator('.vg-json-tree')).toBeHidden()
  await tree.locator('summary', { hasText: 'More info' }).click()
  await expect(tree.locator('.vg-json-tree')).toBeVisible()
  await expect(tree.locator('.vg-json-tree')).toContainText('home')
  // collapse a node, then expand it again
  const payload = tree.locator('.vg-json-node summary', { hasText: 'payload' })
  await payload.click()
  await expect(tree.getByText('home')).toBeHidden()
  await payload.click()
  await expect(tree.getByText('home')).toBeVisible()
})

test('chip text colour is chosen in CSS for raw data colours', async ({ page }) => {
  await story(page, 'renderers--chip')
  const colour = (row: number) =>
    valueCell(page, row)
      .locator('.vg-chip')
      .evaluate((el) => getComputedStyle(el).color)
  expect(await colour(2)).toBe('rgb(0, 0, 0)') // yellow → black text
  expect(await colour(3)).toBe('rgb(255, 255, 255)') // dark red → white text
  expect(await valueCell(page, 2).locator('.vg-chip').getAttribute('style')).not.toMatch(
    /(^|;\s*)color:/,
  ) // not set by JS
})

test('recipes grid: switches and stars apply, popover opens, layout fits', async ({ page }) => {
  await story(page, 'recipes-back-office-grid--bet-monitor')
  const web = page.locator('[data-row-key="2"] > [data-col-key="web"]').getByRole('switch')
  await web.click()
  await expect(web).toHaveAttribute('aria-checked', 'true')
  const star = page.locator('[data-row-key="3"] > [data-col-key="favourite"]').getByRole('button')
  await star.click()
  await expect(star).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-row-key="2"] > [data-col-key="terminal"]').getByRole('button').click()
  await expect(page.locator('.vg-details-panel:popover-open')).toContainText('Paper jam')
  await page.keyboard.press('Escape')
  // chips and badges keep their size inside a cell
  const chip = page.locator('[data-row-key="1"] .vg-chip')
  const c = (await chip.boundingBox())!
  expect(Math.round(c.height)).toBe(28)
})
