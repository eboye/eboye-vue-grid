import { expect, test, type Page } from '@playwright/test'

// Windows high contrast (forced colours): the browser drops backgrounds and box-shadows, so a
// cell range, selected rows and find matches would vanish. They're drawn in the system
// `Highlight` / `HighlightText` colours instead, text included.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test.skip(({ browserName }) => browserName !== 'chromium', 'only Chromium emulates forced colours')

async function open(page: Page, id: string) {
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root [role="gridcell"]').first().waitFor()
}

/** The system colours as this browser resolves them, and a cell's (and its text's) colours. */
const colours = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const probe = document.createElement('span')
    probe.style.cssText = 'forced-color-adjust:none;background:Highlight;color:HighlightText'
    document.body.append(probe)
    const sys = getComputedStyle(probe)
    const cell = document.querySelector(sel)!
    const text = cell.querySelector('.vg-cell-content *') ?? cell
    const out = {
      highlight: sys.backgroundColor,
      highlightText: sys.color,
      cell: getComputedStyle(cell).backgroundColor,
      text: getComputedStyle(text).color,
    }
    probe.remove()
    return out
  }, selector)

test('a cell range is drawn in the highlight colours', async ({ page }) => {
  await open(page, 'grid-range-selection--range-selection')
  const cells = page.locator('#storybook-root [role="gridcell"]')
  const a = (await cells.nth(1).boundingBox())!
  const b = (await cells.nth(14).boundingBox())!
  await page.mouse.move(a.x + 10, a.y + 10)
  await page.mouse.down()
  await page.mouse.move(b.x + 10, b.y + 10, { steps: 6 })
  await page.mouse.up()
  const c = await colours(page, '#storybook-root .vg-cell.vg-in-range')
  expect(c.cell).toBe(c.highlight)
  expect(c.text).toBe(c.highlightText)
})

test('selected rows are drawn in the highlight colours', async ({ page }) => {
  await open(page, 'grid-selection--multiple')
  await page.locator('#storybook-root [role="gridcell"] input[type="checkbox"]').nth(2).click()
  const c = await colours(page, '#storybook-root .vg-row-selected > .vg-cell:nth-child(3)')
  expect(c.cell).toBe(c.highlight)
  expect(c.text).toBe(c.highlightText)
})

test('find matches are drawn in the highlight colours', async ({ page }) => {
  await open(page, 'grid-range-selection--find-and-replace')
  await page.locator('#storybook-root [role="gridcell"]').nth(1).click()
  await page.keyboard.press('Control+f')
  const find = page.getByRole('searchbox', { name: 'Find' })
  await expect(find).toBeFocused()
  await find.fill('ić')
  const match = '#storybook-root .vg-cell.vg-find-match:not(.vg-find-current)'
  await expect(page.locator(match).first()).toBeVisible()
  const c = await colours(page, match)
  expect(c.cell).toBe(c.highlight)
  expect(c.text).toBe(c.highlightText)
})
