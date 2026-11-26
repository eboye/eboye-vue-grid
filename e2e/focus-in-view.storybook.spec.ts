import { expect, test, type Page } from '@playwright/test'

// Keyboard focus is never hidden behind the grid's sticky parts (WCAG 2.2, 2.4.11 Focus Not
// Obscured): moving up with the arrow keys scrolls the focused row below the sticky header, not
// under it, with or without virtual scrolling, pinned rows or a filter row.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

async function open(page: Page, id: string) {
  await page.setViewportSize({ width: 900, height: 500 })
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root [role="gridcell"][tabindex]').first().click()
}

/** How far the focused cell's top edge sits above the sticky header's bottom edge (px). */
const hiddenBy = (page: Page) =>
  page.evaluate(() => {
    const cell = document.activeElement!
    const header = cell.closest('.vg')!.querySelector('.vg-header-cell')!
    return Math.round(header.getBoundingClientRect().bottom - cell.getBoundingClientRect().top)
  })

test('at the last column, ArrowRight neither moves focus nor scrolls the grid', async ({
  page,
}) => {
  await open(page, 'grid-columns--always-pinned')
  await page.keyboard.press('End')
  const at = () =>
    page.evaluate(() => ({
      cell: document.activeElement!.getAttribute('data-col-key'),
      scrollLeft: document.activeElement!.closest('.vg')!.scrollLeft,
    }))
  await expect.poll(async () => (await at()).cell).not.toBeNull()
  const before = await at()
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(200)
  expect(await at()).toEqual(before)
})

for (const [id, name] of [
  ['grid-range-selection--range-selection', 'plain grid'],
  ['grid-large-data--virtual-scrolling', 'virtual rows'],
  ['grid-filtering--all-filters', 'with a filter row'],
] as const) {
  test(`the focused row stays below the sticky header: ${name}`, async ({ page }) => {
    await open(page, id)
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown')
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('ArrowUp')
      await expect.poll(() => hiddenBy(page), `after ${i + 1} × ArrowUp`).toBeLessThanOrEqual(1)
    }
  })
}
