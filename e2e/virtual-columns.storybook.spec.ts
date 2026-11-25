import { expect, test, type Page } from '@playwright/test'

// Column virtualization: 2,000 rows × 122 columns (Name pinned, the checkbox), only the cells in
// view render; real scrolling, keys and mouse.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page, id = 'virtual-columns') => {
  await page.goto(`${base}/iframe.html?id=grid-large-data--${id}&viewMode=story`)
  await page.locator('#storybook-root .vg-row[data-row-key]').first().waitFor()
}
const grid = (page: Page) => page.locator('#storybook-root .vg')
const headerKeys = (page: Page) =>
  grid(page)
    .locator(':scope > .vg-header > [role="columnheader"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.colKey!))
const focused = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    return `${(a?.closest('.vg-row') as HTMLElement | null)?.dataset.rowKey ?? '-'}:${a?.dataset.colKey}`
  })
/** The cell is fully in the grid's view, clear of the pinned columns on the left. */
const inView = (page: Page, rowKey: number, colKey: string) =>
  page.evaluate(
    ([rowKey, colKey]) => {
      const g = document.querySelector('#storybook-root .vg')!
      const cell = g.querySelector(`.vg-row[data-row-key="${rowKey}"] > [data-col-key="${colKey}"]`)
      if (!cell) return 'not rendered'
      const pinned = g.querySelector(`.vg-row[data-row-key="${rowKey}"] > [data-col-key="name"]`)!
      const c = cell.getBoundingClientRect()
      const v = g.getBoundingClientRect()
      const left = pinned.getBoundingClientRect().right
      return c.left >= left - 1 && c.right <= v.right - g.clientLeft + 1 ? 'in view' : 'hidden'
    },
    [rowKey, colKey] as const,
  )
const aligned = (page: Page, key: string) =>
  page.evaluate((key) => {
    const g = document.querySelector('#storybook-root .vg')!
    const h = g.querySelector(`:scope > .vg-header > [data-col-key="${key}"]`)
    const c = g.querySelector(`.vg-row[data-row-key]:not(.vg-rowgroup) > [data-col-key="${key}"]`)
    if (!h || !c) return false
    const a = h.getBoundingClientRect()
    const b = c.getBoundingClientRect()
    return Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1
  }, key)

test('only the columns in view render, each on its own track; scrolling swaps them', async ({
  page,
}) => {
  await open(page)
  await expect(grid(page)).toHaveAttribute('aria-colcount', '122')
  const start = await headerKeys(page)
  expect(start.length).toBeLessThan(30)
  expect(start.slice(0, 3)).toEqual(['__vg_select', 'name', 'm1'])
  await expect(page.locator('.vg-row[data-row-key="1"] > [data-col-key="m3"]')).toHaveAttribute(
    'aria-colindex',
    '5',
  )
  expect(await aligned(page, 'm3')).toBe(true)

  await grid(page).evaluate((g) => (g.scrollLeft = 6000))
  await expect.poll(() => headerKeys(page)).not.toContain('m1')
  const mid = await headerKeys(page)
  expect(mid.slice(0, 2)).toEqual(['__vg_select', 'name']) // pinned stay
  const probe = mid[mid.length >> 1]!
  expect(await aligned(page, probe)).toBe(true)
  expect(await aligned(page, 'name')).toBe(true)

  await grid(page).evaluate((g) => (g.scrollLeft = g.scrollWidth))
  await expect.poll(() => headerKeys(page)).toContain('m120')
  expect(await aligned(page, 'm120')).toBe(true)
  expect(await inView(page, 1, 'm120')).toBe('in view')
})

test('keys go by column: End reaches the last one, Up / Down keep it, Home comes back', async ({
  page,
}) => {
  await open(page)
  await page.locator('.vg-row[data-row-key="1"] > [data-col-key="m2"]').click()
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight')
  expect(await focused(page)).toBe('1:m5')
  await page.keyboard.press('End')
  await expect.poll(() => focused(page)).toBe('1:m120')
  expect(await inView(page, 1, 'm120')).toBe('in view')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  expect(await focused(page)).toBe('3:m120')
  await page.keyboard.press('ArrowLeft')
  expect(await focused(page)).toBe('3:m119')
  await page.keyboard.press('Home')
  await expect.poll(() => focused(page)).toBe('3:__vg_select')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => focused(page)).toBe('3:m1')
  await expect.poll(() => inView(page, 3, 'm1')).toBe('in view')
})

test('the focused cell stays rendered while the grid scrolls sideways', async ({ page }) => {
  await open(page)
  await page.locator('.vg-row[data-row-key="2"] > [data-col-key="m4"]').click()
  await grid(page).evaluate((g) => (g.scrollLeft = 8000))
  await expect.poll(() => headerKeys(page)).toContain('m70')
  expect(await focused(page)).toBe('2:m4')
  // and keys go on from it
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => focused(page)).toBe('2:m5')
  await expect.poll(() => inView(page, 2, 'm5')).toBe('in view')
})

test('editing, find and a range reach columns far off screen', async ({ page }) => {
  await open(page)
  // find: row 1 has 731 in M100 only
  await page.locator('.vg-row[data-row-key="1"] > [data-col-key="m1"]').click()
  await page.keyboard.press('ControlOrMeta+f')
  await page.keyboard.type('731')
  await expect(page.locator('.vg-find-current')).toHaveAttribute('data-col-key', 'm100')
  await expect.poll(() => inView(page, 1, 'm100')).toBe('in view')
  await page.keyboard.press('Escape')
  await expect.poll(() => focused(page)).toBe('1:m100')

  // edit it: type over it
  await page.keyboard.type('5')
  await page.keyboard.press('Enter')
  await expect(page.locator('.vg-row[data-row-key="1"] > [data-col-key="m100"]')).toHaveText('5')

  // a range from M100 back to M1 (Shift+click after scrolling): 100 cells in the status bar
  await grid(page).evaluate((g) => (g.scrollLeft = 0))
  await expect.poll(() => headerKeys(page)).toContain('m1')
  await page.locator('.vg-row[data-row-key="1"] > [data-col-key="m1"]').click({
    modifiers: ['Shift'],
  })
  await expect(page.locator('.vg-status-bar')).toContainText('100 cells')
})

test('column groups, group rows and totals line up with the columns while scrolling', async ({
  page,
}) => {
  await open(page, 'virtual-columns-grouped')
  for (const left of [0, 5000, 1e6]) {
    await grid(page).evaluate((g, left) => (g.scrollLeft = left), left)
    await page.waitForTimeout(100)
    const keys = (await headerKeys(page)).filter((k) => /^m\d+$/.test(k))
    const k = keys[keys.length >> 1]!
    const result = await page.evaluate((k) => {
      const g = document.querySelector('#storybook-root .vg')!
      const box = (sel: string) => g.querySelector(sel)?.getBoundingClientRect()
      const h = box(`:scope > .vg-header > [data-col-key="${k}"]`)!
      const near = (b: DOMRect | undefined) =>
        !!b && Math.abs(b.left - h.left) < 1 && Math.abs(b.width - h.width) < 1
      const year = [...g.querySelectorAll('.vg-header-groups > .vg-group-cell')].find((y) => {
        const b = y.getBoundingClientRect()
        return b.left <= h.left + 1 && b.right >= h.right - 1
      })
      return {
        total: near(box(`.vg-row-total [data-col-key="${k}"]`)),
        group: near(box(`.vg-rowgroup [data-col-key="${k}"]`)),
        data: near(box(`.vg-row[data-row-key]:not(.vg-rowgroup) > [data-col-key="${k}"]`)),
        year: year?.textContent?.trim(),
      }
    }, k)
    expect(result).toEqual({
      total: true,
      group: true,
      data: true,
      year: `Year ${Math.floor((Number(k.slice(1)) - 1) / 12) + 1}`,
    })
  }
})

test('a column group wider than the view keeps its label in sight, clear of the pinned columns', async ({
  page,
}) => {
  await open(page, 'virtual-columns-grouped')
  for (const left of [0, 5150, 9000]) {
    await grid(page).evaluate((g, left) => (g.scrollLeft = left), left)
    await page.waitForTimeout(100)
    const labels = await page.evaluate(() => {
      const g = document.querySelector('#storybook-root .vg')!
      const v = g.getBoundingClientRect()
      const edge = g
        .querySelector('.vg-header-groups > .vg-pin-left')!
        .getBoundingClientRect().right
      return [...g.querySelectorAll('.vg-header-groups > .vg-group-cell:not(.vg-pin-left)')]
        .filter((c) => {
          const b = c.getBoundingClientRect()
          return c.querySelector('.vg-group-label') && b.right > edge + 20 && b.left < v.right - 20
        })
        .map((c) => {
          const b = c.querySelector('.vg-group-label')!.getBoundingClientRect()
          return b.width > 0 && b.left >= edge - 1 && b.right <= v.right + 1
        })
    })
    expect(labels.length).toBeGreaterThan(0)
    expect(labels).toEqual(labels.map(() => true))
  }
})
