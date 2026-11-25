import { expect, test, type Page } from '@playwright/test'

// Delete / Backspace and Ctrl/⌘+X on a range (range selection + editing), with the real keyboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-range-selection--paste-into-a-range&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)

test('Delete clears the selected cells; read-only ones stay; Ctrl+Z brings them back', async ({
  page,
}) => {
  await open(page)
  const ids = [await cell(page, 2, 'id').innerText(), await cell(page, 3, 'id').innerText()]
  const players = [
    await cell(page, 2, 'player').innerText(),
    await cell(page, 3, 'player').innerText(),
  ]
  await cell(page, 2, 'id').click()
  await cell(page, 3, 'city').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Delete')
  for (const id of [2, 3]) {
    await expect(cell(page, id, 'player')).toHaveText('')
    await expect(cell(page, id, 'city')).toHaveText('')
  }
  // # isn't editable
  await expect(cell(page, 2, 'id')).toHaveText(ids[0]!)
  await expect(cell(page, 3, 'id')).toHaveText(ids[1]!)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(cell(page, 2, 'player')).toHaveText(players[0]!)
  await expect(cell(page, 3, 'player')).toHaveText(players[1]!)
})

test('Backspace clears the clicked cell; in an open editor it only edits the text', async ({
  page,
}) => {
  await open(page)
  await cell(page, 4, 'stake').click()
  await page.keyboard.press('Backspace')
  await expect(cell(page, 4, 'stake')).toHaveText('')
  const name = await cell(page, 5, 'player').innerText()
  await cell(page, 5, 'player').dblclick()
  await expect(page.locator('.vg-editor-control')).toBeFocused()
  await page.keyboard.press('End')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Enter')
  await expect(cell(page, 5, 'player')).toHaveText(name.slice(0, -1))
})

test('Ctrl+C keeps the range selected (also when the copy falls back to a text area)', async ({
  page,
}) => {
  await open(page)
  await cell(page, 6, 'player').click()
  await cell(page, 7, 'city').click({ modifiers: ['Shift'] })
  await expect(page.locator('.vg-cell.vg-in-range')).toHaveCount(4)
  await page.keyboard.press('ControlOrMeta+c')
  await expect(page.getByTestId('paste-report')).toBeVisible()
  await page.waitForTimeout(300)
  await expect(page.locator('.vg-cell.vg-in-range')).toHaveCount(4)
})

test('Ctrl+X then Ctrl+V moves cells', async ({ page }) => {
  await open(page)
  const before = [
    [await cell(page, 1, 'player').innerText(), await cell(page, 1, 'city').innerText()],
    [await cell(page, 2, 'player').innerText(), await cell(page, 2, 'city').innerText()],
  ]
  await cell(page, 1, 'player').click()
  await cell(page, 2, 'city').click({ modifiers: ['Shift'] })
  await page.keyboard.press('ControlOrMeta+x')
  await expect(cell(page, 1, 'player')).toHaveText('')
  await expect(cell(page, 2, 'city')).toHaveText('')
  await cell(page, 10, 'player').click()
  await page.keyboard.press('ControlOrMeta+v')
  await expect(cell(page, 10, 'player')).toHaveText(before[0]![0]!)
  await expect(cell(page, 10, 'city')).toHaveText(before[0]![1]!)
  await expect(cell(page, 11, 'player')).toHaveText(before[1]![0]!)
  await expect(cell(page, 11, 'city')).toHaveText(before[1]![1]!)
})
