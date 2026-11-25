import { expect, test, type Page } from '@playwright/test'

// Grid / Configuration: `messages` (built-in text) and `parts` (pieces a feature adds), with real
// mouse and keyboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=grid-configuration--${id}&viewMode=story`)
  await page.locator('#storybook-root [role="grid"]').first().waitFor()
}
const header = (page: Page, key: string) =>
  page.locator(`.vg-header > [role="columnheader"][data-col-key="${key}"]`)
const headerKeys = (page: Page) =>
  page
    .locator('.vg-header > [role="columnheader"][data-col-key]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.colKey))
/** Drags the Status header onto the City header with the mouse. */
async function dragStatusOntoCity(page: Page) {
  const from = (await header(page, 'status').boundingBox())!
  const to = (await header(page, 'city').boundingBox())!
  // the plain part of the header: not the sort button (left), the funnel or the resize grip (right)
  await page.mouse.move(from.x + from.width - 50, from.y + 12)
  await page.mouse.down()
  await page.mouse.move(to.x + 20, to.y + 12, { steps: 10 })
  await page.mouse.up()
}

test.describe('configuration', () => {
  test('messages: menus, filters, pager, status bar and totals in Serbian', async ({ page }) => {
    await story(page, 'translated')
    // header menu, right-click
    await header(page, 'city').click({ button: 'right' })
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Rastuće' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Grupiši po: City' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Sakrij kolonu' })).toBeVisible()
    await page.keyboard.press('Escape')
    // filter row and funnel
    const filter = header(page, 'city').locator('.vg-filter-input input')
    await expect(filter).toHaveAttribute('placeholder', 'Filtriraj…')
    await expect(header(page, 'city').locator('.vg-filter-button')).toHaveAttribute(
      'aria-label',
      'Filter: City',
    )
    // pager, status bar, totals
    const pager = page.locator('.vg-pagination')
    await expect(pager).toContainText('1–10 od 60')
    await expect(pager.getByRole('button', { name: 'Sledeća strana' })).toBeVisible()
    const bar = page.locator('.vg-status-bar')
    await expect(bar).toContainText('60 redova')
    await expect(bar).toContainText('izabrano: 1')
    await expect(bar).toContainText('Zbir')
    await expect(page.locator('.vg-pinned-rows')).toContainText('Ukupno')
    // typing a filter: the counts follow, in Serbian
    await filter.click()
    await page.keyboard.type('Niš')
    await expect(bar).toContainText(/\d+ od 60 redova/)
    await expect(bar).toContainText('filtera: 1')
    await expect(header(page, 'city').locator('.vg-filter-button')).toHaveAttribute(
      'aria-label',
      'Filter: City (uključen)',
    )
    await bar.getByRole('button', { name: 'Obriši' }).click()
    await expect(bar).toContainText('60 redova')
  })

  test('language packs: switching the language translates the whole grid', async ({ page }) => {
    await story(page, 'language-packs')
    const bar = page.locator('.vg-status-bar')
    const pager = page.locator('.vg-pagination')
    // German (the story's start)
    await expect(bar).toContainText('60 Zeilen')
    await expect(bar).toContainText('1 ausgewählt')
    await expect(pager).toContainText('1–10 von 60')
    await expect(page.locator('.vg-pinned-rows')).toContainText('Summe')
    await header(page, 'city').click({ button: 'right' })
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('menuitem', { name: 'Aufsteigend sortieren' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Nach City gruppieren' })).toBeVisible()
    await page.keyboard.press('Escape')
    // typing a filter: the counts and the funnel follow
    const filter = header(page, 'city').locator('.vg-filter-input input')
    await expect(filter).toHaveAttribute('placeholder', 'Filtern…')
    await filter.click()
    await page.keyboard.type('Niš')
    await expect(bar).toContainText(/\d+ von 60 Zeilen/)
    await expect(bar).toContainText('1 Filter')
    await expect(header(page, 'city').locator('.vg-filter-button')).toHaveAttribute(
      'aria-label',
      'City filtern (aktiv)',
    )
    // Serbian, Cyrillic: picked in the select; plurals by Serbian rules
    await page.getByTestId('language').selectOption('sr')
    await expect(bar).toContainText(/\d+ од 60 редова/)
    await expect(bar).toContainText('1 филтер')
    await expect(bar).toContainText('Изабрано: 1')
    await bar.getByRole('button', { name: 'Обриши' }).click()
    await expect(bar).toContainText('60 редова')
    await expect(pager.getByRole('button', { name: 'Следећа страна' })).toBeVisible()
    // French
    await page.getByTestId('language').selectOption('fr')
    await expect(bar).toContainText('60 lignes')
    await expect(bar).toContainText('1 sélectionnée')
    await expect(page.locator('.vg-pinned-rows')).toContainText('Total')
    await header(page, 'city').click({ button: 'right' })
    await expect(menu.getByRole('menuitem', { name: 'Grouper par City' })).toBeVisible()
  })

  test('with every part on, dragging a header moves the column (control)', async ({ page }) => {
    await story(page, 'translated')
    expect((await headerKeys(page)).indexOf('status')).toBeGreaterThan(
      (await headerKeys(page)).indexOf('city'),
    )
    await dragStatusOntoCity(page)
    await expect
      .poll(async () => (await headerKeys(page)).indexOf('status'))
      .toBeLessThan((await headerKeys(page)).indexOf('city'))
  })

  test('parts off: no funnels, grips, header drag, select-all, first / last, Clear', async ({
    page,
  }) => {
    await story(page, 'parts-off')
    await expect(page.locator('.vg-filter-button')).toHaveCount(0)
    await expect(page.locator('.vg-resize-handle')).toHaveCount(0)
    await expect(page.locator('.vg-header input[type="checkbox"]')).toHaveCount(0)
    await expect(page.locator('.vg-row input[type="checkbox"]').first()).toBeVisible() // rows still select
    await expect(page.locator('.vg-page-first, .vg-page-last')).toHaveCount(0)
    // dragging a header does nothing now
    const before = await headerKeys(page)
    await dragStatusOntoCity(page)
    await page.waitForTimeout(300)
    expect(await headerKeys(page)).toEqual(before)
    // the filter row still filters; the status bar has no Clear button
    await header(page, 'city').locator('.vg-filter-input input').click()
    await page.keyboard.type('Niš')
    const bar = page.locator('.vg-status-bar')
    await expect(bar).toContainText('1 filter')
    await expect(bar.getByRole('button')).toHaveCount(0)
    // the header menu still moves columns (only dragging is off)
    await header(page, 'status').click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Move left' }).click()
    await expect
      .poll(async () => (await headerKeys(page)).indexOf('status'))
      .toBeLessThan(before.indexOf('status'))
  })
})
