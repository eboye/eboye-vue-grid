import { expect, test, type Page } from '@playwright/test'

// Grid / Range selection / Paste into a range: real keyboard copy (Ctrl/⌘+C) and paste (Ctrl/⌘+V)
// through the browser's clipboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-range-selection--paste-into-a-range&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const report = (page: Page) => page.getByTestId('paste-report')

/** Puts text on the clipboard the way a user does: select it in a text box, Ctrl/⌘+C. */
async function copy(page: Page, text: string) {
  const box = page.getByTestId('sample')
  await box.fill(text)
  await box.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+c')
}

test('Ctrl+V pastes a spreadsheet block from the clicked cell, typed and selected', async ({
  page,
}) => {
  await open(page)
  await copy(page, 'Jovana Test\tNovi Sad\tWon\t1,234.50\nMarko Test\tNiš\tlost\t€99')
  await cell(page, 1, 'player').click()
  await page.keyboard.press('ControlOrMeta+v')
  await expect(cell(page, 1, 'player')).toHaveText('Jovana Test')
  await expect(cell(page, 1, 'city')).toHaveText('Novi Sad')
  await expect(cell(page, 1, 'status')).toContainText('Won')
  await expect(cell(page, 1, 'stake')).toHaveText(/1,234\.50/)
  await expect(cell(page, 2, 'player')).toHaveText('Marko Test')
  await expect(cell(page, 2, 'status')).toContainText('Lost') // matched case-insensitively
  await expect(cell(page, 2, 'stake')).toHaveText(/99\.00/)
  await expect(report(page)).toContainText('8 changed, 0 skipped')
  // the pasted area is the range now, and focus is back on the cell
  await expect(page.locator('.vg-cell.vg-in-range')).toHaveCount(8)
  await expect(cell(page, 1, 'player')).toBeFocused()
  expect(await page.locator('body > textarea').count()).toBe(0)
})

test('one value fills the selected range; read-only and invalid cells are skipped', async ({
  page,
}) => {
  await open(page)
  await copy(page, '7')
  await cell(page, 3, 'stake').click()
  await cell(page, 6, 'stake').click({ modifiers: ['Shift'] })
  await page.keyboard.press('ControlOrMeta+v')
  for (const id of [3, 4, 5, 6]) await expect(cell(page, id, 'stake')).toHaveText(/^\D*7\.00/)
  await expect(report(page)).toContainText('changed, 0 skipped')
  // the # column isn't editable, and "7" isn't a status
  await copy(page, '7')
  await cell(page, 8, 'id').click()
  await cell(page, 8, 'status').click({ modifiers: ['Shift'] })
  const status = await cell(page, 8, 'status').innerText()
  await page.keyboard.press('ControlOrMeta+v')
  await expect(report(page)).toContainText('id #8: read-only')
  await expect(report(page)).toContainText('status #8: invalid')
  await expect(cell(page, 8, 'player')).toHaveText('7')
  expect(await cell(page, 8, 'status').innerText()).toBe(status)
})

test('round trip: copy a block of the grid with Ctrl+C, paste it lower down with Ctrl+V', async ({
  page,
}) => {
  await open(page)
  const source = {
    city: [await cell(page, 1, 'city').innerText(), await cell(page, 2, 'city').innerText()],
    status: [await cell(page, 1, 'status').innerText(), await cell(page, 2, 'status').innerText()],
  }
  await cell(page, 1, 'city').click()
  await cell(page, 2, 'status').click({ modifiers: ['Shift'] })
  await page.keyboard.press('ControlOrMeta+c')
  await cell(page, 10, 'city').click()
  await page.keyboard.press('ControlOrMeta+v')
  await expect(cell(page, 10, 'city')).toHaveText(source.city[0]!)
  await expect(cell(page, 11, 'city')).toHaveText(source.city[1]!)
  await expect(cell(page, 10, 'status')).toHaveText(source.status[0]!)
  await expect(cell(page, 11, 'status')).toHaveText(source.status[1]!)
})

test('Ctrl+V while editing a cell pastes into the editor, not the range', async ({ page }) => {
  await open(page)
  await copy(page, 'Pasted Name')
  await cell(page, 4, 'player').dblclick()
  const editor = page.locator('.vg-editor-control')
  await expect(editor).toBeFocused()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+v')
  await expect(editor).toHaveValue('Pasted Name')
  await page.keyboard.press('Enter')
  await expect(cell(page, 4, 'player')).toHaveText('Pasted Name')
  await expect(cell(page, 5, 'player')).not.toHaveText('Pasted Name')
})
