import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// CSV export and copying (Grid / Export & copy), with real mouse, keyboard, downloads and clipboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-export-copy--export-and-copy&viewMode=story`)
  await page.locator('#storybook-root .vg .vg-row').first().waitFor()
}
const grid = (page: Page) => page.locator('#storybook-root .vg')
const copied = (page: Page) => page.locator('[data-test="copied"]')
const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
/** The names in the body, in order. */
const names = (page: Page) =>
  grid(page)
    .locator(':scope > .vg-row > [data-col-key="player"]')
    .evaluateAll((els) => els.map((e) => e.textContent!.trim()))

test('Download CSV: the filtered, sorted rows with a header, totals, a BOM, and no action column', async ({ page }) => {
  await open(page)
  await page.locator('.vg-header [data-col-key="player"] .vg-sort').click() // sort by player
  const filter = page.locator('.vg-header [data-col-key="city"] input').first()
  await filter.fill('Beograd')
  await expect.poll(async () => (await names(page)).length).toBeLessThan(40)
  const visible = await names(page)

  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-test="download"]').click()])
  expect(download.suggestedFilename()).toBe('bets.csv')
  const bytes = readFileSync((await download.path())!)
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const lines = bytes.subarray(3).toString('utf8').split('\r\n')
  expect(lines[0]).toBe('#,Player,City,Status,Stake,Δ odds,Placed')
  const body = lines.slice(1, -1)
  expect(body.map((l) => l.split(',')[1])).toEqual(visible)
  expect(body.every((l) => l.split(',')[2] === 'Beograd')).toBe(true)
  expect(lines.at(-1)).toMatch(/^Total,/)
})

test('Ctrl/⌘+C on a focused cell copies it as shown; with rows selected it copies the rows', async ({ page, browserName }) => {
  // Chromium lets the test read the clipboard back; elsewhere the grid's `copy` event is the check
  if (browserName === 'chromium') await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  const cell = grid(page).locator(':scope > .vg-row').first().locator('[data-col-key="stake"]')
  const shown = (await cell.textContent())!.trim()
  await cell.click()
  await page.keyboard.press(`${mod}+c`)
  await expect(copied(page)).toHaveText(`Cell: ${shown}`)
  if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown)

  const rows = grid(page).locator(':scope > .vg-row')
  await rows.nth(0).locator('.vg-cell-select input').click()
  await rows.nth(2).locator('.vg-cell-select input').click()
  await rows.nth(0).locator('[data-col-key="player"]').click()
  await page.keyboard.press(`${mod}+c`)
  await expect(copied(page)).toContainText('2 rows:')
  const text = (await copied(page).textContent())!.replace(/^2 rows: /, '')
  const first = text.split('\n')[0]!.split('\t')
  expect(first).toHaveLength(7) // every exportable column, tab-separated
  expect(first[1]).toBe((await rows.nth(0).locator('[data-col-key="player"]').textContent())!.trim())
  if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text)
})

test('a text selection is copied by the browser, not replaced by the grid', async ({ page }) => {
  await open(page)
  const cell = grid(page).locator(':scope > .vg-row').first().locator('[data-col-key="city"]')
  await cell.click()
  await cell.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
  })
  await page.keyboard.press(`${mod}+c`)
  await expect(copied(page)).toHaveText('')
})

test('the Copy button copies the selected rows; the preview shows formatted values', async ({ page, browserName }) => {
  await open(page)
  await grid(page).locator(':scope > .vg-row').nth(1).locator('.vg-cell-select input').click()
  // no clipboard permission here: headless Chromium refuses the Clipboard API, the fallback copies
  await page.locator('[data-test="copy"]').click()
  await expect(copied(page)).toContainText('1 rows:')
  if (browserName === 'chromium') {
    await page.context().grantPermissions(['clipboard-read'])
    const text = (await copied(page).textContent())!.replace(/^1 rows: /, '')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text)
  }
  await page.locator('[data-test="preview"]').click()
  const csv = (await page.locator('[data-test="csv"]').textContent())!
  expect(csv.split('\n')[1]).toMatch(/€/) // stake as currency
})
