import { expect, test, type Page } from '@playwright/test'

// Edge cases and performance guards from the package review, driven with real mouse / keyboard
// against the Storybook stories. `npm run e2e:storybook`.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page
    .locator('#storybook-root :is([role="grid"], [role="treegrid"], [role="table"])')
    .first()
    .waitFor()
}

test('virtual scrolling: the rendered window follows many small scroll steps', async ({ page }) => {
  await story(page, 'grid-features--virtual-scrolling')
  await page.getByLabel('virtualScrollingFeature').check()
  const scroller = page.locator('#storybook-root .vg.vg-virtual')
  const rows = page.locator('#storybook-root .vg-row')
  await expect.poll(() => rows.count()).toBeLessThan(40)
  await scroller.hover()
  // small steps mostly stay inside the same rendered rows; the window must still move when needed
  for (let i = 0; i < 24; i++) await page.mouse.wheel(0, 30)
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(600)
  await expect
    .poll(async () => {
      const top = await scroller.evaluate((el) => el.scrollTop)
      const first = Number(await rows.first().getAttribute('aria-rowindex'))
      const d = first - top / 40
      return d > -10 && d < 2
    })
    .toBe(true)
  // the row at the top of the viewport is rendered and visible
  const top = await scroller.evaluate((el) => el.scrollTop)
  const index = Math.floor(top / 40) + 2 // aria-rowindex counts the header row
  await expect(page.locator(`#storybook-root .vg-row[aria-rowindex="${index}"]`)).toBeVisible()
})

test('pin shadows (scroll-edge fallback) follow horizontal scrolling only', async ({ page }) => {
  await story(page, 'grid-columns--resizing')
  const grid = page.locator('#storybook-root .vg')
  const native = await page.evaluate(() => CSS.supports('container-type', 'scroll-state'))
  test.skip(native, 'this engine shows pin shadows with scroll-state container queries')
  await page.setViewportSize({ width: 700, height: 600 })
  await expect(grid).toHaveAttribute('data-vg-scrollable', 'right')
  await grid.hover()
  await page.mouse.wheel(300, 0)
  await expect.poll(() => grid.getAttribute('data-vg-scrollable')).toBe('left right')
  await page.mouse.wheel(5000, 0)
  await expect.poll(() => grid.getAttribute('data-vg-scrollable')).toBe('left')
  await page.mouse.wheel(-5000, 0)
  await expect.poll(() => grid.getAttribute('data-vg-scrollable')).toBe('right')
})

test('west of UTC, a date-only value shows that calendar day; instants follow the time zone', async ({
  page,
}) => {
  await story(page, 'renderers--date-in-time-zone')
  const value = (row: number) => page.locator(`[data-row-key="${row}"] > [data-col-key="value"]`)
  await expect(page.locator('[data-row-key="2"] > [data-col-key="label"]')).toContainText(
    'date-only',
  )
  await expect(value(2)).toHaveText('01/05/2026')
  // 2026-01-01T09:05Z is still Jan 1 in New York; 2025-07-04T18:00Z too
  await expect(value(3)).toHaveText('01/01/2026')
  await expect(value(4)).toHaveText('07/04/2025')
})

test('cascading selection: lazy children of a ticked parent arrive selected', async ({ page }) => {
  await story(page, 'grid-selection--with-lazy-sub-rows')
  const docs = page.locator('[data-row-key="docs"]')
  await docs.getByRole('checkbox').click()
  await expect(page.getByTestId('selected')).toHaveText('selected = [docs]')
  await docs.locator('.vg-expander').click()
  const children = page.locator('.vg-row[data-row-key^="docs/"]')
  await expect(children).toHaveCount(3)
  for (const box of await children.getByRole('checkbox').all()) await expect(box).toBeChecked()
  await expect(docs.getByRole('checkbox')).toBeChecked()
  await expect(docs.getByRole('checkbox')).not.toHaveJSProperty('indeterminate', true)
  await expect(page.getByTestId('selected')).toHaveText('selected = [docs, docs/1, docs/2, docs/3]')
  // unticking one child makes the parent partly selected
  await children.first().getByRole('checkbox').click()
  await expect(docs.getByRole('checkbox')).toHaveJSProperty('indeterminate', true)
})

test('value list with 1,000 values: renders 300, search narrows, ticking filters', async ({
  page,
}) => {
  await story(page, 'grid-filtering--many-values')
  const header = page.locator('.vg-header > [data-col-key="id"]')
  await header.hover()
  await header.locator('.vg-filter-button').click()
  const popover = page.locator('.vg-filter-popover:popover-open')
  const values = popover.locator('.vg-filter-values .vg-filter-option')
  await expect(values).toHaveCount(300)
  await expect(popover).toContainText('700 more — search to narrow the list')
  await page.keyboard.type('99')
  // 99, 199, …, 990–999: 19 matches, all rendered
  await expect(values).toHaveCount(19)
  await expect(popover).not.toContainText('more — search')
  // "All shown" unticks just the 19 matches; ticking 999 brings that one back
  const rows = page.locator('#storybook-root .vg-row')
  await popover.locator('.vg-filter-all input').click()
  await expect(rows).toHaveCount(1000 - 19)
  await values.filter({ hasText: /^999/ }).locator('input').click()
  await expect(rows).toHaveCount(1000 - 18)
  await expect(page.locator('#storybook-root .vg-row[data-row-key="999"]')).toHaveCount(1)
  await expect(page.locator('#storybook-root .vg-row[data-row-key="990"]')).toHaveCount(0)
})
