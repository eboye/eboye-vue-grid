import { expect, test, type Page } from '@playwright/test'

// Grid / Editing: real mouse and keyboard input on the inline editors.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page, story = 'inline-editing') => {
  await page.goto(`${base}/iframe.html?id=grid-editing--${story}&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const editor = (page: Page) => page.locator('.vg-editor-control')
const lastEdit = (page: Page) => page.getByTestId('last-edit')

test('double-click a cell, type, Enter: the value is saved and shown', async ({ page }) => {
  await open(page)
  await cell(page, 1, 'player').dblclick()
  await expect(editor(page)).toBeFocused()
  await expect(editor(page)).toHaveAccessibleName('Edit Player')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Jovana Test')
  await page.keyboard.press('Enter')
  await expect(editor(page)).toHaveCount(0)
  await expect(cell(page, 1, 'player')).toHaveText('Jovana Test')
  await expect(lastEdit(page)).toContainText('player of #1')
  // focus returns to the cell
  await expect(cell(page, 1, 'player')).toBeFocused()
})

test('keyboard: type on a focused cell, Tab to the next editable cell, Esc cancels', async ({
  page,
}) => {
  await open(page)
  await cell(page, 2, 'id').click()
  await page.keyboard.press('ArrowRight') // Player, focused
  await expect(cell(page, 2, 'player')).toBeFocused()
  await page.keyboard.type('Zed')
  await expect(editor(page)).toHaveValue('Zed')
  await page.keyboard.press('Tab')
  await expect(cell(page, 2, 'player')).toHaveText('Zed')
  // the next editable cell is in edit mode (status, unless this bet is void → stake)
  const editing = page.locator('.vg-cell-editing')
  await expect(editing).toHaveCount(1)
  const key = await editing.getAttribute('data-col-key')
  expect(['status', 'stake']).toContain(key)
  await page.keyboard.press('Escape')
  await expect(editing).toHaveCount(0)
  await expect(cell(page, 2, key!)).toBeFocused()
  // Enter on the focused cell edits it again, with its value
  await page.keyboard.press('Enter')
  await expect(page.locator('.vg-cell-editing')).toHaveCount(1)
  await page.keyboard.press('Escape')
})

test('number editor: a bad value shows an error and keeps the editor; a good one saves', async ({
  page,
}) => {
  await open(page)
  const width = async () => (await cell(page, 3, 'stake').boundingBox())!.width
  const before = await width()
  await cell(page, 3, 'stake').dblclick()
  await expect(editor(page)).toBeFocused()
  // the column keeps its width (the editor lies over the cell)
  expect(Math.abs((await width()) - before)).toBeLessThan(1)
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('-5')
  await page.keyboard.press('Enter')
  const error = page.locator('.vg-edit-error')
  await expect(error).toBeVisible()
  await expect(error).toHaveText('Enter a number of at least 0.')
  await expect(editor(page)).toHaveAttribute('aria-invalid', 'true')
  // the bubble sits below the cell, not clipped by it
  const [cellBox, errorBox] = [
    await cell(page, 3, 'stake').boundingBox(),
    await error.boundingBox(),
  ]
  expect(errorBox!.y).toBeGreaterThanOrEqual(cellBox!.y + cellBox!.height - 2)
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('123.45')
  await page.keyboard.press('Enter')
  await expect(error).toHaveCount(0)
  await expect(cell(page, 3, 'stake')).toContainText('123.45')
})

test('clicking elsewhere saves; a boolean flips on double-click; status edits with a select', async ({
  page,
}) => {
  await open(page)
  await cell(page, 4, 'player').dblclick()
  await page.keyboard.press('End')
  await page.keyboard.type('!')
  await page.locator('.sb-note').click() // outside the grid
  await expect(editor(page)).toHaveCount(0)
  await expect(cell(page, 4, 'player')).toContainText('!')

  const before = await cell(page, 4, 'verified').textContent()
  await cell(page, 4, 'verified').dblclick()
  await expect(cell(page, 4, 'verified')).not.toHaveText(before!)

  // a status cell that isn't Void
  const row = await page.evaluate(() => {
    const cells = document.querySelectorAll('.vg-cell[data-col-key="status"][data-vg-editable]')
    return (cells[0]!.parentElement as HTMLElement).dataset.rowKey
  })
  await cell(page, Number(row), 'status').dblclick()
  const select = page.locator('select.vg-editor-control')
  await expect(select).toBeFocused()
  await select.selectOption({ label: 'Void' })
  await page.keyboard.press('Enter')
  await expect(cell(page, Number(row), 'status')).toHaveText('Void')
  // now Void: no longer editable
  await expect(cell(page, Number(row), 'status')).not.toHaveAttribute('data-vg-editable')
})

test('save-cell: saving, a refusal keeps the editor with the message, a fix saves', async ({
  page,
}) => {
  await open(page, 'saving-to-a-server')
  await cell(page, 5, 'stake').dblclick()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('5000')
  await page.keyboard.press('Enter')
  await expect(page.locator('.vg-editor[aria-busy="true"]')).toBeVisible()
  await expect(page.locator('.vg-edit-error')).toContainText('limited to 1,000')
  await expect(editor(page)).toBeEnabled()
  await expect(editor(page)).toHaveValue('5000')
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('900')
  await page.keyboard.press('Enter')
  await expect(editor(page)).toHaveCount(0)
  await expect(cell(page, 5, 'stake')).toContainText('900')
  await expect(lastEdit(page)).toContainText('stake of #5')
})

test('typing straight after a double-click replaces the value, however fast', async ({ page }) => {
  await open(page)
  await cell(page, 6, 'stake').dblclick()
  await page.keyboard.type('42') // no wait for the editor
  await page.keyboard.press('Enter')
  await expect(editor(page)).toHaveCount(0)
  await expect(cell(page, 6, 'stake')).toHaveText(/^€42\.00$/)
})
