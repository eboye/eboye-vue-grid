import { expect, test, type Page } from '@playwright/test'

// The text renderer's `hoverCard` and multi-line tooltips, on `renderers--text-hover-card`.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${base}/iframe.html?id=renderers--text-hover-card&viewMode=story`)
  await page.locator('#storybook-root [role="grid"]').waitFor()
  return errors
}
const value = (page: Page, row: number) =>
  page.locator(`[data-row-key="${row}"] > [data-col-key="value"]`)
const card = (page: Page) => page.locator('.vg-hovercard:popover-open')

test('hover opens the card under its text after a delay; focus stays; it stays while hovered', async ({
  page,
}) => {
  const errors = await open(page)
  const trigger = value(page, 1).getByRole('button', { name: 'Ana Petrović' })
  await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  await trigger.hover()
  await expect(card(page)).toBeVisible()
  const dialog = page.getByRole('dialog', { name: 'Payout account' })
  await expect(dialog).toContainText('IBAN')
  await expect(dialog).toContainText('RS35 1050 0812 3123 1231 73')
  await expect(dialog.getByRole('button')).toHaveCount(2) // the holder line has copy: false
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(trigger).not.toBeFocused()
  // below its text, in the viewport
  const [t, c] = [(await trigger.boundingBox())!, (await card(page).boundingBox())!]
  expect(c.y).toBeGreaterThanOrEqual(t.y + t.height - 1)
  expect(c.x + c.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  // moving onto the card keeps it; leaving both closes it
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 5 })
  await page.waitForTimeout(400)
  await expect(card(page)).toBeVisible()
  await page.mouse.move(c.x + c.width + 200, c.y + c.height + 200)
  await expect(card(page)).toHaveCount(0)
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(errors).toEqual([])
})

test('click and Enter open it with focus inside; Tab moves through it; Esc returns focus', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const errors = await open(page)
  const trigger = value(page, 1).getByRole('button', { name: 'Ana Petrović' })
  await trigger.click()
  await expect(card(page)).toBeVisible()
  const copyIban = page.getByRole('button', { name: 'Copy: IBAN' })
  await expect(copyIban).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Copy: SWIFT' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'RS35 1050 0812 3123 1231 73',
    )
  await page.keyboard.press('Escape')
  await expect(card(page)).toHaveCount(0)
  await expect(trigger).toBeFocused()
  // Enter on the focused text opens it again, focus inside; a second click closes it
  await page.keyboard.press('Enter')
  await expect(copyIban).toBeFocused()
  await trigger.click()
  await expect(card(page)).toHaveCount(0)
  expect(errors).toEqual([])
})

test('a card opened by hover takes focus when its text is clicked, and stays open', async ({
  page,
}) => {
  await open(page)
  const trigger = value(page, 1).getByRole('button', { name: 'Ana Petrović' })
  await trigger.hover()
  await expect(card(page)).toBeVisible()
  await trigger.click()
  await expect(card(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy: IBAN' })).toBeFocused()
})

test("copy: 'all' copies every line, one per line", async ({ page, context, browserName }) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  await value(page, 2).getByRole('button', { name: '3 tickets' }).click()
  const dialog = page.getByRole('dialog', { name: '3 tickets' })
  await expect(dialog.getByRole('listitem')).toHaveCount(3)
  await expect(dialog.getByRole('button')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Copy: 3 tickets' }).click()
  await expect(dialog.getByRole('button', { name: 'Copied' })).toBeVisible()
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'TK-2026-000481\nTK-2026-000482\nTK-2026-000483',
    )
})

test('a tooltip function can return lines: one per line in the tooltip', async ({ page }) => {
  await open(page)
  const text = value(page, 3).locator('.vg-text')
  await expect(text).toHaveAccessibleDescription(/Opened 10:42\s+Closed 11:07/)
  await text.hover()
  const tooltip = page.locator('.vg-tooltip')
  await expect(tooltip).toBeVisible()
  expect(await tooltip.evaluate((el) => (el as HTMLElement).innerText)).toBe(
    'Opened 10:42\nClosed 11:07',
  )
  const lineHeight = await tooltip.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight))
  expect((await tooltip.boundingBox())!.height).toBeGreaterThan(lineHeight * 1.8)
})

test('a press outside closes it; so does tabbing out of it; keys inside stay out of the grid', async ({
  page,
}) => {
  await open(page)
  const trigger = value(page, 1).getByRole('button', { name: 'Ana Petrović' })
  await trigger.click()
  await expect(card(page)).toBeVisible()
  // arrow keys inside the card don't move the grid's focus out of it
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Copy: IBAN' })).toBeFocused()
  await page.mouse.click(5, 5)
  await expect(card(page)).toHaveCount(0)
  await trigger.click()
  await expect(page.getByRole('button', { name: 'Copy: IBAN' })).toBeFocused()
  await page.keyboard.press('Tab') // SWIFT
  await page.keyboard.press('Tab') // out of the card
  await expect(card(page)).toHaveCount(0)
})
