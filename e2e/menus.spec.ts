import { expect, test, type Locator, type Page } from '@playwright/test'

const demo = (page: Page, name: string) => page.locator(`[data-demo="${name}"]`)
const openMenu = (page: Page) => page.locator('[role="menu"]:popover-open')
const box = async (l: Locator) => {
  const b = await l.boundingBox()
  if (!b) throw new Error('no bounding box')
  return b
}
const headerKeys = (grid: Locator) =>
  grid
    .locator('.vg-header > [role="columnheader"]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.colKey))

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test.describe('actions menu (popover + anchor positioning)', () => {
  test('is anchored under its trigger and follows it while the grid scrolls', async ({ page }) => {
    const grid = demo(page, 'basic')
    const trigger = grid.locator('[data-row-key="2"]').getByRole('button', { name: 'Actions' })
    await trigger.click()
    const menu = openMenu(page)
    await expect(menu).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const t0 = await box(trigger)
    const m0 = await box(menu)
    expect(m0.y - (t0.y + t0.height)).toBeGreaterThanOrEqual(0)
    expect(m0.y - (t0.y + t0.height)).toBeLessThan(8)
    expect(m0.x + m0.width).toBeCloseTo(t0.x + t0.width, 0) // right edges aligned (span-left)

    // scroll the grid body: the menu stays open and moves with the trigger
    await grid.locator('.vg').evaluate((el) => (el.scrollTop = 40))
    await expect.poll(async () => (await box(trigger)).y).toBeLessThan(t0.y - 30)
    await expect(menu).toBeVisible()
    const t1 = await box(trigger)
    const m1 = await box(menu)
    expect(m1.y - (t1.y + t1.height)).toBeCloseTo(m0.y - (t0.y + t0.height), 0)

    await page.keyboard.press('Escape')
    await expect(openMenu(page)).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})

test.describe('menu visibility', () => {
  test('opening menus logs no CSS deprecation warnings', async ({ page }) => {
    const warnings: string[] = []
    page.on('console', (m) => {
      if (/deprecated/i.test(m.text())) warnings.push(m.text())
    })
    await page.reload()
    await demo(page, 'basic')
      .locator('[data-row-key="2"]')
      .getByRole('button', { name: 'Actions' })
      .click()
    await expect(openMenu(page)).toBeVisible()
    await demo(page, 'basic')
      .locator('[role="columnheader"][data-col-key="stake"]')
      .click({ button: 'right' })
    await expect(openMenu(page)).toBeVisible()
    expect(warnings).toEqual([])
  })

  test('hides once its trigger is scrolled out of the grid', async ({ page, browserName }) => {
    // Chromium hides it with CSS `position-visibility`; Firefox 159 can't, so a JS fallback does.
    test.info().annotations.push({ type: 'engine', description: browserName })
    const grid = demo(page, 'basic')
    const trigger = grid.locator('[data-row-key="2"]').getByRole('button', { name: 'Actions' })
    await trigger.click()
    const menu = page.locator('.vg-actions-menu [role="menu"]:popover-open')
    await expect(menu).toBeVisible()
    // Put the grid mid-page, then scroll its body just far enough that the trigger is clipped by the
    // grid's scroll container while still inside the page viewport: only `position-visibility`
    // (or its JS fallback) can hide the menu then — it would otherwise float over the grid, on screen.
    const scroller = grid.locator('.vg')
    await scroller.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 320))
    const s = await box(scroller)
    const t = await box(trigger)
    await scroller.evaluate((el, by) => (el.scrollTop += by), t.y + t.height - s.y + 4)
    await expect
      .poll(async () => (await box(trigger)).y + (await box(trigger)).height)
      .toBeLessThan(s.y)
    expect((await box(trigger)).y).toBeGreaterThan(0) // still on the page
    // Hidden boxes keep their computed style but are no longer painted or hit-testable.
    const hitsMenu = () =>
      menu.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return !!hit && el.contains(hit)
      })
    await expect.poll(hitsMenu).toBe(false)
    // and shows again when it scrolls back
    await grid.locator('.vg').evaluate((el) => (el.scrollTop = 0))
    await expect.poll(hitsMenu).toBe(true)
  })
})

test.describe('cell context menu', () => {
  test('opens at the pointer on right-click and emits context-action', async ({ page }) => {
    const grid = demo(page, 'basic')
    const cell = grid.locator('[data-row-key="1"] > [data-col-key="city"]')
    const c = await box(cell)
    const x = c.x + 12
    const y = c.y + c.height / 2
    await page.mouse.click(x, y, { button: 'right' })
    const menu = openMenu(page)
    await expect(menu).toBeVisible()
    await expect(menu).toHaveAttribute('aria-label', 'Row actions')
    const m = await box(menu)
    expect(Math.abs(m.x - x)).toBeLessThan(6)
    expect(Math.abs(m.y - y)).toBeLessThan(6)
    await expect(menu.getByRole('menuitem').first()).toBeFocused()
    await expect(menu.getByRole('menuitem', { name: 'Void bet' })).toBeDisabled()

    await menu.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(openMenu(page)).toHaveCount(0)
    await expect(page.getByTestId('log')).toHaveText('context-action delete #1 city')
  })

  test('flips to stay inside the viewport near the bottom-right corner', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 520 })
    const grid = demo(page, 'basic')
    await grid.locator('.vg-viewport').evaluate((el) => el.scrollIntoView({ block: 'end' }))
    const vp = page.viewportSize()!
    // the bottom-most fully visible rating cell in the grid
    const scroller = await box(grid.locator('.vg'))
    const x = Math.min(vp.width - 10, scroller.x + scroller.width - 20)
    const y = Math.min(vp.height - 10, scroller.y + scroller.height - 12)
    await page.mouse.click(x, y, { button: 'right' })
    const menu = openMenu(page)
    await expect(menu).toBeVisible()
    const m = await box(menu)
    expect(m.x + m.width).toBeLessThanOrEqual(vp.width)
    expect(m.y + m.height).toBeLessThanOrEqual(vp.height)
    expect(m.y + m.height).toBeLessThanOrEqual(y + 4) // flipped above the pointer
    expect(m.x + m.width).toBeLessThanOrEqual(x + 4) // and to its left
  })

  test('returns [] → no custom menu (the Link column keeps the native one)', async ({ page }) => {
    const grid = demo(page, 'basic')
    const prevented = await grid
      .locator('[data-row-key="1"] > [data-col-key="site"]')
      .evaluate((el) => {
        const e = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 5,
          clientY: 5,
        })
        el.dispatchEvent(e)
        return e.defaultPrevented
      })
    expect(prevented).toBe(false)
    await expect(openMenu(page)).toHaveCount(0)
  })

  test('a second right-click elsewhere re-opens the menu there', async ({ page }) => {
    const grid = demo(page, 'basic')
    const a = await box(grid.locator('[data-row-key="1"] > [data-col-key="city"]'))
    const b = await box(grid.locator('[data-row-key="3"] > [data-col-key="player"]'))
    await page.mouse.click(a.x + 10, a.y + 10, { button: 'right' })
    await expect(openMenu(page)).toBeVisible()
    await page.mouse.click(b.x + 10, b.y + 10, { button: 'right' })
    await expect(openMenu(page)).toBeVisible()
    const m = await box(openMenu(page))
    expect(Math.abs(m.x - (b.x + 10))).toBeLessThan(6)
    await openMenu(page)
      .getByRole('menuitem', { name: /Open bet/ })
      .click()
    await expect(page.getByTestId('log')).toHaveText('context-action open #3 player')
  })

  test('keyboard: Shift+F10 opens it at the focused cell; typeahead, Enter, Esc restores focus', async ({
    page,
  }) => {
    const grid = demo(page, 'basic')
    const cell = grid.locator('[data-row-key="2"] > [data-col-key="city"]')
    await cell.click()
    await expect(cell).toBeFocused()
    await page.keyboard.press('Shift+F10')
    const menu = openMenu(page)
    await expect(menu).toBeVisible()
    const c = await box(cell)
    const m = await box(menu)
    expect(Math.abs(m.y - (c.y + c.height))).toBeLessThan(8) // anchored under the cell
    await page.keyboard.press('Escape')
    await expect(openMenu(page)).toHaveCount(0)
    await expect(cell).toBeFocused()

    await page.keyboard.press('ContextMenu')
    await expect(openMenu(page)).toBeVisible()
    await page.keyboard.press('d') // typeahead → "Delete"
    await expect(openMenu(page).getByRole('menuitem', { name: 'Delete' })).toBeFocused()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowDown')
    await expect(openMenu(page).getByRole('menuitem', { name: /Open bet/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('log')).toHaveText('context-action open #2 city')
  })
})

test.describe('submenus', () => {
  const sub = (page: Page) => page.getByRole('menu', { name: 'Copy as' })

  test('keyboard: → / Enter open it with focus on its first item; ← and Esc go back; Enter chooses', async ({
    page,
  }) => {
    const grid = demo(page, 'basic')
    const cell = grid.locator('[data-row-key="2"] > [data-col-key="city"]')
    await cell.click()
    await page.keyboard.press('Shift+F10')
    const parent = page.getByRole('menuitem', { name: 'Copy as' })
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await expect(parent).toBeFocused()
    await expect(parent).toHaveAttribute('aria-haspopup', 'menu')
    await expect(parent).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('ArrowRight')
    await expect(sub(page)).toBeVisible()
    await expect(parent).toHaveAttribute('aria-expanded', 'true')
    await expect(sub(page).getByRole('menuitem', { name: 'Bet ID' })).toBeFocused()
    // beside its item, not over it
    const [p, s] = [await box(parent), await box(sub(page))]
    expect(s.x >= p.x + p.width - 4 || s.x + s.width <= p.x + 4).toBe(true)
    expect(Math.abs(s.y - p.y)).toBeLessThan(12)
    // its own items only: the arrows stay in it, a reason shows on the disabled one
    await page.keyboard.press('ArrowDown')
    await expect(sub(page).getByRole('menuitem', { name: 'Link' })).toBeFocused()
    await expect(sub(page).getByRole('menuitem', { name: 'JSON' })).toHaveAccessibleDescription(
      'Not for this column',
    )
    await page.keyboard.press('ArrowLeft')
    await expect(sub(page)).toHaveCount(0)
    await expect(parent).toBeFocused()
    await expect(openMenu(page)).toHaveCount(1) // the menu itself stays
    await page.keyboard.press('Enter')
    await expect(sub(page).getByRole('menuitem', { name: 'Bet ID' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(sub(page)).toHaveCount(0)
    await expect(parent).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(openMenu(page)).toHaveCount(0)
    await expect(page.getByTestId('log')).toHaveText('context-action copy-id #2 city')
    await expect(cell).toBeFocused()
  })

  test('mouse: hovering its item opens it, another item closes it; a click chooses', async ({
    page,
  }) => {
    const grid = demo(page, 'basic')
    const cell = grid.locator('[data-row-key="1"] > [data-col-key="city"]')
    const c = await box(cell)
    await page.mouse.click(c.x + 12, c.y + c.height / 2, { button: 'right' })
    const parent = page.getByRole('menuitem', { name: 'Copy as' })
    await parent.hover()
    await expect(sub(page)).toBeVisible()
    await page.getByRole('menuitem', { name: /Open bet/ }).hover()
    await expect(sub(page)).toHaveCount(0)
    await parent.hover()
    await expect(sub(page)).toBeVisible()
    // across to the submenu: it stays
    await sub(page).getByRole('menuitem', { name: 'Link' }).hover()
    await page.waitForTimeout(400)
    await expect(sub(page)).toBeVisible()
    await sub(page).getByRole('menuitem', { name: 'Link' }).click()
    await expect(openMenu(page)).toHaveCount(0)
    await expect(page.getByTestId('log')).toHaveText('context-action copy-link #1 city')
  })

  test('Tab in a submenu closes the whole menu', async ({ page }) => {
    const grid = demo(page, 'basic')
    await grid.locator('[data-row-key="2"] > [data-col-key="city"]').click()
    await page.keyboard.press('Shift+F10')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowRight')
    await expect(sub(page)).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(openMenu(page)).toHaveCount(0)
  })
})

test.describe('header context menu', () => {
  test('sorts and runs custom items', async ({ page }) => {
    const grid = demo(page, 'basic')
    const header = grid.locator('[role="columnheader"][data-col-key="stake"]')
    await header.click({ button: 'right' })
    await openMenu(page).getByRole('menuitem', { name: 'Sort descending' }).click()
    await expect(header).toHaveAttribute('aria-sort', 'descending')
    await header.click({ button: 'right' })
    await expect(openMenu(page).getByRole('menuitem', { name: 'Sort descending' })).toBeDisabled()
    await openMenu(page).getByRole('menuitem', { name: 'Copy column values' }).click()
    await expect(page.getByTestId('log')).toHaveText('header-action copy-column stake')
  })

  test('pins a column at runtime (sticky while scrolling), persists, and unpins', async ({
    page,
  }) => {
    const grid = demo(page, 'pinned')
    const stake = grid.locator('[role="columnheader"][data-col-key="stake"]')
    await stake.click({ button: 'right' })
    await expect(openMenu(page)).toHaveAttribute('aria-label', 'Stake column')
    await openMenu(page).getByRole('menuitem', { name: 'Pin left' }).click()
    await expect
      .poll(() => headerKeys(grid))
      .toEqual(expect.arrayContaining(['id', 'player', 'stake']))
    expect((await headerKeys(grid)).slice(0, 3)).toEqual(['id', 'player', 'stake'])
    await expect(stake).toHaveClass(/vg-pin-left/)
    const shadow = (key: string) =>
      grid
        .locator(`[role="columnheader"][data-col-key="${key}"]`)
        .evaluate((el) => getComputedStyle(el).boxShadow)
    // No edge shadow until content scrolls under the pinned columns.
    expect(await shadow('stake')).toBe('none')

    const x0 = (await box(stake)).x
    await grid.locator('.vg').evaluate((el) => (el.scrollLeft = 400))
    await expect
      .poll(async () => (await box(grid.locator('[role="columnheader"][data-col-key="city"]'))).x)
      .toBeLessThan(x0)
    expect((await box(stake)).x).toBeCloseTo(x0, 0)
    // Now the new innermost pinned column (Stake) carries the edge shadow, Player no longer does.
    await expect.poll(() => shadow('stake')).not.toBe('none')
    expect(await shadow('player')).toBe('none')
    // body cells of the newly pinned column stick too
    const bodyStake = grid.locator('.vg-row').first().locator('[data-col-key="stake"]')
    expect((await box(bodyStake)).x).toBeCloseTo(x0, 0)

    await page.reload()
    const after = demo(page, 'pinned')
    expect((await headerKeys(after)).slice(0, 3)).toEqual(['id', 'player', 'stake'])
    await after.locator('[role="columnheader"][data-col-key="stake"]').click({ button: 'right' })
    await expect(openMenu(page).getByRole('menuitem', { name: 'Pin left' })).toBeDisabled()
    await openMenu(page).getByRole('menuitem', { name: 'Unpin' }).click()
    await expect(after.locator('[role="columnheader"][data-col-key="stake"]')).not.toHaveClass(
      /vg-pin-left/,
    )
  })

  test('pin right, move and hide from the header menu', async ({ page }) => {
    const grid = demo(page, 'pinned')
    await grid.locator('[role="columnheader"][data-col-key="city"]').click({ button: 'right' })
    await openMenu(page).getByRole('menuitem', { name: 'Pin right' }).click()
    const keys = await headerKeys(grid)
    expect(keys.slice(-2)).toEqual(['city', 'open'])

    await grid.locator('[role="columnheader"][data-col-key="status"]').click({ button: 'right' })
    await openMenu(page).getByRole('menuitem', { name: 'Move right' }).click()
    const moved = await headerKeys(grid)
    expect(moved.indexOf('status')).toBe(moved.indexOf('stake') + 1)

    await grid.locator('[role="columnheader"][data-col-key="payout"]').click({ button: 'right' })
    await openMenu(page).getByRole('menuitem', { name: 'Hide column' }).click()
    await expect(grid.locator('[data-col-key="payout"]')).toHaveCount(0)

    // the pinned "#" column is not reorderable → no move items are enabled
    await grid.locator('[role="columnheader"][data-col-key="id"]').click({ button: 'right' })
    await expect(openMenu(page).getByRole('menuitem', { name: 'Move left' })).toHaveCount(0)
    await openMenu(page).getByRole('menuitem', { name: 'Reset columns' }).click()
    await expect(grid.locator('[role="columnheader"][data-col-key="payout"]')).toBeVisible()
  })
})
