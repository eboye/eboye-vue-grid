import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Find and replace (range selection + editing): real keys on the bar, 300 virtual rows.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-range-selection--find-and-replace&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const cell = (page: Page, id: number, key: string) =>
  page.locator(`.vg-row[data-row-key="${id}"] > .vg-cell[data-col-key="${key}"]`)
const findBox = (page: Page) => page.getByRole('searchbox', { name: 'Find' })
const status = (page: Page) => page.locator('.vg-find-status')

test('Ctrl+F in the grid opens the bar; Enter walks the matches, into rows not drawn yet', async ({
  page,
}) => {
  await open(page)
  await cell(page, 2, 'player').click()
  await page.keyboard.press('ControlOrMeta+f')
  await expect(findBox(page)).toBeFocused()
  const city = await cell(page, 2, 'city').innerText()
  await page.keyboard.type(city)
  await expect(status(page)).toHaveText(/^1 of \d+$/)
  const total = Number((await status(page).innerText()).split(' of ')[1])
  // more matches than rows on screen: the search covers every row, not the drawn ones
  expect(total).toBeGreaterThan(await page.locator('.vg-row[data-row-key]').count())
  await expect(page.locator('.vg-find-current')).toHaveCount(1)
  // back from the first: the last match, far down; the grid scrolls to it
  await page.keyboard.press('Shift+Enter')
  await expect(status(page)).toHaveText(`${total} of ${total}`)
  const grid = page.locator('#storybook-root .vg')
  await expect.poll(() => grid.evaluate((el) => el.scrollTop)).toBeGreaterThan(1000)
  const current = page.locator('.vg-find-current')
  await expect(current).toBeVisible()
  await expect(current).toHaveText(city)
  const g = (await grid.boundingBox())!
  const c = (await current.boundingBox())!
  expect(c.y).toBeGreaterThanOrEqual(g.y)
  expect(c.y + c.height).toBeLessThanOrEqual(g.y + g.height + 1)
  // Esc: the bar goes, the match is the focused, selected cell
  await page.keyboard.press('Escape')
  await expect(page.locator('.vg-find')).toHaveCount(0)
  await expect(page.locator('.vg-cell:focus')).toHaveText(city)
})

test('Replace all from the toolbar button; one Ctrl+Z undoes it', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Find and replace' }).click()
  await expect(findBox(page)).toBeFocused()
  await page.keyboard.type('Niš')
  const total = Number((await status(page).innerText()).split(' of ')[1])
  expect(total).toBeGreaterThan(5)
  await page.getByRole('textbox', { name: 'Replace with' }).fill('Nish')
  await page.getByRole('button', { name: 'Replace all', exact: true }).click()
  await expect(page.getByTestId('replace-report')).toHaveText(
    `last replace: ${total} replaced, 0 skipped`,
  )
  await expect(status(page)).toHaveText(`${total} replaced`)
  // nothing left to find
  await expect(page.locator('.vg-find-match')).toHaveCount(0)
  await findBox(page).fill('Nish')
  await expect(status(page)).toHaveText(new RegExp(`^1 of ${total}$`))
  await page.keyboard.press('Escape')
  await page.keyboard.press('ControlOrMeta+z')
  await page.keyboard.press('ControlOrMeta+f')
  await findBox(page).fill('Nish')
  await expect(status(page)).toHaveText('No matches')
})

test('Replace one at a time: the current match changes, the next becomes current', async ({
  page,
}) => {
  await open(page)
  await cell(page, 1, 'id').click()
  await page.keyboard.press('ControlOrMeta+h') // straight to find and replace
  await page.keyboard.type('Beograd')
  const total = Number((await status(page).innerText()).split(' of ')[1])
  const replaceBox = page.getByRole('textbox', { name: 'Replace with' })
  await replaceBox.fill('BG')
  await replaceBox.press('Enter') // Enter in the replace box: Replace
  await expect(status(page)).toHaveText('1 replaced')
  await page.getByRole('button', { name: 'Next match' }).click()
  await expect(status(page)).toHaveText(new RegExp(` of ${total - 1}$`))
})

test('focus stays in the bar after the Replace buttons, so Esc still closes it', async ({
  page,
}) => {
  await open(page)
  await page.getByRole('button', { name: 'Find and replace' }).click()
  await page.keyboard.type('Beograd')
  await page.getByRole('textbox', { name: 'Replace with' }).fill('BG')
  // Replace: the button is off while the change saves, then on again (matches are left)
  await page.getByRole('button', { name: 'Replace', exact: true }).click()
  await expect(status(page)).toHaveText('1 replaced')
  await expect(page.locator('.vg-find :focus')).toHaveCount(1)
  // Replace all: nothing is left to match, so the button stays off
  await page.getByRole('button', { name: 'Replace all', exact: true }).click()
  await expect(status(page)).toHaveText(/ replaced$/)
  await expect(page.getByRole('button', { name: 'Replace all', exact: true })).toBeDisabled()
  await expect(findBox(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.vg-find')).toHaveCount(0)
  // no match left to land on: focus goes back to the grid
  await expect
    .poll(() => page.evaluate(() => !!document.activeElement?.closest('#storybook-root .vg')))
    .toBe(true)
})

test('the open bar, with matches and the replace row, passes axe in light and dark', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'axe checks markup and computed colours; one engine is enough',
  )
  for (const scheme of ['light', 'dark'] as const) {
    await page.goto(
      `${base}/iframe.html?id=grid-range-selection--find-and-replace&viewMode=story&globals=scheme:${scheme}`,
    )
    await page.locator('#storybook-root .vg-row').first().waitFor()
    await page.getByRole('button', { name: 'Find and replace' }).click()
    await page.keyboard.type('Ni')
    await expect(status(page)).toHaveText(/ of /)
    const result = await new AxeBuilder({ page })
      .include('#storybook-root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region'])
      .analyze()
    expect(
      result.violations.map(
        (v) => `${scheme} ${v.id}: ${v.nodes.map((n) => n.target).join(' ; ')}`,
      ),
    ).toEqual([])
  }
})

test('typing straight after Ctrl+F goes into the search, not into the cell', async ({ page }) => {
  await open(page)
  await cell(page, 3, 'player').click()
  // no wait: the bar may still be loading
  await page.keyboard.press('ControlOrMeta+f')
  await page.keyboard.type('Niš', { delay: 5 })
  await expect(findBox(page)).toHaveValue('Niš')
  await expect(findBox(page)).toBeFocused()
  await expect(page.locator('.vg-editor-control')).toHaveCount(0) // the cell didn't start editing
  await expect(status(page)).toHaveText(/^1 of \d+$/)
})

test('typing straight after the toolbar’s button goes into the search too', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Find and replace' }).click()
  await page.keyboard.type('Beo', { delay: 5 }) // no wait: focus is still on the button
  await expect(findBox(page)).toHaveValue('Beo')
  await expect(findBox(page)).toBeFocused()
})

test('Ctrl+F outside the grid stays the browser’s own', async ({ page }) => {
  await open(page)
  await page.getByTestId('replace-report').click()
  await page.keyboard.press('ControlOrMeta+f')
  await expect(page.locator('.vg-find')).toHaveCount(0)
})
