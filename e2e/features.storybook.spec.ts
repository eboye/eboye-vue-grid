import { expect, test, type Page } from '@playwright/test'

// Opt-in features, driven with real mouse input against the Grid/Features stories (an app that
// registers no features app-wide).
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root .vg').first().waitFor()
}
const header = (page: Page, key: string) => page.locator(`.vg-header > [data-col-key="${key}"]`)
const players = (page: Page) => page.locator('.vg-row > [data-col-key="player"]').allTextContents()

test('no features: a plain table; clicking a sortable header does nothing; no funnels, filter row or pager', async ({ page }) => {
  await story(page, 'grid-features--no-features')
  const before = await players(page)
  await header(page, 'player').hover()
  await expect(page.locator('.vg-filter-button')).toHaveCount(0)
  await expect(page.locator('.vg-sort')).toHaveCount(0)
  await header(page, 'player').click()
  expect(await players(page)).toEqual(before)
  await expect(header(page, 'player')).not.toHaveAttribute('aria-sort', /.+/)
  // no menus feature: right-click leaves the browser's own menu (no grid menu, default not prevented)
  const prevented = page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        window.addEventListener('contextmenu', (e) => resolve(e.defaultPrevented), { once: true })
      }),
  )
  await header(page, 'player').click({ button: 'right' })
  expect(await prevented).toBe(false)
  await page.keyboard.press('Escape')
  await expect(page.locator('.vg-menu')).toHaveCount(0)
})

test('selection, sub-grids and menus, feature by feature', async ({ page }) => {
  await story(page, 'grid-features--rows-and-menus')
  await expect(page.locator('.vg-cell-select')).toHaveCount(0)
  await expect(page.locator('.vg-expander')).toHaveCount(0)

  await page.getByLabel('selectionFeature').check()
  const firstRow = page.locator('.vg-row').first()
  await firstRow.getByRole('checkbox', { name: 'Select row' }).click()
  await expect(firstRow).toHaveClass(/vg-row-selected/) // no aria-selected: an ARIA table has no selection

  await page.getByLabel('subGridsFeature').check()
  await page.locator('.vg-expander').first().waitFor()
  await page.locator('.vg-expander').first().click()
  await expect(page.locator('.vg-subgrid .vg-row').first()).toBeVisible()

  await page.getByLabel('menusFeature').check()
  await page.locator('.vg-row > [data-col-key="name"]').first().click({ button: 'right' })
  const menu = page.locator('.vg-menu:popover-open')
  await expect(menu.getByRole('menuitem', { name: 'Copy' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.locator('.vg-header > [data-col-key="name"]').click({ button: 'right' })
  await expect(menu.getByRole('menuitem', { name: 'Reset columns' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: /Sort/ })).toHaveCount(0) // sorting not on
})

test('column reorder, pinning and visibility: ignored without their features, working with them', async ({ page }) => {
  await story(page, 'grid-features--columns')
  const scroller = page.locator('#storybook-root .vg')
  const keys = () => page.locator('.vg-header > [data-col-key]').evaluateAll((els) => els.map((e) => e.getAttribute('data-col-key')))
  const box = async (key: string) => (await header(page, key).boundingBox())!
  const scrollBy = async (dx: number) => {
    await scroller.evaluate((el) => (el.scrollLeft = 0))
    await scroller.hover()
    await page.mouse.wheel(dx, 0)
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100)
  }
  const drag = async (from: string, to: string) => {
    const a = await box(from)
    const b = await box(to)
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(b.x + 20, b.y + b.height / 2, { steps: 8 })
    await page.mouse.up()
  }

  // no features: the `hidden: true` column shows; the pinned `#` column scrolls away; dragging
  // and Alt+→ change nothing
  await expect(header(page, 'change')).toBeVisible()
  const before = await keys()
  const id0 = await box('id')
  await scrollBy(400)
  expect((await box('id')).x).toBeLessThan(id0.x - 100)
  await scroller.evaluate((el) => (el.scrollLeft = 0))
  await drag('status', 'player')
  expect(await keys()).toEqual(before)
  await header(page, 'stake').click()
  await page.keyboard.press('Alt+ArrowLeft')
  expect(await keys()).toEqual(before)

  await page.getByLabel('columnPinningFeature').check()
  await expect(header(page, 'id')).toHaveClass(/vg-pin-left/)
  const pinned0 = await box('id')
  await scrollBy(400)
  expect((await box('id')).x).toBeCloseTo(pinned0.x, 0)
  await scroller.evaluate((el) => (el.scrollLeft = 0))

  await page.getByLabel('columnReorderFeature').check()
  await drag('status', 'player')
  await expect.poll(keys).not.toEqual(before)
  expect((await keys()).indexOf('status')).toBeLessThan((await keys()).indexOf('player'))

  await page.getByLabel('menusFeature').check()
  await header(page, 'city').click({ button: 'right' })
  const menu = page.locator('.vg-menu:popover-open')
  await expect(menu.getByRole('menuitem', { name: 'Pin left' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Move right' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Hide column' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await page.getByLabel('columnVisibilityFeature').check()
  await expect(header(page, 'change')).toHaveCount(0) // `hidden: true` now applies
  await header(page, 'city').click({ button: 'right' })
  await menu.getByRole('menuitem', { name: 'Hide column' }).click()
  await expect(header(page, 'city')).toHaveCount(0)
})

test('virtual scrolling: all rows render without the feature, a scrolling window with it', async ({ page }) => {
  await story(page, 'grid-features--virtual-scrolling')
  const rows = page.locator('#storybook-root .vg-row')
  await expect(rows).toHaveCount(2000)
  await expect(page.locator('.vg-spacer')).toHaveCount(0)

  await page.getByLabel('virtualScrollingFeature').check()
  await expect(page.locator('#storybook-root .vg.vg-virtual')).toBeVisible()
  await expect.poll(() => rows.count()).toBeLessThan(40)
  const scroller = page.locator('#storybook-root .vg')
  await scroller.hover()
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, 2000)
  await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(15000)
  // the rendered rows follow the scroll position (row i sits at i * 40px); Firefox scrolls
  // smoothly, so compare once the position has settled
  const offBy = async () => {
    const top = await scroller.evaluate((el) => el.scrollTop)
    const first = Number(await rows.first().getAttribute('aria-rowindex'))
    return first - top / 40
  }
  await expect.poll(async () => {
    const d = await offBy()
    return d > -10 && d < 2
  }).toBe(true)
  expect(await rows.count()).toBeLessThan(40)
})

test('keyboard navigation: a table with tabbable controls without it, an arrow-key grid with it', async ({ page }) => {
  await story(page, 'grid-features--opt-in')
  await page.getByLabel('sortingFeature').check()
  const scroller = page.locator('#storybook-root .vg')
  await expect(scroller).toHaveAttribute('role', 'table')
  await expect(page.locator('.vg-row').first().locator('[data-col-key="player"]')).toHaveAttribute('role', 'cell')

  // Tab walks through the grid's own controls; arrow keys do nothing
  await scroller.focus()
  await page.keyboard.press('Tab')
  const firstSort = page.locator('.vg-header .vg-sort').first()
  await expect(firstSort).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.vg-header > [data-col-key]').first()).toHaveAttribute('aria-sort', 'ascending')
  await page.keyboard.press('ArrowDown')
  await expect(firstSort).toBeFocused()

  await page.getByLabel('keyboardNavigationFeature').check()
  await expect(scroller).toHaveAttribute('role', 'grid')
  await expect(page.locator('.vg-header .vg-sort').first()).toHaveAttribute('tabindex', '-1')
  // the grid is one tab stop: focus lands on a header cell, arrows move between cells
  await scroller.focus()
  const firstHeader = page.locator('.vg-header > [data-col-key]').first()
  await expect(firstHeader).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.vg-header > [data-col-key]').nth(1)).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('.vg-row').first().locator('[role="gridcell"]').nth(1)).toBeFocused()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter') // sorts the focused header
  await expect(page.locator('.vg-header > [data-col-key]').nth(1)).toHaveAttribute('aria-sort', 'ascending')
})

test('opting in, feature by feature', async ({ page }) => {
  await story(page, 'grid-features--opt-in')
  await expect(page.locator('.vg-sort')).toHaveCount(0)
  await expect(page.locator('.vg-filter-input')).toHaveCount(0)
  await expect(page.locator('.vg-grid-pagination')).toHaveCount(0)
  await expect(page.locator('.vg-row')).toHaveCount(40)

  await page.getByLabel('sortingFeature').check()
  await header(page, 'player').locator('.vg-sort').click()
  await expect(header(page, 'player')).toHaveAttribute('aria-sort', 'ascending')
  const sorted = await players(page)
  expect(sorted).toEqual([...sorted].sort((a, b) => a.localeCompare(b)))
  await expect(page.locator('.vg-filter-button')).toHaveCount(0)

  await page.getByLabel('paginationFeature').check()
  await expect(page.locator('.vg-grid-pagination')).toBeVisible()
  await expect(page.locator('.vg-row')).toHaveCount(10)

  await page.getByLabel('filteringFeature').check()
  await expect(page.locator('.vg-filter-input').first()).toBeVisible()
  await header(page, 'player').hover()
  await expect(header(page, 'player').locator('.vg-filter-button')).toHaveCSS('opacity', '1')
  const first = (await players(page))[0]!
  await page.getByRole('searchbox', { name: 'Search rows' }).fill(first)
  await expect.poll(async () => (await players(page)).every((p) => p.includes(first))).toBe(true)
})
