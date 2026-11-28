import { expect, test } from '@playwright/test'

const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test('inline-end sort indicators preserve label alignment, sort controls, and resize grips', async ({
  page,
}) => {
  await page.goto(`${base}/iframe.html?id=theming--sort-indicator-at-end&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Stock by location' })
  const header = (key: string) => grid.locator(`.vg-header > [data-col-key="${key}"]`)
  const name = header('name')
  const nameButton = name.getByRole('button', { name: 'Item description', exact: true })
  const nameLabel = name.locator('.vg-header-label')
  const indicator = name.locator('.vg-sort-icon')
  const grip = name.locator('.vg-resize-handle')
  const bodyNames = grid.locator('.vg-row > [data-col-key="name"]')

  const checkInlineEnd = async () => {
    const icon = (await indicator.boundingBox())!
    const handle = (await grip.boundingBox())!
    expect(handle.x - (icon.x + icon.width)).toBeGreaterThanOrEqual(0)
    expect(handle.x - (icon.x + icon.width)).toBeLessThan(20)
  }
  await expect(nameButton).toBeVisible()
  await checkInlineEnd()
  await expect(nameLabel).toHaveCSS('text-align', 'start')
  expect((await nameLabel.boundingBox())!.height).toBeGreaterThan(
    (await indicator.boundingBox())!.height,
  )
  await expect(indicator).toHaveCSS('inline-size', '14px')
  await expect(header('location').locator('.vg-header-label')).toHaveCSS('text-align', 'center')
  await expect(header('stock').locator('.vg-header-label')).toHaveCSS('text-align', 'end')

  await nameButton.click()
  await expect(name).toHaveAttribute('aria-sort', 'ascending')
  await expect(bodyNames.first()).toHaveText('Folding crate')
  await header('stock').locator('.vg-sort').press('Shift+Enter')
  await expect(header('stock').locator('.vg-sort-index')).toHaveText('2')
  await expect(header('stock').locator('.vg-sort')).toHaveAccessibleName(/sorted 2 of 2, ascending/)
  await expect(name).toHaveAttribute('aria-sort', 'ascending')

  await page.keyboard.press('Enter')
  await expect(header('stock')).toHaveAttribute('aria-sort', 'ascending')
  await header('stock').press('Enter')
  await expect(header('stock')).toHaveAttribute('aria-sort', 'descending')
  const before = (await name.boundingBox())!.width
  await grip.press('ArrowRight')
  expect((await name.boundingBox())!.width).toBeGreaterThan(before)
  await checkInlineEnd()
  await expect(header('stock')).toHaveAttribute('aria-sort', 'descending')

  await grid.evaluate((el) => {
    const root = el.closest<HTMLElement>('.vg-root')!
    root.style.setProperty('--vg-header-padding-x', '0px')
    root.style.setProperty('--vg-sort-icon-size', '1rem')
  })
  await expect(indicator).toHaveCSS('inline-size', '16px')
  await expect(indicator).toHaveCSS('block-size', '16px')
  await checkInlineEnd()
  await grid.evaluate((el) => el.closest('.vg-root')!.setAttribute('dir', 'rtl'))
  const rtlIcon = (await indicator.boundingBox())!
  const rtlGrip = (await grip.boundingBox())!
  expect(rtlIcon.x - (rtlGrip.x + rtlGrip.width)).toBeGreaterThanOrEqual(0)
  expect(rtlIcon.x - (rtlGrip.x + rtlGrip.width)).toBeLessThan(20)

  await grid.evaluate((el) => {
    const root = el.closest<HTMLElement>('.vg-root')!
    root.removeAttribute('dir')
    root.style.removeProperty('--vg-header-padding-x')
    root.classList.remove('vg-sort-indicator-end')
  })
  const defaultIcon = (await indicator.boundingBox())!
  const defaultGrip = (await grip.boundingBox())!
  expect(defaultGrip.x - (defaultIcon.x + defaultIcon.width)).toBeGreaterThan(40)
})

test('header and cell dividers are opt-in', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=theming--tokens&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Themed grid' })
  await expect(grid.getByRole('columnheader').first()).toHaveCSS('border-inline-end-style', 'none')
  await expect(grid.getByRole('gridcell').first()).toHaveCSS('border-inline-end-style', 'none')
})

test('custom sort artwork follows the direction and keeps the priority badge separate', async ({
  page,
}) => {
  await page.goto(`${base}/iframe.html?id=theming--sort-indicator-artwork&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Stock by location' })
  const name = grid.locator('.vg-header > [data-col-key="name"]')
  const stock = grid.locator('.vg-header > [data-col-key="stock"]')
  const nameArt = name.getByTestId('sort-art-name')
  const stockArt = stock.getByTestId('sort-art-stock')
  const nameButton = name.getByRole('button', { name: 'Item description', exact: true })
  const stockButton = stock.locator('.vg-sort')
  const currentRows = grid.locator('.vg-row > [data-col-key="name"]')
  await expect(nameArt).toHaveAttribute('data-direction', 'none')
  await expect(nameArt).toHaveCSS('inline-size', '14px')
  await expect(name.locator('svg.vg-sort-icon')).toHaveCount(0)
  await expect(grid.getByRole('img', { name: 'Sort artwork' })).toHaveCount(0)
  await grid.evaluate((el) =>
    el.closest<HTMLElement>('.vg-root')!.style.setProperty('--vg-sort-icon-size', '1rem'),
  )
  await expect(nameArt).toHaveCSS('inline-size', '16px')
  await expect(nameArt).toHaveCSS('block-size', '16px')
  const iconBox = (await nameArt.boundingBox())!
  const gripBox = (await name.locator('.vg-resize-handle').boundingBox())!
  expect(gripBox.x - (iconBox.x + iconBox.width)).toBeGreaterThanOrEqual(0)
  expect(gripBox.x - (iconBox.x + iconBox.width)).toBeLessThan(20)

  await nameButton.click()
  await expect(nameArt).toHaveAttribute('data-direction', 'asc')
  await expect(name).toHaveAttribute('aria-sort', 'ascending')
  await expect(currentRows.first()).toHaveText('Folding crate')
  await nameButton.press('Enter')
  await expect(nameArt).toHaveAttribute('data-direction', 'desc')
  await expect(name).toHaveAttribute('aria-sort', 'descending')
  await expect(currentRows.first()).toHaveText('Storage bin')

  await stockButton.press('Shift+Enter')
  await expect(stockArt).toHaveAttribute('data-direction', 'asc')
  await expect(stock.locator('.vg-sort-index')).toHaveText('2')
  await expect(stockArt.locator('.vg-sort-index')).toHaveCount(0)
  await expect(stockButton).toHaveAccessibleName(/Stock.*sorted 2 of 2, ascending/)
  await expect(name).toHaveAttribute('aria-sort', 'descending')
  await expect(stock).toHaveAttribute('aria-sort', 'none')
})

test('cell borders can opt back in under an unlayered width reset', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=theming--dividers&viewMode=story`)
  await page.addStyleTag({ content: '* { border-width: 0; }' })
  const grid = page.getByRole('grid', { name: 'Inventory' })
  const header = grid.locator('.vg-header > [data-col-key="id"]')
  const body = grid.locator('[data-row-key="1"] > [data-col-key="id"]')
  await expect(header).toHaveCSS('border-bottom-width', '0px')
  await expect(header).toHaveCSS('border-inline-end-width', '0px')
  await expect(body).toHaveCSS('border-bottom-width', '0px')
  await expect(body).toHaveCSS('border-inline-end-width', '0px')

  await grid.evaluate((el) => {
    const root = el.closest<HTMLElement>('.vg-root')!
    root.classList.add('vg-restore-cell-borders')
    root.style.setProperty('--vg-row-border', '1px solid rgb(30 60 90)')
    root.style.setProperty('--vg-header-border', '3px solid rgb(60 90 120)')
    root.style.setProperty(
      '--vg-header-border-inline-end',
      '2px solid color-mix(in srgb, currentColor 35%, transparent)',
    )
  })

  await expect(body).toHaveCSS('border-bottom-width', '1px')
  await expect(body).toHaveCSS('border-bottom-color', 'rgb(30, 60, 90)')
  await expect(body).toHaveCSS('border-inline-end-width', '1px')
  await expect(header).toHaveCSS('border-bottom-width', '3px')
  await expect(header).toHaveCSS('border-bottom-color', 'rgb(60, 90, 120)')
  await expect(header).toHaveCSS('border-inline-end-width', '2px')
  await expect(header).toHaveCSS('border-inline-end-color', /(?:\/|,) 0\.35\)/)
})

test('restored borders preserve the separators around pinned rows', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=grid-pinned-rows-totals--extra-rows&viewMode=story`)
  await page.addStyleTag({ content: '* { border-width: 0; }' })
  const grid = page.getByRole('grid', { name: 'Bets' })
  await grid.evaluate((el) => {
    const root = el.closest<HTMLElement>('.vg-root')!
    root.classList.add('vg-restore-cell-borders')
    root.style.setProperty('--vg-row-border', '1px solid currentColor')
    root.style.setProperty('--vg-header-border', '3px solid currentColor')
  })
  const top = grid.locator('.vg-pinned-top .vg-cell').first()
  const bottom = grid.locator('.vg-pinned-bottom .vg-cell').first()
  await expect(top).toHaveCSS('border-bottom-width', '3px')
  await expect(bottom).toHaveCSS('border-top-width', '3px')
  await expect(bottom).toHaveCSS('border-bottom-width', '0px')
})

test('compact headers honor the minimum and dividers follow pinned columns and text direction', async ({
  page,
}) => {
  await page.goto(`${base}/iframe.html?id=theming--dividers&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Inventory' })
  const start = grid.locator('.vg-header > [data-col-key="id"]')
  const end = grid.locator('.vg-header > [data-col-key="status"]')
  const middle = grid.locator('.vg-header > [data-col-key="location"]')
  const pinnedCell = grid.locator('[data-row-key="1"] > [data-col-key="id"]')
  const pinnedEndCell = grid.locator('[data-row-key="1"] > [data-col-key="status"]')
  await expect(start).toHaveCSS('min-block-size', '48px')
  expect((await start.boundingBox())!.height).toBeGreaterThanOrEqual(48)
  expect((await pinnedCell.boundingBox())!.height).toBeLessThan(48)

  for (const header of [start, middle, end]) {
    await expect(header).toHaveCSS('border-right-width', '2px')
    await expect(header).toHaveCSS('border-bottom-style', 'solid')
  }
  for (const cell of [pinnedCell, pinnedEndCell]) {
    await expect(cell).toHaveCSS('border-right-width', '1px')
    await expect(cell).toHaveCSS('border-bottom-style', 'solid')
  }

  const [startX, middleX, endX] = await Promise.all(
    [start, middle, end].map(async (header) => (await header.boundingBox())!.x),
  )
  await grid.evaluate((el) => (el.scrollLeft = 120))
  expect((await middle.boundingBox())!.x).toBeLessThan(middleX)
  expect((await start.boundingBox())!.x).toBeCloseTo(startX, 0)
  expect((await end.boundingBox())!.x).toBeCloseTo(endX, 0)

  await grid.evaluate((el) => el.closest('.vg-root')!.setAttribute('dir', 'rtl'))
  await expect(start).toHaveCSS('border-left-width', '2px')
  await expect(start).toHaveCSS('border-right-width', '0px')
  await expect(pinnedCell).toHaveCSS('border-left-width', '1px')
  await expect(pinnedCell).toHaveCSS('border-right-width', '0px')
})
