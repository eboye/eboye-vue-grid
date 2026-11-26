import { expect, test, type Page } from '@playwright/test'

// Grid / Row grouping / Server side: groups from the data source, contents loaded on expand,
// groups selected by query. Real mouse and keyboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-row-grouping--server-side&viewMode=story`)
  await page.locator('#storybook-root .vg-rowgroup').first().waitFor()
}
const groups = (page: Page, level: number) =>
  page.locator(`.vg-rowgroup[data-group-level="${level}"]`)
const group = (page: Page, level: number, text: string) =>
  groups(page, level).filter({ has: page.locator('.vg-rowgroup-value', { hasText: text }) })
const dataRows = (page: Page) => page.locator('.vg-row:not(.vg-rowgroup)')
const requests = (page: Page) => page.getByTestId('requests').locator('li')

test('top-level groups from the server: their counts, sums, no rows yet', async ({ page }) => {
  await open(page)
  await expect(requests(page).first()).toHaveText('groups in top: 4')
  await expect(groups(page, 0)).toHaveCount(4)
  await expect(dataRows(page)).toHaveCount(0)
  // the server's counts add up to every row
  const counts = await groups(page, 0).locator('.vg-rowgroup-count').allTextContents()
  expect(counts.map((c) => Number(c.replace(/\D/g, ''))).reduce((a, b) => a + b, 0)).toBe(2000)
  await expect(page.locator('.vg-status-bar')).toContainText('2,000 rows')
})

test('expanding loads sub-groups, then rows, with a loading row meanwhile', async ({ page }) => {
  await open(page)
  const won = group(page, 0, 'Won')
  const grid = page.getByRole('treegrid')
  // Record the transient loading row at render time, even if the next browser action runs late.
  await grid.evaluate((el) => {
    const observer = new MutationObserver(() => {
      if (!el.querySelector('.vg-status-row')?.textContent?.includes('Loading…')) return
      el.setAttribute('data-test-saw-group-loading', 'true')
      observer.disconnect()
    })
    observer.observe(el, { childList: true, subtree: true })
  })
  await won.getByRole('button', { name: 'Expand group' }).click()
  await expect(grid).toHaveAttribute('data-test-saw-group-loading', 'true')
  await expect(requests(page).first()).toHaveText('groups in Won: 6')
  await expect(groups(page, 1)).toHaveCount(6)
  const nis = group(page, 1, 'Niš')
  const count = Number((await nis.locator('.vg-rowgroup-count').textContent())!.replace(/\D/g, ''))
  await nis.getByRole('button', { name: 'Expand group' }).click()
  await expect(requests(page).first()).toHaveText(`rows of Won › Niš: ${count}`)
  await expect(dataRows(page)).toHaveCount(count)
  // collapsing and expanding again uses what was loaded
  const before = await requests(page).count()
  await won.getByRole('button', { name: 'Collapse group' }).click()
  await won.getByRole('button', { name: 'Expand group' }).click()
  await expect(dataRows(page)).toHaveCount(count)
  expect(await requests(page).count()).toBe(before)
})

test('virtual scrolling: a big server group renders only the rows in view', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=grid-row-grouping--server-side-virtual&viewMode=story`)
  await page.locator('.vg-rowgroup').first().waitFor()
  const first = page.locator('.vg-rowgroup').first()
  const count = Number(
    (await first.locator('.vg-rowgroup-count').textContent())!.replace(/\D/g, ''),
  )
  expect(count).toBeGreaterThan(200)
  await first.getByRole('button', { name: 'Expand group' }).click()
  await expect(dataRows(page).first()).toBeVisible()
  const rendered = await dataRows(page).count()
  expect(rendered).toBeGreaterThan(5)
  expect(rendered).toBeLessThan(60) // a window, not all of them
  // scroll to the end of the group: its last rows render
  const scroller = page.locator('.vg')
  await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight))
  await expect(page.locator('.vg-rowgroup').nth(1)).toBeVisible()
})

test('keyboard: → on a focused group row expands it and loads its contents', async ({ page }) => {
  await open(page)
  await group(page, 0, 'Lost').locator('.vg-rowgroup-cell').click()
  await page.keyboard.press('ArrowRight')
  await expect(requests(page).first()).toHaveText('groups in Lost: 6')
  await expect(groups(page, 1)).toHaveCount(6)
})

test('a group’s checkbox selects it by query; rows inside are ticked and locked', async ({
  page,
}) => {
  await open(page)
  const won = group(page, 0, 'Won')
  const wonCount = Number(
    (await won.locator('.vg-rowgroup-count').textContent())!.replace(/\D/g, ''),
  )
  await won.getByRole('button', { name: 'Expand group' }).click()
  await expect(groups(page, 1)).toHaveCount(6)
  await won.getByRole('checkbox', { name: 'Select group' }).click() // a real click
  await expect(page.getByTestId('selection')).toContainText(
    'selected-groups = [[{"key":"status","value":"Won"}]]',
  )
  await expect(page.locator('.vg-status-bar')).toContainText(
    `${wonCount.toLocaleString('en-US')} selected`,
  )
  // a sub-group inside is ticked and locked
  const sub = groups(page, 1).first().getByRole('checkbox', { name: 'Select group' })
  await expect(sub).toBeChecked()
  await expect(sub).toBeDisabled()
  // untick: nothing selected
  await won.getByRole('checkbox', { name: 'Select group' }).click()
  await expect(page.getByTestId('selection')).toContainText('selected-groups = []')
  // the header checkbox: every top-level group
  await page.locator('.vg-header').getByRole('checkbox').click()
  await expect(page.locator('.vg-status-bar')).toContainText('2,000 selected')
  await page.locator('.vg-header').getByRole('checkbox').click()
  await expect(page.getByTestId('selection')).toContainText('selected-groups = []')
})
