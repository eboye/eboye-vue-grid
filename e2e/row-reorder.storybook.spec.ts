import { expect, test, type Page } from '@playwright/test'

// Row reordering (Grid/Row reorder): the handle with a real mouse, Alt+↑ / Alt+↓, nested rows.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page, story = 'reorder') => {
  await page.goto(`${base}/iframe.html?id=grid-row-reorder--${story}&viewMode=story`)
  await page.locator('.vg-row-handle').first().waitFor()
}
const order = (page: Page) => page.getByTestId('order')
const handle = (page: Page, id: number) =>
  page.locator(`.vg-row[data-row-key="${id}"] .vg-row-handle`)
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > [data-col-key="${key}"]`)
const focused = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement
    return `${(a?.closest('.vg-row') as HTMLElement | null)?.dataset.rowKey}:${(a?.closest('[data-col-key]') as HTMLElement | null)?.dataset.colKey}`
  })

/** Drags a row by its handle onto the top or bottom half of another row, with the mouse. */
async function drag(page: Page, from: number, to: number, side: 'before' | 'after') {
  await handle(page, from).scrollIntoViewIfNeeded()
  const h = (await handle(page, from).boundingBox())!
  const t = (await cell(page, to, 'title').boundingBox())!
  const y = side === 'before' ? t.y + 4 : t.y + t.height - 4
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(t.x + 30, (h.y + y) / 2, { steps: 4 })
  await page.mouse.move(t.x + 30, y, { steps: 4 })
  await expect(page.locator(`.vg-row[data-row-key="${to}"]`)).toHaveAttribute('data-vg-drop', side)
  await expect(page.locator(`.vg-row[data-row-key="${from}"]`)).toHaveAttribute(
    'data-vg-dragging',
    '',
  )
  await page.mouse.up()
  await expect(page.locator('[data-vg-drop], [data-vg-dragging]')).toHaveCount(0)
}

test('drag a row by its handle: a line shows where it lands, row-move moves it', async ({
  page,
}) => {
  await open(page)
  await drag(page, 1, 3, 'after')
  await expect(order(page)).toHaveText('2,3,1,4,5,6,7,8,9,10,11,12')
  await expect(page.getByTestId('last-move')).toHaveText('Task 1 after Task 3 (drag)')
  await drag(page, 5, 2, 'before')
  await expect(order(page)).toHaveText('5,2,3,1,4,6,7,8,9,10,11,12')
})

test('dragging to the bottom edge scrolls the grid; the row lands at the end', async ({ page }) => {
  await open(page)
  const grid = page.locator('#storybook-root .vg')
  const h = (await handle(page, 1).boundingBox())!
  const g = (await grid.boundingBox())!
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + 40, g.y + g.height - 8, { steps: 6 })
  // held at the edge: the grid scrolls to the end
  await expect
    .poll(() => grid.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
    .toBeLessThan(2)
  const last = (await cell(page, 12, 'title').boundingBox())!
  await page.mouse.move(last.x + 30, last.y + last.height - 4, { steps: 3 })
  await expect(page.locator('.vg-row[data-row-key="12"]')).toHaveAttribute('data-vg-drop', 'after')
  await page.mouse.up()
  await expect(order(page)).toHaveText('2,3,4,5,6,7,8,9,10,11,12,1')
})

test('Alt+↑ / Alt+↓ move the focused row; focus stays with it; plain arrows only move focus', async ({
  page,
}) => {
  await open(page)
  await cell(page, 2, 'owner').click()
  await page.keyboard.press('Alt+ArrowDown')
  await expect(order(page)).toHaveText('1,3,2,4,5,6,7,8,9,10,11,12')
  await expect(page.getByTestId('last-move')).toHaveText('Task 2 after Task 3 (keyboard)')
  expect(await focused(page)).toBe('2:owner')
  await page.keyboard.press('Alt+ArrowUp')
  await page.keyboard.press('Alt+ArrowUp')
  await expect(order(page)).toHaveText('2,1,3,4,5,6,7,8,9,10,11,12')
  expect(await focused(page)).toBe('2:owner')
  await page.keyboard.press('Alt+ArrowUp') // already first: nothing
  await expect(order(page)).toHaveText('2,1,3,4,5,6,7,8,9,10,11,12')
  await page.keyboard.press('ArrowDown')
  await expect(order(page)).toHaveText('2,1,3,4,5,6,7,8,9,10,11,12')
  expect(await focused(page)).toBe('1:owner')
})

test('while sorted, the handles are off and Alt+↓ does nothing', async ({ page }) => {
  await open(page)
  await page.locator('.vg-header > [data-col-key="owner"] .vg-sort').click()
  await expect(handle(page, 1)).toBeDisabled()
  const before = await order(page).innerText()
  await cell(page, 1, 'title').click()
  await page.keyboard.press('Alt+ArrowDown')
  await expect(order(page)).toHaveText(before)
})

test('nested rows move among their siblings only', async ({ page }) => {
  await open(page, 'nested-rows')
  const kids = () =>
    page
      .locator('[data-subgrid-for="1"] > .vg-row[data-row-key]')
      .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.rowKey).join(','))
  await drag(page, 101, 103, 'after')
  await expect.poll(kids).toBe('102,103,101')
  await expect(page.getByTestId('last-move')).toHaveText('Task 1.1 after Task 1.3 (drag)')
  // onto a top-level row: no drop line, nothing moves
  await handle(page, 102).scrollIntoViewIfNeeded()
  const h = (await handle(page, 102).boundingBox())!
  const t = (await cell(page, 3, 'title').boundingBox())!
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(t.x + 30, t.y + t.height - 4, { steps: 6 })
  await expect(page.locator('[data-vg-drop]')).toHaveCount(0)
  await page.mouse.up()
  await expect.poll(kids).toBe('102,103,101')
  await expect(order(page)).toHaveText('1,2,3,4')
})
