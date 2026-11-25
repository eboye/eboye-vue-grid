import { expect, test, type Page } from '@playwright/test'

// Undo / redo (editing feature): real keys and the toolbar's buttons, on the paste story.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-range-selection--paste-into-a-range&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const editor = (page: Page) => page.locator('.vg-editor-control')

async function copy(page: Page, text: string) {
  const box = page.getByTestId('sample')
  await box.fill(text)
  await box.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('ControlOrMeta+c')
}

test('Ctrl+Z undoes a whole paste, Ctrl+Y / Ctrl+Shift+Z redo it', async ({ page }) => {
  await open(page)
  const before = [
    await cell(page, 2, 'player').innerText(),
    await cell(page, 2, 'city').innerText(),
    await cell(page, 3, 'player').innerText(),
    await cell(page, 3, 'city').innerText(),
  ]
  await copy(page, 'P1\tC1\nP2\tC2')
  await cell(page, 2, 'player').click()
  await page.keyboard.press('ControlOrMeta+v')
  await expect(cell(page, 3, 'city')).toHaveText('C2')
  // somewhere else in the grid, then undo: every pasted cell comes back, and is selected
  await cell(page, 9, 'id').click()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(cell(page, 2, 'player')).toHaveText(before[0]!)
  await expect(cell(page, 2, 'city')).toHaveText(before[1]!)
  await expect(cell(page, 3, 'player')).toHaveText(before[2]!)
  await expect(cell(page, 3, 'city')).toHaveText(before[3]!)
  await expect(page.locator('.vg-cell.vg-in-range')).toHaveCount(4)
  await expect(cell(page, 2, 'player')).toBeFocused()
  await page.keyboard.press('ControlOrMeta+y')
  await expect(cell(page, 3, 'city')).toHaveText('C2')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(cell(page, 3, 'city')).toHaveText(before[3]!)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect(cell(page, 2, 'player')).toHaveText('P1')
})

test('a typed edit undoes; inside the editor Ctrl+Z is the text box’s own', async ({ page }) => {
  await open(page)
  const was = await cell(page, 4, 'player').innerText()
  await cell(page, 4, 'player').dblclick()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Typed Name')
  await page.keyboard.press('Enter')
  await expect(cell(page, 4, 'player')).toHaveText('Typed Name')
  // in a new editor, Ctrl+Z undoes typing there, not the grid's last change
  await cell(page, 5, 'player').dblclick()
  await expect(editor(page)).toBeFocused()
  await page.keyboard.type('xyz')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(cell(page, 4, 'player')).toHaveText('Typed Name')
  await page.keyboard.press('Escape')
  // on the cell: the grid's undo
  await cell(page, 4, 'player').click()
  await page.keyboard.press('ControlOrMeta+z')
  await expect(cell(page, 4, 'player')).toHaveText(was)
})

test('the toolbar buttons follow the history', async ({ page }) => {
  await open(page)
  const undo = page.getByRole('button', { name: 'Undo' })
  const redo = page.getByRole('button', { name: 'Redo' })
  await expect(undo).toBeDisabled()
  await expect(redo).toBeDisabled()
  const was = await cell(page, 6, 'stake').innerText()
  await cell(page, 6, 'stake').dblclick()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('555')
  await page.keyboard.press('Enter')
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(cell(page, 6, 'stake')).toHaveText(was)
  await expect(undo).toBeDisabled()
  await expect(redo).toBeEnabled()
  await redo.click()
  await expect(cell(page, 6, 'stake')).toHaveText(/555\.00/)
  // a click on a toolbar button doesn't pull focus into the grid
  expect(await page.evaluate(() => !!document.activeElement?.closest('.vg'))).toBe(false)
})
