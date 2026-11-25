import { expect, test, type Page } from '@playwright/test'

// The fill handle (range selection + editing): a real mouse on the square, Ctrl/⌘+D, undo.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-range-selection--paste-into-a-range&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)

/** Presses the fill handle (the square in the cell's bottom-right corner) and drags to a cell. */
async function dragHandle(page: Page, from: [number, string], to: [number, string]) {
  // both inside the grid's view: past its edge the drag scrolls and fills on (tested elsewhere)
  await cell(page, ...to).scrollIntoViewIfNeeded()
  const a = (await cell(page, ...from).boundingBox())!
  const b = (await cell(page, ...to).boundingBox())!
  await page.mouse.move(a.x + a.width - 3, a.y + a.height - 3)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 })
  return async () => page.mouse.up()
}

test('the handle shows on the clicked cell; dragging it down copies the value', async ({
  page,
}) => {
  await open(page)
  await cell(page, 2, 'player').click()
  const corner = cell(page, 2, 'player')
  await expect(corner).toHaveClass(/vg-range-corner/)
  const handle = await corner.evaluate((el) => {
    const s = getComputedStyle(el, '::after')
    return { w: s.width, h: s.height, cursor: s.cursor, bg: s.backgroundColor }
  })
  expect(handle).toMatchObject({ w: '8px', h: '8px', cursor: 'crosshair' })
  const name = await corner.innerText()
  const release = await dragHandle(page, [2, 'player'], [5, 'player'])
  // while dragging: the cells it will fill, dashed
  await expect(page.locator('.vg-fill-preview')).toHaveCount(3)
  await release()
  for (const id of [3, 4, 5]) await expect(cell(page, id, 'player')).toHaveText(name)
  await expect(page.locator('.vg-cell.vg-in-range')).toHaveCount(4)
  await expect(page.locator('.vg-fill-preview')).toHaveCount(0)
  // one Ctrl+Z undoes the whole fill
  const was = await cell(page, 6, 'player').innerText()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(cell(page, 3, 'player')).not.toHaveText(name)
  expect(await cell(page, 6, 'player').innerText()).toBe(was)
})

test('a date goes on day by day; two numbers continue their step', async ({ page }) => {
  await open(page)
  const day = (t: string) => new Date(t).getTime()
  await cell(page, 1, 'placedAt').click()
  const first = await cell(page, 1, 'placedAt').innerText()
  const release = await dragHandle(page, [1, 'placedAt'], [3, 'placedAt'])
  await release()
  await expect
    .poll(async () => day(await cell(page, 3, 'placedAt').innerText()) - day(first))
    .toBe(2 * 86_400_000)
  // stakes: type 100 and 150, then drag on: 200, 250
  for (const [id, v] of [
    [8, '100'],
    [9, '150'],
  ] as const) {
    await cell(page, id, 'stake').dblclick()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type(v)
    await page.keyboard.press('Enter')
  }
  await cell(page, 8, 'stake').click()
  await cell(page, 9, 'stake').click({ modifiers: ['Shift'] })
  const go = await dragHandle(page, [9, 'stake'], [11, 'stake'])
  await go()
  await expect(cell(page, 10, 'stake')).toHaveText(/200\.00/)
  await expect(cell(page, 11, 'stake')).toHaveText(/250\.00/)
})

test('Ctrl+D fills the selected range down from its top row', async ({ page }) => {
  await open(page)
  const city = await cell(page, 12, 'city').innerText()
  await cell(page, 12, 'city').click()
  await cell(page, 15, 'city').click({ modifiers: ['Shift'] })
  await page.keyboard.press('ControlOrMeta+d')
  for (const id of [13, 14, 15]) await expect(cell(page, id, 'city')).toHaveText(city)
  await expect(page.getByTestId('paste-report')).toContainText('none yet') // fill isn't paste
})
