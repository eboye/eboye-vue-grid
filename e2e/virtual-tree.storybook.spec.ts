import { expect, test, type Page } from '@playwright/test'

// Virtual scrolling with sub-grids and detail rows, driven with real mouse / keyboard against the
// Storybook stories (Grid / Large data). `npm run e2e:storybook`.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root .vg.vg-virtual .vg-row').first().waitFor()
}
const grid = (page: Page) => page.locator('#storybook-root .vg')

/** Waits until scrolling has stopped (two samples of `scrollTop` a few frames apart agree). */
const settled = async (page: Page) =>
  expect
    .poll(
      () =>
        grid(page).evaluate(
          (el) =>
            new Promise<boolean>((done) => {
              const a = el.scrollTop
              setTimeout(() => done(Math.abs(el.scrollTop - a) < 1), 200)
            }),
        ),
      { timeout: 10_000 },
    )
    .toBe(true)

/**
 * Points on a vertical line through the first data column, from under the header to the bottom:
 * each must hit a cell (data, detail or status row), never a spacer or empty grid area.
 */
const gaps = async (page: Page) => {
  await settled(page)
  return grid(page).evaluate((vg) => {
    const r = vg.getBoundingClientRect()
    const header = vg.querySelector('.vg-header-cell')!.getBoundingClientRect()
    const x = header.left + 30
    const misses: number[] = []
    /** A sub-grid's own border (the theme draws one under each), not empty space. */
    const onBorder = (el: Element, y: number) => {
      const box = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return (
        y >= box.bottom - (parseFloat(cs.borderBottomWidth) || 0) - 0.5 ||
        y <= box.top + (parseFloat(cs.borderTopWidth) || 0) + 0.5
      )
    }
    for (let y = header.bottom + 2; y < r.bottom - 2; y += 7) {
      const el = document.elementFromPoint(x, y)
      if (el?.closest('.vg-cell, .vg-detail, .vg-status')) continue
      if (el?.classList.contains('vg-subgrid') && onBorder(el, y)) continue
      misses.push(Math.round(y - r.top))
    }
    return misses
  })
}

/** Left edges of the header cells and of the cells of the first row at `depth`. */
const columnEdges = (page: Page, depth: number) =>
  grid(page).evaluate((vg, d) => {
    const left = (el: Element) => Math.round(el.getBoundingClientRect().left)
    const row = vg.querySelector(`.vg-row[data-depth="${d}"]`)
    return {
      header: [...vg.querySelectorAll(':scope > .vg-header > .vg-header-cell')].map(left),
      row: row ? [...row.children].map(left) : [],
    }
  }, depth)

/** Key and offset of the first data row under the header. */
const topRow = (page: Page) =>
  grid(page).evaluate((vg) => {
    const hb = vg.querySelector('.vg-header-cell')!.getBoundingClientRect().bottom
    for (const row of vg.querySelectorAll<HTMLElement>('.vg-row')) {
      const cell = row.firstElementChild!.getBoundingClientRect()
      if (cell.bottom > hb + 1) return { key: row.dataset.rowKey!, y: Math.round(cell.top - hb) }
    }
    return null
  })

test('sub-grids: 14,000 expanded rows, a screenful in the DOM, columns lined up at every depth', async ({
  page,
}) => {
  await story(page, 'grid-large-data--virtual-sub-grids')
  const rows = page.locator('#storybook-root .vg-row')
  await page.getByRole('button', { name: 'Expand all' }).click()
  await expect(grid(page)).toHaveAttribute('aria-rowcount', '14001')
  await expect.poll(() => rows.count()).toBeLessThan(60)
  for (const depth of [1, 2]) {
    const edges = await columnEdges(page, depth)
    expect(edges.row, `depth ${depth}`).toEqual(edges.header) // CSS subgrid, not JS width syncing
  }
  expect(await gaps(page)).toEqual([])

  // deep in the tree
  await grid(page).hover()
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 4000)
  expect(await gaps(page)).toEqual([])
  expect(await rows.count()).toBeLessThan(60)
  for (const depth of [1, 2]) {
    const edges = await columnEdges(page, depth)
    if (edges.row.length) expect(edges.row, `depth ${depth}`).toEqual(edges.header)
  }

  // scrollToRow reaches a grandchild far below
  await page.getByRole('button', { name: 'Scroll to the last row' }).click()
  await expect(page.locator('[data-row-key="13999"]')).toBeVisible()
  expect(await gaps(page)).toEqual([])

  await page.getByRole('button', { name: 'Collapse all' }).click()
  await expect(grid(page)).toHaveAttribute('aria-rowcount', '1001')
  expect(await gaps(page)).toEqual([])
})

test('sub-grids: keyboard moves down through parents and children across the window', async ({
  page,
}) => {
  await story(page, 'grid-large-data--virtual-sub-grids')
  await page.getByRole('button', { name: 'Expand all' }).click()
  const first = page.locator('#storybook-root .vg-row').first().locator('.vg-cell').nth(1)
  await first.click({ position: { x: 4, y: 4 } })
  for (let i = 0; i < 60; i++) await page.keyboard.press('ArrowDown')
  const focused = page.locator('#storybook-root .vg-row:has(.vg-cell:focus)')
  // header row + 61st row
  await expect(focused).toHaveAttribute('aria-rowindex', '62')
  await expect(page.locator('#storybook-root .vg-cell:focus')).toBeInViewport()
})

test('lazy sub-grids: only rows in view load their children; loading and loaded rows leave no gaps', async ({
  page,
}) => {
  await story(page, 'grid-large-data--virtual-lazy-sub-grids')
  await page.getByRole('button', { name: 'Expand all' }).click()
  const loading = page.locator('#storybook-root .vg-status-loading')
  await expect.poll(() => loading.count()).toBeGreaterThan(0)
  expect(await loading.count()).toBeLessThan(25) // not 5,000 requests
  expect(await gaps(page)).toEqual([])
  await expect(loading).toHaveCount(0)
  await expect
    .poll(() => page.locator('#storybook-root .vg-row[data-depth="1"]').count())
    .toBeGreaterThan(4)
  expect(await gaps(page)).toEqual([])

  // fly far down: once the scroll settles, the rows in view load theirs
  await grid(page).hover()
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 4000)
  await settled(page)
  // loading starts once the scroll has settled; wait for the children rather than for "no loading"
  await expect
    .poll(() => page.locator('#storybook-root .vg-row[data-depth="1"]').count(), { timeout: 5000 })
    .toBeGreaterThan(4)
  await expect(loading).toHaveCount(0, { timeout: 5000 })
  expect(await gaps(page)).toEqual([])
})

test('detail rows of different heights: no gaps, scrolling never jumps back, positions hold', async ({
  page,
}) => {
  await story(page, 'grid-large-data--virtual-detail-rows')
  await page.getByRole('button', { name: 'Expand all' }).click()
  await expect(page.getByTestId('detail-1')).toBeVisible()
  expect(await gaps(page)).toEqual([])

  await grid(page).hover()
  const seen: number[] = []
  for (let i = 0; i < 25; i++) {
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(60)
    seen.push(Number((await topRow(page))?.key))
  }
  expect(
    seen.every((k, i) => i === 0 || k >= seen[i - 1]!),
    seen.join(','),
  ).toBe(true)
  expect(seen.at(-1)!).toBeGreaterThan(seen[0]! + 20)
  expect(await gaps(page)).toEqual([])

  // jump into rows never rendered (estimated heights), then scroll up into more of them: as they
  // render at their real heights above the view, the rows in view must not move
  await grid(page).evaluate((el) => (el.scrollTop = el.scrollHeight / 2))
  await settled(page)
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -300)
    await settled(page)
    const before = await topRow(page)
    await page.waitForTimeout(400) // measuring happens on the next frames
    const after = await topRow(page)
    expect(after?.key, `step ${i}`).toBe(before?.key)
    expect(Math.abs(after!.y - before!.y), `step ${i}`).toBeLessThanOrEqual(2)
  }
  expect(await gaps(page)).toEqual([])
})

test('lazy children loading above the view do not move the rows in view', async ({ page }) => {
  await story(page, 'grid-large-data--virtual-lazy-sub-grids')
  await page.getByRole('button', { name: 'Expand all' }).click()
  const loading = page.locator('#storybook-root .vg-status-loading')
  await expect(loading).toHaveCount(0, { timeout: 5000 }) // the first screen's children are in
  await grid(page).evaluate((el) => (el.scrollTop = 60_000))
  // requested once the jump settles, answered 300 ms later: catch them in between, with the rows
  // at the new position rendered
  await expect
    .poll(async () => (await loading.count()) > 0 && Number((await topRow(page))?.key) > 1000, {
      intervals: [20],
    })
    .toBe(true)
  const before = await topRow(page)
  await expect(loading).toHaveCount(0, { timeout: 5000 }) // some of them were above the view
  await page.waitForTimeout(300)
  const after = await topRow(page)
  expect(after?.key).toBe(before?.key)
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(2)
})
