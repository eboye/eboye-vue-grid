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
  await expect(locked).toHaveAccessibleDescription('Settled markets are locked')
  await valueCell(page, 3).locator('.vg-control').hover()
  await expect(page.locator('.vg-tooltip:popover-open')).toHaveText('Settled markets are locked')
})

test('switch, radio and icon-toggle reflect the applied state', async ({ page }) => {
  await story(page, 'renderers--switch')
  const sw = valueCell(page, 2).getByRole('switch', { name: 'Mobile channel' })
  await expect(sw).toHaveAttribute('aria-checked', 'false')
  await sw.click()
  await expect(sw).toHaveAttribute('aria-checked', 'true')
  const thumb = sw.locator('.vg-switch-thumb')
  // thumb moved to the end (polled: the theme animates it, and a busy machine can catch it mid-way)
  await expect
    .poll(async () => {
      const swBox = (await sw.boundingBox())!
      const thumbBox = (await thumb.boundingBox())!
      return thumbBox.x - swBox.x - (swBox.width / 2 - thumbBox.width)
    })
    .toBeGreaterThan(0)

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

test('text copyable: the copy button (loaded on first use) copies; an empty cell has none', async ({
  page,
  context,
  browserName,
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await story(page, 'renderers--text-copyable')
  const button = valueCell(page, 1).getByRole('button', { name: 'Copy' })
  await expect(button).toBeVisible()
  // it sits after the text, inside the cell
  const [cellBox, textBox, buttonBox] = await Promise.all([
    valueCell(page, 1).boundingBox(),
    valueCell(page, 1).locator('.vg-text').boundingBox(),
    button.boundingBox(),
  ])
  expect(buttonBox!.x).toBeGreaterThanOrEqual(textBox!.x + textBox!.width - 1)
  expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(cellBox!.x + cellBox!.width + 1)
  await button.click()
  await expect(valueCell(page, 1).getByRole('button', { name: 'Copied' })).toBeVisible()
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('TK-2026-000481')
  await expect(valueCell(page, 2).getByRole('button')).toHaveCount(0)
})

for (const [id, kind] of [
  ['renderers--text-ellipsis', 'ellipsis'],
  ['renderers--text-clamp', 'line clamp'],
] as const)
  test(`text ${kind}: the full text is a tooltip only while it is cut off`, async ({ page }) => {
    await story(page, id)
    const tooltip = page.locator('.vg-tooltip')
    const cutText = valueCell(page, 1).locator('.vg-text')
    const shortText = valueCell(page, 2).locator('.vg-text')
    await expect(cutText).not.toHaveAttribute('title') // no native tooltip next to ours
    await cutText.hover()
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toHaveText(/^A fairly long piece of text.+behave\.$/)
    // a popover in the top layer, next to the text and inside the viewport
    const [t, c] = [(await tooltip.boundingBox())!, (await cutText.boundingBox())!]
    expect(t.y + t.height <= c.y + 1 || t.y >= c.y + c.height - 1).toBe(true)
    expect(t.x).toBeGreaterThanOrEqual(0)
    expect(t.x + t.width).toBeLessThanOrEqual(page.viewportSize()!.width)
    // hoverable (WCAG 1.4.13): moving onto it keeps it open
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 4 })
    await page.waitForTimeout(300)
    await expect(tooltip).toBeVisible()
    // dismissible: Esc closes it
    await page.keyboard.press('Escape')
    await expect(tooltip).toBeHidden()
    // text that fits gets none
    await shortText.hover()
    await expect(shortText).toHaveText('Fits')
    await page.waitForTimeout(700)
    await expect(tooltip).toBeHidden()
  })

test("text tooltip: 'always' shows the full text even when it fits", async ({ page }) => {
  await story(page, 'renderers--text-tooltip-always')
  const tooltip = page.locator('.vg-tooltip')
  await valueCell(page, 2).locator('.vg-text').hover()
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText('Fits')
  await page.mouse.move(0, 0)
  await expect(tooltip).toBeHidden()
})

test('tooltips also show on keyboard focus, at once, and hide on blur', async ({ page }) => {
  await story(page, 'renderers--action-button-icon-only')
  const tooltip = page.locator('.vg-tooltip')
  const button = valueCell(page, 1).getByRole('button')
  const name = (await button.getAttribute('aria-label'))!
  await button.focus() // programmatic focus is focus-visible, like Tab
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(name)
  await page.keyboard.press('Escape')
  await expect(tooltip).toBeHidden()
  await button.blur()
  await button.click() // a click focuses too, but shows no tooltip at once
  await page.mouse.move(0, 0)
  await page.waitForTimeout(600)
  await expect(tooltip).toBeHidden()
})

test('actions menu: a disabled item with a reason shows it, reads it out, stays reachable and does nothing', async ({
  page,
}) => {
  await story(page, 'renderers--actions-menu')
  const trigger = valueCell(page, 3).getByRole('button', { name: 'Row actions' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.locator('[role="menu"]:popover-open')
  await expect(menu).toBeVisible()
  const item = menu.getByRole('menuitem', { name: 'Delete', exact: true })
  await expect(item).toHaveAttribute('aria-disabled', 'true')
  await expect(item).toHaveAccessibleDescription('Settled rows can’t be deleted')
  const reason = item.locator('.vg-menu-reason')
  await expect(reason).toBeVisible()
  await expect(reason).toHaveText('Settled rows can’t be deleted')
  // the reason wraps inside the menu instead of widening it past the other items
  const [menuBox, reasonBox] = await Promise.all([menu.boundingBox(), reason.boundingBox()])
  expect(reasonBox!.x + reasonBox!.width).toBeLessThanOrEqual(menuBox!.x + menuBox!.width)
  // keyboard: End reaches it; Enter on it neither chooses it nor closes the menu
  await page.keyboard.press('End')
  await expect(item).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toBeVisible()
  // a real click on it (Playwright's click() refuses aria-disabled elements)
  const itemBox = (await item.boundingBox())!
  await page.mouse.click(itemBox.x + itemBox.width / 2, itemBox.y + itemBox.height / 2)
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
  // without a reason (row 1) Delete is a normal item; a plain `disabled` (row 2) stays skipped
  await valueCell(page, 1).getByRole('button', { name: 'Row actions' }).click()
  await expect(menu.getByRole('menuitem', { name: 'Delete', exact: true })).not.toHaveAttribute(
    'aria-disabled',
  )
  await page.keyboard.press('Escape')
  await valueCell(page, 2).getByRole('button', { name: 'Row actions' }).click()
  await expect(menu.getByRole('menuitem', { name: 'Archive' })).toBeDisabled()
})

test('actions menu: a submenu opens with →, chooses with Enter and closes everything, focus back on ⋯', async ({
  page,
}) => {
  await story(page, 'renderers--actions-menu')
  const trigger = valueCell(page, 1).getByRole('button', { name: 'Row actions' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('menu', { name: 'Row actions' })
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('m') // typeahead → "Move to"
  const parent = page.getByRole('menuitem', { name: 'Move to' })
  await expect(parent).toBeFocused()
  await page.keyboard.press('ArrowRight')
  const sub = page.getByRole('menu', { name: 'Move to' })
  await expect(sub.getByRole('menuitem', { name: 'Open' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter') // "In review"
  await expect(page.locator('[role="menu"]:popover-open')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('details: popover anchored under its button, lists items, closes with Esc and the close button', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
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
  // focus is back on the button, which shows its tooltip once the popup has closed (opening it
  // while the popup closed threw, and the button stopped being an anchor)
  await expect(trigger).toBeFocused()
  // only for visible (keyboard) focus: Chromium and WebKit treat the restored focus as such,
  // Firefox doesn't after a mouse-opened popup
  if (await trigger.evaluate((el) => el.matches(':focus-visible')))
    await expect(page.locator('.vg-tooltip')).toHaveText(/^Details/)
  else await expect(page.locator('.vg-tooltip')).toBeHidden()
  expect(errors).toEqual([])
  await trigger.click()
  // still anchored under its button after the tooltip used it as an anchor too
  const again = (await page.locator('.vg-details-panel:popover-open').boundingBox())!
  expect(Math.abs(again.y - p.y)).toBeLessThan(2)
  expect(Math.abs(again.x - p.x)).toBeLessThan(2)
  await page
    .locator('.vg-details-panel:popover-open')
    .getByRole('button', { name: 'Close' })
    .click()
  await expect(page.locator('.vg-details-panel:popover-open')).toHaveCount(0)
  await expect(valueCell(page, 3).getByRole('button')).toHaveCount(0) // no devices → no button
})

test('a tooltip inside an open popover shows above it and leaves it open', async ({ page }) => {
  await story(page, 'renderers--details')
  await valueCell(page, 1)
    .getByRole('button', { name: /^Details/ })
    .click()
  const panel = page.locator('.vg-details-panel:popover-open')
  await expect(panel).toBeVisible()
  const printer = panel.locator('.vg-details-item').first()
  await expect(printer).toHaveAccessibleDescription('since 10:42')
  await printer.hover()
  const tooltip = page.locator('.vg-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText('since 10:42')
  await expect(panel).toBeVisible()
  // the tooltip is on top: the point at its centre hits it, not the panel
  const t = (await tooltip.boundingBox())!
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x!, y!)?.className,
    [t.x + t.width / 2, t.y + t.height / 2],
  )
  expect(hit).toContain('vg-tooltip')
})

test('details: opened from the keyboard, focus moves into the dialog and Esc brings it back', async ({
  page,
}) => {
  await story(page, 'renderers--details')
  const trigger = valueCell(page, 1).getByRole('button', { name: /^Details/ })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.locator('.vg-details-panel:popover-open')
  await expect(dialog).toHaveRole('dialog')
  await expect(dialog).toBeFocused()
  await page.keyboard.press('Tab') // into it: the close button
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('json-tree: nested levels keep the same text size (it does not shrink with depth)', async ({
  page,
}) => {
  await story(page, 'renderers--json-tree')
  const closed = page.locator('#storybook-root .vg-json-node details:not([open]) > summary')
  for (let i = 0; i < 6 && (await closed.count()); i++) await closed.first().click()
  const sizes = await page.evaluate(() => {
    const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize)
    const tree = document.querySelector('#storybook-root .vg-json-tree')!
    const depth = (el: Element) => {
      let d = 0
      for (let p = el.parentElement; p && p !== tree; p = p.parentElement)
        if (p.classList.contains('vg-json-children')) d++
      return d
    }
    const keys = [...tree.querySelectorAll('.vg-json-key')]
    const deepest = keys.reduce((a, b) => (depth(b) > depth(a) ? b : a))
    return { root: px(tree), deepest: px(deepest), depth: depth(deepest) }
  })
  expect(sizes.depth).toBeGreaterThanOrEqual(2)
  expect(sizes.deepest).toBe(sizes.root)
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
