import { expect, test, type Locator, type Page } from '@playwright/test'

// Filtering and server data, driven with real mouse / keyboard against the Storybook stories.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root :is([role="grid"], [role="treegrid"])').first().waitFor()
}
const rows = (page: Page) => page.locator('.vg-row:not([data-depth="1"]):not([data-depth="2"])')
const header = (page: Page, key: string) => page.locator(`.vg-header > [data-col-key="${key}"]`)
const box = async (l: Locator) => (await l.boundingBox())!

test.describe('client filtering', () => {
  test.beforeEach(async ({ page }) => {
    await story(page, 'grid-filtering--all-filters')
    await page.evaluate(() => localStorage.clear())
  })

  test('funnel: hidden until hover, popover anchored under it with focus in the search box; value list filters', async ({
    page,
  }) => {
    const total = await rows(page).count()
    const funnel = header(page, 'status').locator('.vg-filter-button')
    await expect(funnel).toHaveCSS('opacity', '0')
    await header(page, 'status').hover()
    await expect(funnel).toHaveCSS('opacity', '1')
    await funnel.click()
    const popover = page.locator('.vg-filter-popover:popover-open')
    await expect(popover).toBeVisible()
    const f = await box(funnel)
    const p = await box(popover)
    expect(p.y).toBeGreaterThanOrEqual(f.y + f.height - 1)
    expect(Math.abs(p.x + p.width - (f.x + f.width))).toBeLessThan(4) // right-aligned to the funnel
    await expect(popover.getByPlaceholder('Search values')).toBeFocused()

    await popover.getByLabel('Won').uncheck()
    await popover.getByLabel('Void').uncheck()
    await expect.poll(() => rows(page).count()).toBeLessThan(total)
    const statuses = await page.locator('.vg-row > [data-col-key="status"]').allTextContents()
    expect(statuses.every((s) => /Lost|Open/.test(s))).toBe(true)
    await expect(page.getByTestId('count')).toHaveText('1 active')
    // funnel stays visible and marked while active
    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
    await page.mouse.move(5, 5)
    await expect(funnel).toHaveCSS('opacity', '1')
    await expect(funnel).toHaveAttribute('aria-label', /active/)
  })

  test('number condition in the popover (keyboard), filter row shorthand, quick search, clear all', async ({
    page,
  }) => {
    await header(page, 'stake').hover()
    await header(page, 'stake').locator('.vg-filter-button').click()
    const popover = page.locator('.vg-filter-popover:popover-open')
    await popover.getByLabel('Stake: condition').selectOption('gte')
    await popover.getByLabel('Stake: value').fill('300')
    await expect
      .poll(async () => {
        const stakes = await page.locator('.vg-row > [data-col-key="stake"]').allTextContents()
        return stakes.length > 0 && stakes.every((s) => Number(s.replace(/[^\d.]/g, '')) >= 300)
      })
      .toBe(true)
    await page.keyboard.press('Escape')
    // the filter row reflects the popover's condition as shorthand
    await expect(header(page, 'stake').locator('.vg-filter-input input')).toHaveValue('>=300')

    // filter row: type shorthand for the date column
    await header(page, 'placedAt').locator('.vg-filter-input input').fill('>2026-06-01')
    await expect
      .poll(async () => {
        const dates = await page.locator('.vg-row > [data-col-key="placedAt"]').allTextContents()
        return dates.every((d) => {
          const [m, day, y] = d.trim().split('/').map(Number)
          return new Date(Date.UTC(y!, m! - 1, day!)) > new Date(Date.UTC(2026, 5, 1))
        })
      })
      .toBe(true)

    // quick search (accent-insensitive) across visible columns
    await page.getByLabel('Search rows').fill('dorde')
    await expect
      .poll(async () => {
        const players = await page.locator('.vg-row > [data-col-key="player"]').allTextContents()
        return players.length === 0 || players.every((p) => p.includes('Đorđ'))
      })
      .toBe(true)
    await expect(page.getByTestId('count')).toHaveText('3 active')

    await page.getByRole('button', { name: 'Clear all' }).click()
    await expect(page.getByTestId('count')).toHaveText('0 active')
    await expect(header(page, 'stake').locator('.vg-filter-input input')).toHaveValue('')
    await expect(page.getByLabel('Search rows')).toHaveValue('')
  })

  test('after filtering, screen readers hear how many rows match (a status message)', async ({
    page,
  }) => {
    const status = page.locator('#storybook-root .vg-root > [role="status"]')
    await expect(status).toHaveText('') // nothing said on load
    await page.getByLabel('Search rows').pressSequentially('dorde', { delay: 30 })
    const shown = () => rows(page).count()
    // said once typing pauses, as the status bar says it: "N of M rows"
    await expect(status).toHaveText(/^\d+ of [\d,]+ rows$/)
    expect(Number((await status.textContent())!.split(' ')[0])).toBe(await shown())
    await page.getByLabel('Search rows').fill('')
    await expect(status).toHaveText(/^[\d,]+ rows$/)
  })

  test('boolean select, no-match message with Clear filters, header menu items', async ({
    page,
  }) => {
    const total = await rows(page).count()
    await header(page, 'verified').locator('.vg-filter-input select').selectOption('false')
    await expect
      .poll(async () =>
        (await page.locator('.vg-row > [data-col-key="verified"]').allTextContents()).every(
          (t) => t === 'No',
        ),
      )
      .toBe(true)

    await header(page, 'player').locator('.vg-filter-input input').fill('zzzz-no-such-player')
    await expect(page.locator('.vg-no-match')).toContainText('No rows match')
    await page.locator('.vg-no-match').getByRole('button', { name: 'Clear filters' }).click()
    await expect(rows(page)).toHaveCount(total)

    // header right-click → Filter… opens the popover; Clear filter is disabled until active
    await header(page, 'city').click({ button: 'right' })
    const menu = page.locator('[role="menu"]:popover-open')
    await expect(menu.getByRole('menuitem', { name: 'Clear filter', exact: true })).toBeDisabled()
    await menu.getByRole('menuitem', { name: 'Filter…' }).click()
    const popover = page.locator('.vg-filter-popover:popover-open')
    await expect(popover).toBeVisible()
    await expect(popover.getByPlaceholder('Search values')).toBeFocused()
    await page.keyboard.type('beo')
    await expect(popover.locator('.vg-filter-values li')).toHaveCount(1)
  })

  test('persisted filters survive a reload', async ({ page }) => {
    await story(page, 'grid-filtering--persisted')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.locator('[role="grid"]').waitFor()
    await header(page, 'player').locator('.vg-filter-input input').fill('Ana')
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('storybook-filters-demo')))
      .toContain('Ana')
    await page.reload()
    await page.locator('[role="grid"]').waitFor()
    await expect(header(page, 'player').locator('.vg-filter-input input')).toHaveValue('Ana')
    const players = await page.locator('.vg-row > [data-col-key="player"]').allTextContents()
    expect(players.length).toBeGreaterThan(0)
    expect(players.every((p) => p.toLowerCase().includes('ana'))).toBe(true) // case-insensitive: Ivana too
    await page.evaluate(() => localStorage.clear())
  })

  test('sub-grid: a parent stays when a child matches', async ({ page }) => {
    await story(page, 'grid-filtering--sub-grids')
    await header(page, 'name').locator('.vg-filter-input input').fill('Draw')
    await expect
      .poll(() =>
        page
          .locator('.vg-row')
          .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.rowKey)),
      )
      .toEqual(['fb', 'fb-1x2', 'fb-1x2-d'])
  })
})

test.describe('server data', () => {
  const requests = (page: Page) => page.getByTestId('requests').locator('li')

  test('sort, filter, search and pages go to the backend; superseded requests are aborted', async ({
    page,
  }) => {
    await story(page, 'grid-server-data--data-source')
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    await expect(requests(page).first()).toContainText('page 1/10')
    await expect(page.locator('.vg-row')).toHaveCount(10)

    // sort
    await header(page, 'stake').locator('.vg-sort').click()
    await expect(requests(page).first()).toContainText('sort stake asc')
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    const stakes = (await page.locator('.vg-row > [data-col-key="stake"]').allTextContents()).map(
      (s) => Number(s.replace(/[^\d.]/g, '')),
    )
    expect(stakes).toEqual([...stakes].sort((a, b) => a - b))

    // page 2
    await page
      .locator('.vg-grid-pagination')
      .getByRole('button', { name: 'Page 2', exact: true })
      .click()
    await expect(requests(page).first()).toContainText('page 2/10')

    // typing in the filter row quickly: earlier requests get aborted, the last one wins, page resets
    const input = header(page, 'player').locator('.vg-filter-input input')
    await input.pressSequentially('Ana', { delay: 250 })
    await expect(requests(page).first()).toContainText('player')
    await expect(requests(page).first()).toContainText('page 1/10')
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    expect(
      await page.getByTestId('requests').locator('[data-status="aborted"]').count(),
    ).toBeGreaterThan(0)
    const players = await page.locator('.vg-row > [data-col-key="player"]').allTextContents()
    expect(players.length).toBeGreaterThan(0)
    expect(players.every((p) => p.toLowerCase().includes('ana'))).toBe(true) // case-insensitive: Ivana too
  })

  test('value list loads from the backend, errors show Retry', async ({ page }) => {
    await story(page, 'grid-server-data--data-source')
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    await header(page, 'city').hover()
    await header(page, 'city').locator('.vg-filter-button').click()
    const popover = page.locator('.vg-filter-popover:popover-open')
    await expect(popover.getByText('Loading…')).toBeVisible()
    await expect(popover.locator('.vg-filter-values li')).toHaveCount(6) // six cities from the server
    await popover.getByPlaceholder('Search values').fill('novi')
    await expect(popover.locator('.vg-filter-values li')).toHaveCount(1)
    await popover.getByLabel('Novi Sad').uncheck()
    await expect(requests(page).first()).toContainText('city')
    await page.keyboard.press('Escape')
    // let the filter request finish first, or it would take the failure armed below
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    await expect(header(page, 'city').locator('.vg-filter-summary')).toHaveText('5 selected')
    const cities = await page.locator('.vg-row > [data-col-key="city"]').allTextContents()
    expect(cities.length).toBeGreaterThan(0)
    expect(cities).not.toContain('Novi Sad')

    // a failing request → Retry
    await page.getByTestId('fail').click()
    await header(page, 'id').locator('.vg-sort').click()
    await expect(requests(page).first()).toHaveAttribute('data-status', 'error')
    // The other five cities remain selected, so the failure keeps those rows on screen.
    const notice = page.locator('.vg-load-error-banner')
    await expect(notice).toContainText("Couldn't load the rows")
    await notice.getByRole('button', { name: 'Retry' }).click()
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    await expect(notice).toBeHidden()
  })

  test('a failed request with rows on screen keeps them, with a notice and Retry', async ({
    page,
  }) => {
    await story(page, 'grid-server-data--data-source')
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    const firstPlayer = await page
      .locator('.vg-row > [data-col-key="player"]')
      .first()
      .textContent()

    await page.getByTestId('fail').click()
    await header(page, 'stake').locator('.vg-sort').click()
    await expect(requests(page).first()).toHaveAttribute('data-status', 'error')
    const notice = page.locator('.vg-load-error-banner')
    await expect(notice).toBeVisible()
    await expect(notice).toHaveAttribute('role', 'alert')
    await expect(notice).toContainText("Couldn't load the rows. These are from before.")
    // the rows from before are still there
    await expect(page.locator('.vg-row > [data-col-key="player"]').first()).toHaveText(firstPlayer!)

    await notice.getByRole('button', { name: 'Retry' }).click()
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    await expect(requests(page).first()).toContainText('sort stake asc')
    await expect(notice).toBeHidden()

    // another failure, then a query that succeeds: the notice goes away by itself
    await page.getByTestId('fail').click()
    await header(page, 'stake').locator('.vg-sort').click()
    await expect(notice).toBeVisible()
    await header(page, 'stake').locator('.vg-sort').click()
    await expect(requests(page).first()).toHaveAttribute('data-status', 'ok')
    await expect(notice).toBeHidden()
  })

  test('query-change event: the app fetches by itself', async ({ page }) => {
    await story(page, 'grid-server-data--query-change-event')
    await expect(page.getByTestId('last-query')).toContainText('page 1')
    await header(page, 'stake').locator('.vg-sort').click()
    await expect(page.getByTestId('last-query')).toContainText('sort stake asc')
    await header(page, 'stake').locator('.vg-filter-input input').fill('>400')
    await expect(page.getByTestId('last-query')).toContainText('stake')
    await expect
      .poll(async () =>
        (await page.locator('.vg-row > [data-col-key="stake"]').allTextContents()).every(
          (s) => Number(s.replace(/[^\d.]/g, '')) > 400,
        ),
      )
      .toBe(true)
  })
})
