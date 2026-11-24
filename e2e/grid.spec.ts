import { expect, test, type Locator, type Page } from '@playwright/test'

const demo = (page: Page, name: string) => page.locator(`[data-demo="${name}"]`)
const headers = (scope: Locator) => scope.locator('.vg-header > [role="columnheader"]')
const headerTexts = async (scope: Locator) =>
  (await headers(scope).allInnerTexts()).map((t) => t.trim())
const box = async (l: Locator) => {
  const b = await l.boundingBox()
  if (!b) throw new Error('no bounding box')
  return b
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.describe('sorting', () => {
  test('client sort cycles asc → desc → none with aria-sort', async ({ page }) => {
    const grid = demo(page, 'basic')
    const stakeHeader = grid.locator('[role="columnheader"][data-col-key="stake"]')
    const firstStake = () =>
      grid.locator('.vg-row').first().locator('[data-col-key="stake"]').innerText()

    await stakeHeader.getByRole('button').click()
    await expect(stakeHeader).toHaveAttribute('aria-sort', 'ascending')
    const asc = await firstStake()
    await stakeHeader.getByRole('button').click()
    await expect(stakeHeader).toHaveAttribute('aria-sort', 'descending')
    const desc = await firstStake()
    expect(parseFloat(asc.replace(/[^\d.]/g, ''))).toBeLessThan(
      parseFloat(desc.replace(/[^\d.]/g, '')),
    )
    await stakeHeader.getByRole('button').click()
    await expect(stakeHeader).toHaveAttribute('aria-sort', 'none')
    await expect(grid.locator('.vg-row').first()).toHaveAttribute('data-row-key', '1')
  })

  test('controlled sort + pagination', async ({ page }) => {
    const grid = demo(page, 'pagination')
    await grid.getByRole('button', { name: 'Page 2' }).click()
    await expect(grid.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(grid.locator('.vg-row').first()).toHaveAttribute('data-row-key', '11')
    await expect(grid.locator('.vg-pagination-summary')).toHaveText('11–20 of 137')
    await grid.getByRole('button', { name: 'Last page' }).click()
    await expect(grid.locator('.vg-row')).toHaveCount(7)
    await grid.locator('select').selectOption('25')
    await expect(grid.locator('.vg-row')).toHaveCount(25)
    await expect(grid.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

test.describe('layout', () => {
  test('header stays stuck to the top while the body scrolls', async ({ page }) => {
    const grid = demo(page, 'basic')
    const scroller = grid.locator('.vg')
    const header = grid.locator('[role="columnheader"][data-col-key="player"]')
    const before = await box(header)
    await scroller.hover()
    await page.mouse.wheel(0, 400)
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
    const after = await box(header)
    expect(Math.abs(after.y - before.y)).toBeLessThan(1)
    // and the first body row has scrolled under it
    const firstRow = await box(grid.locator('.vg-row').first().locator('.vg-cell').first())
    expect(firstRow.y).toBeLessThan(after.y)
  })

  test('pinned columns stay put while scrolling horizontally', async ({ page }) => {
    const grid = demo(page, 'pinned')
    const scroller = grid.locator('.vg')
    const id = grid.locator('[role="columnheader"][data-col-key="id"]')
    const player = grid.locator('[role="columnheader"][data-col-key="player"]')
    const open = grid.locator('[role="columnheader"][data-col-key="open"]')
    const city = grid.locator('[role="columnheader"][data-col-key="city"]')
    const viewport = await box(scroller)

    const [id0, player0, city0] = [await box(id), await box(player), await box(city)]
    expect(player0.x).toBeCloseTo(id0.x + id0.width, 0) // second pinned column sits right after the first
    expect((await box(open)).x + (await box(open)).width).toBeCloseTo(
      viewport.x + viewport.width,
      0,
    )

    await scroller.hover()
    await page.mouse.wheel(500, 0)
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100)

    expect((await box(id)).x).toBeCloseTo(id0.x, 0)
    expect((await box(player)).x).toBeCloseTo(player0.x, 0)
    expect((await box(city)).x).toBeLessThan(city0.x - 100)
    const open1 = await box(open)
    expect(open1.x + open1.width).toBeCloseTo(viewport.x + viewport.width, 0)
    // body cells of pinned columns follow the header
    const bodyId = await box(grid.locator('.vg-row').first().locator('[data-col-key="id"]'))
    expect(bodyId.x).toBeCloseTo(id0.x, 0)
  })

  test('sub-grid child cells line up with parent columns (CSS subgrid), nested', async ({
    page,
  }) => {
    const grid = demo(page, 'subgrid')
    await grid.locator('[data-row-key="fb"] .vg-expander').click()
    await grid.locator('[data-row-key="fb-1x2"] .vg-expander').click()
    const child = grid.locator('[data-row-key="fb-1x2-h"]')
    await expect(child).toBeVisible()
    await expect(child).toHaveAttribute('aria-level', '3')

    for (const key of ['turnover', 'margin', 'status']) {
      const parent = await box(grid.locator(`[data-row-key="fb"] > [data-col-key="${key}"]`))
      const level1 = await box(grid.locator(`[data-row-key="fb-ou"] > [data-col-key="${key}"]`))
      const level2 = await box(child.locator(`[data-col-key="${key}"]`))
      for (const b of [level1, level2]) {
        expect(b.x).toBeCloseTo(parent.x, 0)
        expect(b.width).toBeCloseTo(parent.width, 0)
      }
    }
    // the tree column is indented per depth
    const indent = async (key: string) =>
      (await box(grid.locator(`[data-row-key="${key}"] > .vg-cell-tree .vg-cell-content`))).x
    expect(await indent('fb-ou')).toBeGreaterThan(await indent('fb'))
    expect(await indent('fb-1x2-h')).toBeGreaterThan(await indent('fb-ou'))

    await page.getByTestId('collapse-all').click()
    await expect(grid.locator('.vg-subgrid')).toHaveCount(0)
    await page.getByTestId('expand-all').click()
    await expect(grid.locator('[data-row-key="fb-1x2-a"]')).toBeVisible()
  })
})

test.describe('columns', () => {
  test('hide via column menu, then reset', async ({ page }) => {
    const grid = demo(page, 'pinned')
    await grid.getByRole('button', { name: 'Columns' }).click()
    const panel = page.getByRole('dialog', { name: 'Columns' })
    await expect(panel).toBeVisible()
    await panel.getByLabel('City').uncheck()
    await expect(grid.locator('[role="columnheader"][data-col-key="city"]')).toHaveCount(0)
    await expect(grid.locator('[role="gridcell"][data-col-key="city"]')).toHaveCount(0)
    await panel.getByLabel('KYC').check()
    await expect(grid.locator('[role="columnheader"][data-col-key="verified"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await page.reload()
    await expect(
      demo(page, 'pinned').locator('[role="columnheader"][data-col-key="city"]'),
    ).toHaveCount(0)
    await demo(page, 'pinned').getByRole('button', { name: 'Columns' }).click()
    await page
      .getByRole('dialog', { name: 'Columns' })
      .getByRole('button', { name: 'Reset columns' })
      .click()
    await expect(
      demo(page, 'pinned').locator('[role="columnheader"][data-col-key="city"]'),
    ).toBeVisible()
  })

  test('drag a header to reorder; order persists across reload', async ({ page }) => {
    const grid = demo(page, 'pinned')
    expect((await headerTexts(grid)).slice(2, 5)).toEqual(['City', 'Status', 'Stake'])
    const status = await box(grid.locator('[role="columnheader"][data-col-key="status"]'))
    const city = await box(grid.locator('[role="columnheader"][data-col-key="city"]'))
    await page.mouse.move(status.x + status.width / 2, status.y + status.height / 2)
    await page.mouse.down()
    await page.mouse.move(city.x + 20, city.y + city.height / 2, { steps: 8 })
    await expect(grid.locator('[role="columnheader"][data-col-key="city"]')).toHaveClass(
      /vg-drop-before/,
    )
    await page.mouse.up()
    await expect
      .poll(async () => (await headerTexts(grid)).slice(2, 5))
      .toEqual(['Status', 'City', 'Stake'])
    // body follows
    await expect(
      grid.locator('.vg-row').first().locator('[role="gridcell"]').nth(2),
    ).toHaveAttribute('data-col-key', 'status')
    await page.reload()
    expect((await headerTexts(demo(page, 'pinned'))).slice(2, 5)).toEqual([
      'Status',
      'City',
      'Stake',
    ])
  })

  test('a pinned column cannot be dropped into the unpinned group', async ({ page }) => {
    const grid = demo(page, 'pinned')
    const player = await box(grid.locator('[role="columnheader"][data-col-key="player"]'))
    const stake = await box(grid.locator('[role="columnheader"][data-col-key="stake"]'))
    await page.mouse.move(player.x + 30, player.y + player.height / 2)
    await page.mouse.down()
    await page.mouse.move(stake.x + 20, stake.y + stake.height / 2, { steps: 8 })
    await page.mouse.up()
    expect((await headerTexts(grid)).slice(0, 3)).toEqual(['#', 'Player', 'City'])
  })

  test('keyboard: Alt+Arrow moves the focused header', async ({ page }) => {
    const grid = demo(page, 'pinned')
    await grid.locator('[role="columnheader"][data-col-key="stake"]').click()
    await expect(grid.locator('[role="columnheader"][data-col-key="stake"]')).toBeFocused()
    await page.keyboard.press('Alt+ArrowLeft')
    await expect
      .poll(async () => (await headerTexts(grid)).slice(2, 5))
      .toEqual(['City', 'Stake', 'Status'])
    await expect(grid.locator('[role="columnheader"][data-col-key="stake"]')).toBeFocused()
  })
})

test.describe('expansion', () => {
  test('lazy sub-rows: loading, then rows; failing request shows Retry', async ({ page }) => {
    const grid = demo(page, 'lazy')
    await expect(grid.locator('[data-row-key="readme"] .vg-expander')).toHaveCount(0)
    await grid.locator('[data-row-key="docs"] .vg-expander').click()
    await expect(grid.locator('.vg-status-loading')).toBeVisible()
    await expect(grid.locator('[data-subgrid-for="docs"] > .vg-row')).toHaveCount(3)
    await expect(grid.locator('.vg-status-loading')).toHaveCount(0)

    await grid.locator('[data-row-key="broken"] .vg-expander').click()
    await expect(grid.locator('.vg-status-error')).toBeVisible()
    await expect(page.getByTestId('errors')).toHaveText('errors: 1')
    await grid.getByRole('button', { name: 'Retry' }).click()
    await expect(grid.locator('[data-subgrid-for="broken"] > .vg-row')).toHaveCount(3)
  })

  test('detail row hosts a nested grid with its own columns', async ({ page }) => {
    const grid = demo(page, 'detail')
    await grid.locator('[data-row-key="2"] .vg-expander').click()
    const detail = grid.locator('[data-detail-for="2"]')
    await expect(detail.getByRole('grid', { name: 'Legs of bet 2' })).toBeVisible()
    expect(await headerTexts(detail)).toEqual(['Leg', 'Event', 'Odds'])
    const outer = await box(grid.locator('.vg').first())
    const inner = await box(detail.locator('.vg-detail'))
    expect(inner.width).toBeCloseTo(outer.width, -1) // spans the full grid width
  })
})

test.describe('selection', () => {
  test('cascading selection with an indeterminate header', async ({ page }) => {
    const grid = demo(page, 'subgrid')
    await grid.locator('[data-row-key="fb"] .vg-checkbox input').click()
    await expect(page.getByTestId('subgrid-selected')).toContainText('fb-1x2-h')
    const header = grid.locator('.vg-header-select input')
    await expect.poll(() => header.evaluate((el: HTMLInputElement) => el.indeterminate)).toBe(true)

    await grid.locator('[data-row-key="fb"] .vg-expander').click()
    await grid.locator('[data-row-key="fb-ou"] .vg-checkbox input').click()
    await expect
      .poll(() =>
        grid
          .locator('[data-row-key="fb"] .vg-checkbox input')
          .evaluate((el: HTMLInputElement) => el.indeterminate),
      )
      .toBe(true)

    await header.click()
    await expect(header).toBeChecked()
    await header.click()
    await expect(page.getByTestId('subgrid-selected')).toHaveText('Selected: none')
  })

  test('rows that are not selectable have a disabled checkbox', async ({ page }) => {
    const grid = demo(page, 'detail')
    const voidRow = grid
      .locator('.vg-row', { has: page.locator('.vg-status-badge', { hasText: 'Void' }) })
      .first()
    if (await voidRow.count()) await expect(voidRow.locator('.vg-checkbox input')).toBeDisabled()
    await grid.locator('[data-row-key="1"] .vg-checkbox input').click()
    await expect(grid.getByTestId('selected')).toHaveText('selected: 1')
    await expect(grid.locator('[data-row-key="1"]')).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('keyboard', () => {
  test('arrow keys move focus between cells, across sub-grid rows', async ({ page }) => {
    const grid = demo(page, 'subgrid')
    await grid.locator('[data-row-key="fb"] .vg-expander').click()
    await grid.locator('[data-row-key="fb"] > [data-col-key="turnover"]').click()
    const focused = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        return `${el.parentElement?.dataset.rowKey ?? 'header'}:${el.dataset.colKey}`
      })
    expect(await focused()).toBe('fb:turnover')
    await page.keyboard.press('ArrowDown')
    expect(await focused()).toBe('fb-1x2:turnover')
    await page.keyboard.press('ArrowRight')
    expect(await focused()).toBe('fb-1x2:margin')
    await page.keyboard.press('Home')
    expect(await focused()).toBe('fb-1x2:__vg_select')
    await page.keyboard.press('ArrowRight')
    // tree cell: Right expands the collapsed row instead of moving
    await page.keyboard.press('ArrowRight')
    await expect(grid.locator('[data-row-key="fb-1x2-h"]')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(grid.locator('[data-row-key="fb-1x2-h"]')).toHaveCount(0)
    await page.keyboard.press('Control+Home')
    expect(await focused()).toBe('header:__vg_select')
    // Space toggles selection on a body row
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('subgrid-selected')).toContainText('fb')
  })

  test('Tab enters the grid on a cell and Enter on a header sorts', async ({ page }) => {
    const grid = demo(page, 'virtual')
    await grid.getByTestId('jump').focus()
    await page.keyboard.press('Tab')
    await expect(grid.locator('[role="columnheader"]').first()).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(grid.locator('[role="columnheader"]').first()).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
  })
})

test.describe('virtual scrolling', () => {
  test('keeps the DOM small and renders the right rows at any offset', async ({ page }) => {
    const grid = demo(page, 'virtual')
    const scroller = grid.locator('.vg')
    await expect(scroller).toHaveAttribute('aria-rowcount', '10001')
    expect(await grid.locator('.vg-row').count()).toBeLessThan(40)

    await scroller.evaluate((el) => (el.scrollTop = 40 * 4000))
    await expect(grid.locator('[data-row-key="4001"]')).toBeAttached()
    expect(await grid.locator('.vg-row').count()).toBeLessThan(40)
    // a row cell is exactly rowHeight tall and positioned where its index says
    const cell = grid.locator('[data-row-key="4005"] > .vg-cell').first()
    expect((await box(cell)).height).toBeCloseTo(40, 0)
    await expect(grid.locator('[data-row-key="4005"]')).toHaveAttribute('aria-rowindex', '4006')

    await grid.getByTestId('jump').click()
    await expect(grid.locator('[data-row-key="5000"]')).toBeVisible()

    await scroller.evaluate((el) => (el.scrollTop = el.scrollHeight))
    await expect(grid.locator('[data-row-key="10000"]')).toBeVisible()
    // and real wheel input moves the window too
    const firstKey = await grid.locator('.vg-row').first().getAttribute('data-row-key')
    await scroller.hover()
    await page.mouse.wheel(0, -2000)
    await expect
      .poll(() => grid.locator('.vg-row').first().getAttribute('data-row-key'))
      .not.toBe(firstKey)
  })
})

test.describe('renderers & events', () => {
  test('addon rating renderer emits an action instead of a row click', async ({ page }) => {
    const grid = demo(page, 'basic')
    await grid
      .locator('[data-row-key="1"] [data-col-key="rating"]')
      .getByRole('radio', { name: '4 of 5' })
      .click()
    await expect(page.getByTestId('log')).toHaveText('cell-action rate #1 4')
    await grid.locator('[data-row-key="1"] > [data-col-key="city"]').click()
    await expect(page.getByTestId('log')).toHaveText('row-click #1')
  })

  test('actions menu opens above the grid, supports keyboard, emits the action', async ({
    page,
  }) => {
    const grid = demo(page, 'basic')
    await grid.locator('[data-row-key="2"]').getByRole('button', { name: 'Actions' }).click()
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem').first()).toBeFocused()
    // the popover is in the top layer: not clipped by the grid's scroll container
    const m = await box(menu)
    expect(m.height).toBeGreaterThan(40)
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(menu).toBeHidden()
    await expect(page.getByTestId('log')).toHaveText(/cell-action delete #2/)
    await grid.locator('[data-row-key="3"]').getByRole('button', { name: 'Actions' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('menu')).toBeHidden()
  })

  test('json renderer shows escaped JSON in a modal dialog', async ({ page }) => {
    const grid = demo(page, 'basic')
    await grid
      .locator('[data-row-key="1"] [data-col-key="meta"]')
      .getByRole('button', { name: 'View' })
      .click()
    const dialog = page.locator('dialog[open]')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('pre')).toContainText('"channel"')
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog[open]')).toHaveCount(0)
    await expect(page.getByTestId('log')).not.toHaveText(/row-click/)
  })
})

test.describe('theming', () => {
  test('token overrides and ui classes apply; density changes padding', async ({ page }) => {
    const grid = demo(page, 'theme')
    const brandHeader = grid.getByTestId('brand-grid').locator('[role="columnheader"]').first()
    const defaultHeader = grid.getByTestId('default-grid').locator('[role="columnheader"]').first()
    await expect(brandHeader).toHaveCSS('background-color', 'rgb(253, 242, 248)')
    await expect(brandHeader).toHaveCSS('text-transform', 'uppercase')
    await expect(defaultHeader).toHaveCSS('font-style', 'italic')
    await expect(defaultHeader).not.toHaveCSS('background-color', 'rgb(253, 242, 248)')

    const cell = grid
      .getByTestId('default-grid')
      .locator('.vg-row')
      .first()
      .locator('.vg-cell')
      .first()
    const cozy = (await box(cell)).height
    await grid.getByTestId('density').selectOption('compact')
    await expect.poll(async () => (await box(cell)).height).toBeLessThan(cozy)
    await grid.getByTestId('density').selectOption('comfortable')
    await expect.poll(async () => (await box(cell)).height).toBeGreaterThan(cozy)
  })

  test('dark mode switches tokens via color-scheme', async ({ page }) => {
    const cell = demo(page, 'basic').locator('.vg-row').first().locator('.vg-cell').first()
    await expect(cell).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await page.getByTestId('dark-toggle').check()
    await expect(cell).toHaveCSS('background-color', 'rgb(17, 24, 39)')
  })
})
