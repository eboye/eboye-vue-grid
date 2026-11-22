import { expect, test, type Page } from '@playwright/test'

// Column resizing (Grid/Columns → Resizing), with real mouse and keyboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const header = (page: Page, key: string) => page.locator(`.vg-header > [data-col-key="${key}"]`)
const width = async (page: Page, key: string) => (await header(page, key).boundingBox())!.width
const cellBox = async (page: Page, key: string) => (await page.locator(`.vg-row > [data-col-key="${key}"]`).first().boundingBox())!

async function open(page: Page) {
  await page.goto(`${base}/iframe.html?id=grid-columns--resizing&viewMode=story`)
  await page.evaluate(() => localStorage.removeItem('storybook-columns-resizing'))
  await page.reload()
  await page.locator('#storybook-root .vg').waitFor()
}

async function dragEdge(page: Page, key: string, dx: number) {
  const handle = header(page, key).locator('.vg-resize-handle')
  const box = (await handle.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y, { steps: 10 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => open(page))

test('drag a header edge: the column (header and body) resizes; no sort, no reorder', async ({ page }) => {
  const order = await page.locator('.vg-header > [data-col-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-col-key')))
  const city0 = await width(page, 'city')
  const status0 = (await header(page, 'status').boundingBox())!.x
  await dragEdge(page, 'city', 80)
  await expect.poll(() => width(page, 'city')).toBeCloseTo(city0 + 80, -1)
  const cell = await cellBox(page, 'city')
  expect(cell.width).toBeCloseTo(await width(page, 'city'), 0) // body follows the header
  expect((await header(page, 'status').boundingBox())!.x).toBeCloseTo(status0 + 80, -1) // the next column moves over
  await expect(header(page, 'city')).not.toHaveAttribute('aria-sort', /ascending|descending/)
  expect(
    await page.locator('.vg-header > [data-col-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-col-key'))),
  ).toEqual(order)

  // narrower than the content: cells clip instead of spilling into the next column
  await dragEdge(page, 'city', -150)
  const clipped = await page.locator('.vg-row > [data-col-key="city"]').first().evaluate((e) => getComputedStyle(e).overflow)
  expect(clipped).toBe('hidden')
})

test('minWidth / maxWidth bound the drag; resizable: false has no handle', async ({ page }) => {
  const rem = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
  await dragEdge(page, 'player', 600)
  await expect.poll(() => width(page, 'player')).toBeCloseTo(20 * rem, 0)
  await dragEdge(page, 'player', -600)
  await expect.poll(() => width(page, 'player')).toBeCloseTo(8 * rem, 0)
  await expect(header(page, 'id').locator('.vg-resize-handle')).toHaveCount(0)
})

test('a resized pinned column moves the next pinned column’s sticky offset', async ({ page }) => {
  const scroller = page.locator('#storybook-root .vg')
  await dragEdge(page, 'player', 60)
  await scroller.hover()
  await page.mouse.wheel(600, 0)
  await expect.poll(() => scroller.evaluate((e) => e.scrollLeft)).toBeGreaterThan(50)
  const player = (await header(page, 'player').boundingBox())!
  const city = (await header(page, 'city').boundingBox())!
  // the unpinned columns scroll under the pinned ones, which stay side by side
  const id = (await header(page, 'id').boundingBox())!
  expect(player.x).toBeCloseTo(id.x + id.width, 0)
  expect(city.x).toBeLessThan(player.x + player.width)
})

test('double-click the edge fits the content; keyboard steps; header menu resets', async ({ page }) => {
  await dragEdge(page, 'site', 200) // much wider than its content
  const wide = await width(page, 'site')
  await header(page, 'site').locator('.vg-resize-handle').dblclick()
  await expect.poll(() => width(page, 'site')).toBeLessThan(wide - 20)
  const fitted = await width(page, 'site')
  const longest = await page.locator('.vg-row > [data-col-key="site"] .vg-text').evaluateAll((els) =>
    Math.max(...els.map((e) => e.scrollWidth)),
  )
  expect(fitted).toBeGreaterThanOrEqual(longest) // the widest cell fits

  // ←/→ on the focused handle (Shift: 64px); Alt+Shift+→ on a focused header (keyboard navigation)
  const handle = header(page, 'stake').locator('.vg-resize-handle')
  const stake0 = await width(page, 'stake')
  await handle.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => width(page, 'stake')).toBeCloseTo(stake0 + 16, 0)
  await page.keyboard.press('Shift+ArrowLeft')
  await expect.poll(() => width(page, 'stake')).toBeCloseTo(stake0 + 16 - 64, 0)
  await header(page, 'status').click()
  const status0 = await width(page, 'status')
  await page.keyboard.press('Alt+Shift+ArrowRight')
  await expect.poll(() => width(page, 'status')).toBeCloseTo(status0 + 16, 0)

  // persisted with `storage`
  await page.reload()
  await page.locator('#storybook-root .vg').waitFor()
  expect(await width(page, 'status')).toBeCloseTo(status0 + 16, 0)

  // header menu: Reset width
  await header(page, 'status').click({ button: 'right' })
  await page.locator('.vg-menu:popover-open').getByRole('menuitem', { name: 'Reset width' }).click()
  await expect.poll(() => width(page, 'status')).toBeCloseTo(status0, 0)
})
