import { expect, test, type Page } from '@playwright/test'

// Row grouping (Grid / Row grouping), driven with real mouse, wheel and keyboard. `npm run e2e:storybook`.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=grid-row-grouping--${id}&viewMode=story`)
  await page.locator('#storybook-root .vg-rowgroup').first().waitFor()
}
const grid = (page: Page) => page.locator('#storybook-root .vg')
/** Top-level group rows' labels: "Status Won 23". */
const topGroups = (page: Page) =>
  grid(page)
    .locator(':scope > .vg-rowgroup .vg-rowgroup-label')
    .evaluateAll((els) =>
      els.map((e) => [...e.children].map((c) => c.textContent?.trim()).join(' ')),
    )
const groupRow = (page: Page, value: string) =>
  grid(page)
    .locator('.vg-rowgroup')
    .filter({
      has: page.locator('.vg-rowgroup-value').filter({
        hasText: new RegExp(`^\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`),
      }),
    })
    .first()
const box = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!

test('group rows: label spans the columns up to the first aggregate; clicking toggles the group', async ({
  page,
}) => {
  await story(page, 'by-status')
  const groups = await topGroups(page)
  expect(groups.length).toBeGreaterThan(1)
  const total = groups.reduce((n, g) => n + Number(g.split(' ').at(-1)), 0)
  expect(total).toBe(120) // every row is in a group

  const first = grid(page).locator(':scope > .vg-rowgroup').first()
  const label = first.locator('.vg-rowgroup-cell')
  const l = await box(label)
  const idHeader = await box(page.locator('.vg-header > [data-col-key="id"]'))
  const statusHeader = await box(page.locator('.vg-header > [data-col-key="status"]'))
  const stakeHeader = await box(page.locator('.vg-header > [data-col-key="stake"]'))
  expect(l.x).toBeCloseTo(idHeader.x, 0)
  expect(l.x + l.width).toBeCloseTo(statusHeader.x + statusHeader.width, 0)
  // the stake aggregate sits in the stake column
  const stake = await box(first.locator('[data-col-key="stake"]'))
  expect(stake.x).toBeCloseTo(stakeHeader.x, 0)
  await expect(first.locator('[data-col-key="stake"]')).not.toBeEmpty()

  await expect(first).toHaveAttribute('aria-expanded', 'false')
  const rowsBefore = await grid(page).locator('.vg-row:not(.vg-rowgroup)').count()
  expect(rowsBefore).toBe(0)
  await label.click({ position: { x: l.width / 2, y: l.height / 2 } })
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  const count = Number(groups[0]!.split(' ').at(-1))
  await expect(grid(page).locator('.vg-subgrid > .vg-row:not(.vg-rowgroup)')).toHaveCount(count)
  // the rows sit below their group row, indented past the expander
  const groupBottom = (await box(label)).y + (await box(label)).height
  const firstChild = grid(page).locator('.vg-subgrid > .vg-row [data-col-key="id"]').first()
  expect((await box(firstChild)).y).toBeGreaterThanOrEqual(groupBottom - 1)
  await first.locator('.vg-expander').click()
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await expect(grid(page).locator('.vg-subgrid')).toHaveCount(0)
})

test('header menu: Group by adds a level, Ungroup all removes them', async ({ page }) => {
  await story(page, 'by-status')
  await page.locator('.vg-header > [data-col-key="city"]').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Group by City' }).click()
  await expect(page.locator('.sb-note strong')).toHaveText('status › city')
  await groupRow(page, (await topGroups(page))[0]!.split(' ')[1]!)
    .locator('.vg-expander')
    .click()
  await expect(
    grid(page).locator('.vg-subgrid > .vg-rowgroup').first().locator('.vg-rowgroup-name'),
  ).toHaveText('City')

  await page.locator('.vg-header > [data-col-key="status"]').click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Ungroup all' }).click()
  await expect(page.locator('.sb-note strong')).toHaveText('nothing')
  await expect(grid(page).locator('.vg-rowgroup')).toHaveCount(0)
  await expect(grid(page).locator(':scope > .vg-row')).toHaveCount(120)
})

test('sorting: the grouped column orders the groups, other columns order the rows inside', async ({
  page,
}) => {
  await story(page, 'by-status')
  const asc = await topGroups(page)
  const sortStatus = page.locator('.vg-header > [data-col-key="status"] .vg-sort')
  await sortStatus.click()
  await sortStatus.click() // descending
  expect(await topGroups(page)).toEqual([...asc].reverse())

  const firstGroup = grid(page).locator(':scope > .vg-rowgroup').first()
  await firstGroup.locator('.vg-expander').click()
  const sortStake = page.locator('.vg-header > [data-col-key="stake"] .vg-sort')
  await sortStake.click()
  await sortStake.click() // descending
  const stakes = await grid(page)
    .locator('.vg-subgrid > .vg-row > [data-col-key="stake"]')
    .evaluateAll((els) => els.map((e) => Number(e.textContent!.replace(/[^\d.-]/g, ''))))
  expect(stakes.length).toBeGreaterThan(1)
  expect(stakes).toEqual([...stakes].sort((a, b) => b - a))
})

test('nested, expanded, with selection: a group checkbox selects every row in it', async ({
  page,
}) => {
  await story(page, 'nested')
  const top = grid(page).locator(':scope > .vg-rowgroup').first()
  const sub = grid(page).locator(':scope > .vg-subgrid').first()
  const leafCount = Number(await top.locator('.vg-rowgroup-count').textContent())
  await expect(sub.locator('.vg-row:not(.vg-rowgroup)')).toHaveCount(leafCount)

  await top.locator('.vg-cell-select input').click()
  await expect(sub.locator('.vg-row-selected:not(.vg-rowgroup)')).toHaveCount(leafCount)
  await expect(top.locator('.vg-cell-select input')).toBeChecked()
  // unticking one row leaves the groups above it indeterminate
  await sub.locator('.vg-row:not(.vg-rowgroup) .vg-cell-select input').first().click()
  expect(
    await top.locator('.vg-cell-select input').evaluate((i: HTMLInputElement) => i.indeterminate),
  ).toBe(true)
  // the totals row still sums every row
  await expect(page.locator('.vg-row-total')).toBeVisible()
})

test('keyboard: arrow keys expand and collapse a group from its label cell', async ({ page }) => {
  await story(page, 'by-status')
  const first = grid(page).locator(':scope > .vg-rowgroup').first()
  await first.locator('.vg-rowgroup-cell').click()
  await expect(first).toHaveAttribute('aria-expanded', 'true') // the click toggled it
  await first.locator('.vg-rowgroup-cell').focus()
  await page.keyboard.press('ArrowLeft')
  await expect(first).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('ArrowRight')
  await expect(first).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(page.locator(':focus')).toHaveAttribute('data-col-key', 'id')
})

test('virtual: 10,000 grouped rows render in a window and scroll to the end', async ({ page }) => {
  await story(page, 'virtual')
  expect(await grid(page).locator('.vg-row').count()).toBeLessThan(120)
  await grid(page).hover()
  await grid(page).evaluate((el) => (el.scrollTop = el.scrollHeight))
  await expect
    .poll(() => grid(page).locator(':scope > .vg-subgrid .vg-row:not(.vg-rowgroup)').count())
    .toBeGreaterThan(0)
  // collapsing every group, from the top, leaves only the group rows: each collapse brings the next
  // group into the window
  await grid(page).evaluate((el) => (el.scrollTop = 0))
  const open = grid(page).locator(':scope > .vg-rowgroup[aria-expanded="true"]')
  let collapsed = 0
  while ((await open.count()) && collapsed < 50) {
    await open.first().locator('.vg-expander').click()
    collapsed++
  }
  await expect(grid(page).locator('.vg-row:not(.vg-rowgroup)')).toHaveCount(0)
  const groups = await topGroups(page)
  expect(groups).toHaveLength(collapsed)
  expect(groups.reduce((n, g) => n + Number(g.split(' ').at(-1)!.replace(/\D/g, '')), 0)).toBe(
    10_000,
  )
  // nothing left to scroll
  expect(await grid(page).evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
})
