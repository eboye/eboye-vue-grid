import { expect, test, type Page } from '@playwright/test'

// Grid / Range selection: real mouse drags, Shift+click and keys.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page, story = 'range-selection') => {
  await page.goto(`${base}/iframe.html?id=grid-range-selection--${story}&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const inRange = (page: Page) => page.locator('.vg-cell.vg-in-range')
const bar = (page: Page) => page.locator('.vg-status-range')
const center = async (page: Page, id: number, key: string) => {
  const box = (await cell(page, id, key).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('drag across cells: a block, outlined, counted, no text selected', async ({ page }) => {
  await open(page)
  const from = await center(page, 1, 'city')
  const to = await center(page, 3, 'stake')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
  // City, Status, Stake × rows 1–3
  await expect(inRange(page)).toHaveCount(9)
  await expect(cell(page, 1, 'city')).toHaveClass(/vg-range-top/)
  await expect(cell(page, 1, 'city')).toHaveClass(/vg-range-left/)
  await expect(cell(page, 3, 'stake')).toHaveClass(/vg-range-bottom/)
  await expect(cell(page, 3, 'stake')).toHaveClass(/vg-range-right/)
  await expect(cell(page, 2, 'status')).toHaveAttribute('aria-selected', 'true')
  expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('')
  await expect(bar(page)).toContainText('9 cells')
  await expect(bar(page)).toContainText('Sum')
  await expect(page.getByTestId('range')).toContainText('"columnKey":"city"')
  // the outline is drawn (box-shadow), the cells tinted
  const shadow = (id: number, key: string) =>
    cell(page, id, key).evaluate((el) => getComputedStyle(el).boxShadow)
  expect(await shadow(1, 'city')).toMatch(/0px 2px 0px 0px inset/) // top edge
  expect(await shadow(1, 'city')).toMatch(/\) 2px 0px 0px 0px inset/) // left edge
  expect(await shadow(2, 'status')).not.toMatch(/2px/) // inside: no edge
  expect(
    await cell(page, 2, 'status').evaluate((el) => getComputedStyle(el).backgroundColor),
  ).not.toBe(await cell(page, 2, 'player').evaluate((el) => getComputedStyle(el).backgroundColor))
  // Ctrl/⌘+C copies the block as tab-separated lines
  await page.keyboard.press('ControlOrMeta+c')
  const copied = page.getByTestId('copied')
  await expect(copied).not.toHaveText('')
  const lines = (await copied.textContent())!.split('\n')
  expect(lines).toHaveLength(3)
  expect(lines.every((l) => l.split('\t').length === 3)).toBe(true)
  // a plain click: one cell, no range
  await cell(page, 5, 'player').click()
  await expect(inRange(page)).toHaveCount(0)
  await expect(page.getByTestId('range')).toHaveText('range: none')
})

test('Shift+click extends from the clicked cell; Esc clears', async ({ page }) => {
  await open(page)
  await cell(page, 2, 'player').click()
  await cell(page, 4, 'stake').click({ modifiers: ['Shift'] })
  // Player, City, Status, Stake × rows 2–4
  await expect(inRange(page)).toHaveCount(12)
  // the stake column alone: sum formatted as money
  await cell(page, 1, 'stake').click()
  await cell(page, 4, 'stake').click({ modifiers: ['Shift'] })
  await expect(inRange(page)).toHaveCount(4)
  await expect(bar(page)).toContainText(/4 cells:\s*Sum\s*\S*\d/)
  await expect(bar(page)).toContainText(/[$€]/)
  await page.keyboard.press('Escape')
  await expect(inRange(page)).toHaveCount(0)
  await expect(bar(page)).toHaveCount(0)
})

test('keyboard: Shift+arrows extend from the focused cell, Ctrl+A takes every cell', async ({
  page,
}) => {
  await open(page)
  await cell(page, 3, 'city').click()
  await page.keyboard.press('Shift+ArrowDown')
  await page.keyboard.press('Shift+ArrowDown')
  await page.keyboard.press('Shift+ArrowRight')
  await expect(inRange(page)).toHaveCount(6)
  await expect(cell(page, 5, 'status')).toHaveClass(/vg-range-bottom/)
  // focus stays where the range started
  await expect(cell(page, 3, 'city')).toBeFocused()
  await page.keyboard.press('Shift+ArrowUp')
  await expect(inRange(page)).toHaveCount(4)
  // a plain arrow moves on and drops the range
  await page.keyboard.press('ArrowDown')
  await expect(inRange(page)).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+a')
  await expect(bar(page)).toContainText('280 cells') // 40 rows × 7 columns
})

test('a range follows sorting (same corners, rows between them now)', async ({ page }) => {
  await open(page)
  await cell(page, 1, 'player').click()
  await cell(page, 2, 'player').click({ modifiers: ['Shift'] })
  await expect(inRange(page)).toHaveCount(2)
  await page.locator('.vg-header [data-col-key="player"] .vg-sort').click()
  await expect(cell(page, 1, 'player')).toHaveClass(/vg-in-range/)
  await expect(cell(page, 2, 'player')).toHaveClass(/vg-in-range/)
  const n = await inRange(page).count()
  expect(n).toBeGreaterThanOrEqual(2)
})

test('with row selection: checkboxes select rows; Ctrl+C copies the range, not the rows', async ({
  page,
}) => {
  await open(page, 'with-row-selection')
  await cell(page, 2, 'select' as never)
    .or(page.locator('.vg-row[data-row-key="2"] .vg-checkbox input'))
    .first()
    .click()
  await expect(page.locator('.vg-row[data-row-key="2"]')).toHaveClass(/vg-row-selected/)
  const from = await center(page, 4, 'stake')
  const to = await center(page, 6, 'stake')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
  await expect(inRange(page)).toHaveCount(3)
  // the row stays selected
  await expect(page.locator('.vg-row[data-row-key="2"]')).toHaveClass(/vg-row-selected/)
  await page.keyboard.press('ControlOrMeta+c')
  await expect(page.getByTestId('copied')).not.toHaveText('')
  expect((await page.getByTestId('copied').textContent())!.split('\n')).toHaveLength(3)
})

test('dragging past the bottom edge scrolls the grid, and the range follows', async ({ page }) => {
  await open(page)
  const grid = page.locator('#storybook-root .vg')
  const box = (await grid.boundingBox())!
  const from = await center(page, 1, 'stake')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, box.y + box.height - 40, { steps: 6 })
  await page.mouse.move(from.x, box.y + box.height + 30, { steps: 4 }) // below the grid
  await expect.poll(() => grid.evaluate((el) => el.scrollTop)).toBeGreaterThan(300)
  await page.mouse.up()
  const top = await grid.evaluate((el) => el.scrollTop)
  // the range reaches the rows scrolled into view
  const count = await inRange(page).count()
  expect(count).toBeGreaterThan(10)
  const lastRow = await page
    .locator('.vg-cell.vg-range-bottom')
    .first()
    .evaluate((el) => Number(el.parentElement!.dataset.rowKey))
  expect(lastRow).toBeGreaterThan(10)
  // after the drag, no more scrolling
  await page.waitForTimeout(300)
  expect(await grid.evaluate((el) => el.scrollTop)).toBe(top)
})
