import { expect, test, type Page } from '@playwright/test'

// Grid / Sorting / Multi column: Shift-click, Shift+Enter and the header menu, with real input.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-sorting--multi-column&viewMode=story`)
  await page.locator('#storybook-root .vg-row').first().waitFor()
}
const header = (page: Page, key: string) =>
  page.locator(`.vg-header > [role="columnheader"][data-col-key="${key}"]`)
const sorts = async (page: Page) =>
  JSON.parse((await page.getByTestId('sorts').textContent())!.replace('sorts = ', '')) as {
    key: string
    dir: string
  }[]
/** The cells of a column, in row order. */
const column = (page: Page, key: string) =>
  page.locator(`.vg-row > [data-col-key="${key}"]`).allTextContents()

test('the rows follow every key; markers and aria-sort show the order', async ({ page }) => {
  await open(page)
  await expect(header(page, 'city').locator('.vg-sort-index')).toHaveText('1')
  await expect(header(page, 'stake').locator('.vg-sort-index')).toHaveText('2')
  await expect(header(page, 'city')).toHaveAttribute('aria-sort', 'ascending')
  await expect(header(page, 'stake')).toHaveAttribute('aria-sort', 'none')
  await expect(header(page, 'stake')).toHaveAttribute('data-sort-dir', 'desc')
  // cities ascending; inside each city, stakes descending
  const cities = await column(page, 'city')
  const stakes = (await column(page, 'stake')).map((s) => Number(s.replace(/[^\d.-]/g, '')))
  expect([...cities]).toEqual([...cities].sort((a, b) => a.localeCompare(b)))
  for (let i = 1; i < cities.length; i++)
    if (cities[i] === cities[i - 1]) expect(stakes[i]).toBeLessThanOrEqual(stakes[i - 1]!)
})

test('Shift-click adds, turns descending, removes; a plain click sorts by one column', async ({
  page,
}) => {
  await open(page)
  await header(page, 'player')
    .locator('.vg-sort')
    .click({ modifiers: ['Shift'] })
  expect((await sorts(page)).map((s) => s.key)).toEqual(['city', 'stake', 'player'])
  await expect(header(page, 'player').locator('.vg-sort-index')).toHaveText('3')
  await header(page, 'player')
    .locator('.vg-sort')
    .click({ modifiers: ['Shift'] })
  expect((await sorts(page))[2]).toEqual({ key: 'player', dir: 'desc' })
  await header(page, 'player')
    .locator('.vg-sort')
    .click({ modifiers: ['Shift'] })
  expect((await sorts(page)).map((s) => s.key)).toEqual(['city', 'stake'])
  await header(page, 'id').locator('.vg-sort').click()
  expect(await sorts(page)).toEqual([{ key: 'id', dir: 'asc' }])
  await expect(page.locator('.vg-sort-index')).toHaveCount(0)
})

test('keyboard: Shift+Enter on a focused header adds the column', async ({ page }) => {
  await open(page)
  await header(page, 'id').locator('.vg-sort').focus()
  await page.keyboard.press('Shift+Enter')
  // once, ascending (not added and then turned descending by a second handler)
  await expect
    .poll(() => sorts(page))
    .toEqual([
      { key: 'city', dir: 'asc' },
      { key: 'stake', dir: 'desc' },
      { key: 'id', dir: 'asc' },
    ])
  await page.keyboard.press('Enter') // without Shift: that column alone, ascending
  await expect.poll(() => sorts(page)).toEqual([{ key: 'id', dir: 'asc' }])
  await page.keyboard.press('Enter') // the only key now: it turns descending
  await expect.poll(() => sorts(page)).toEqual([{ key: 'id', dir: 'desc' }])
})

test('header menu: Then sort descending, and Clear sort removes one key', async ({ page }) => {
  await open(page)
  await header(page, 'player').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Then sort descending' }).click()
  await expect
    .poll(() => sorts(page))
    .toEqual([
      { key: 'city', dir: 'asc' },
      { key: 'stake', dir: 'desc' },
      { key: 'player', dir: 'desc' },
    ])
  await header(page, 'city').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Clear sort' }).click()
  await expect.poll(async () => (await sorts(page)).map((s) => s.key)).toEqual(['stake', 'player'])
})

test('keyboard navigation: ↑ to a header, Shift+Enter adds it once', async ({ page }) => {
  await open(page)
  await page.locator('.vg-row > [data-col-key="id"]').first().click()
  await page.keyboard.press('ArrowUp')
  await expect(header(page, 'id')).toBeFocused()
  await page.keyboard.press('Shift+Enter')
  await expect
    .poll(() => sorts(page))
    .toEqual([
      { key: 'city', dir: 'asc' },
      { key: 'stake', dir: 'desc' },
      { key: 'id', dir: 'asc' },
    ])
})
