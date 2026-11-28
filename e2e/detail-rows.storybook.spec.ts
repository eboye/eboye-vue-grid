import { expect, test } from '@playwright/test'

const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test('wheel over a content-height detail grid scrolls the outer grid vertically', async ({
  page,
}) => {
  await page.goto(
    `${base}/iframe.html?id=grid-detail-rows--content-height-detail-grid&viewMode=story`,
  )
  const outer = page.getByRole('grid', { name: 'Projects', exact: true })
  const child = outer.getByRole('grid', { name: 'Project tasks' })
  const pinned = child.locator('[data-row-key="1"] > [data-col-key="name"]')
  await expect(pinned).toBeVisible()
  expect(await child.evaluate((el) => el.scrollHeight - el.clientHeight)).toBe(0)
  expect(await outer.evaluate((el) => el.scrollTop)).toBe(0)

  await pinned.hover()
  await page.mouse.wheel(0, 200)
  await expect.poll(() => outer.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
  expect(await child.evaluate((el) => el.scrollTop)).toBe(0)
  await expect(outer).toHaveCSS('overscroll-behavior-y', 'contain')
  await expect(child).toHaveCSS('overscroll-behavior-x', 'contain')

  const x = () => pinned.evaluate((el) => el.getBoundingClientRect().x)
  const left = await x()
  await child.evaluate((el) => (el.scrollLeft = 100))
  expect(await child.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  expect(await x()).toBeCloseTo(left, 0)
})

test('inline-end sort styling only applies to the grid that opts in', async ({ page }) => {
  await page.goto(
    `${base}/iframe.html?id=grid-detail-rows--content-height-detail-grid&viewMode=story`,
  )
  const outer = page.getByRole('grid', { name: 'Projects', exact: true })
  const child = outer.getByRole('grid', { name: 'Project tasks' })
  const optIn = (grid: typeof outer) =>
    grid.evaluate((el) => el.closest('.vg-root')!.classList.add('vg-sort-indicator-end'))
  const sort = (grid: typeof outer) => grid.locator(':scope > .vg-header .vg-sort')

  await optIn(outer)
  await expect(sort(outer)).toHaveCSS('flex-grow', '1')
  await expect(sort(child)).toHaveCSS('flex-grow', '0')
  await optIn(child)
  await expect(sort(child)).toHaveCSS('flex-grow', '1')
})

test('nested grids keep their own row sizing inside a measured virtual detail', async ({
  page,
}) => {
  await page.goto(`${base}/iframe.html?id=grid-detail-rows--virtual-nested-grids&viewMode=story`)
  const outer = page.getByRole('grid', { name: 'Projects', exact: true })
  const compact = outer.getByRole('grid', { name: 'Project tasks' })
  const virtual = outer.getByRole('grid', { name: 'All tasks' })
  const firstCell = (grid: typeof outer) => grid.locator(':scope > .vg-row > .vg-cell').first()
  const firstOuterCell = firstCell(outer)
  const compactCell = firstCell(compact)
  const virtualCell = firstCell(virtual)

  await expect(firstOuterCell).toHaveCSS('height', '60px')
  await expect(firstOuterCell).toHaveCSS('padding-block-start', '0px')
  await expect(virtualCell).toHaveCSS('height', '32px')
  await expect(virtualCell).toHaveCSS('overflow', 'hidden')
  await expect(virtualCell).toHaveCSS('padding-block-start', '0px')
  await expect(compactCell).toHaveCSS('overflow', 'visible')
  expect(
    parseFloat(await compactCell.evaluate((el) => getComputedStyle(el).paddingBlockStart)),
  ).toBeGreaterThan(0)
  expect((await compactCell.boundingBox())!.height).toBeLessThan(60)

  const height = () => outer.evaluate((el) => el.scrollHeight)
  const before = await height()
  await outer.getByRole('button', { name: 'Toggle extra task' }).click()
  await expect(compact.getByText('Publish content')).toBeVisible()
  const added = (await compactCell.boundingBox())!.height
  const expanded = await height()
  expect(expanded - before).toBeCloseTo(added, -1)

  await outer.evaluate((el) => (el.scrollTop = el.scrollHeight))
  await expect(outer.getByText('Project 32')).toBeVisible()
  await expect(compact).toHaveCount(0)
  await expect.poll(height).toBe(expanded)
})

test('tree and detail controls operate independently in a virtual grid', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=grid-detail-rows--independent-expansion&viewMode=story`)
  const grid = page.getByRole('treegrid', { name: 'Projects and tasks' })
  const parent = grid.locator('[data-row-key="1"] > [role="gridcell"]')
  const child = grid.locator('[data-row-key="2"] > [role="gridcell"]')
  const parentDetail = grid.getByText('Details of Website update')
  const childDetail = grid.getByText('Details of Review content')
  const taskCount = page.getByText('Visible tasks:')
  const treeButton = parent.getByTestId('tree-1')
  const detailButton = parent.getByTestId('detail-1')

  await expect(treeButton).toHaveAccessibleName('Show tasks for Website update')
  await expect(detailButton).toHaveAccessibleName('Show details for Website update')
  await parent.press('Shift+Enter')
  await expect(parentDetail).toBeVisible()
  await expect(detailButton).toHaveAccessibleName('Hide details for Website update')
  await expect(child).toHaveCount(0)
  await expect(taskCount).toHaveText('Visible tasks: 0')

  await parent.press('ArrowRight')
  await expect(child).toBeVisible()
  await expect(grid).toHaveAttribute('aria-rowcount', '4')
  await expect(parentDetail).toBeVisible()
  await expect(treeButton).toHaveAccessibleName('Hide tasks for Website update')
  await expect(taskCount).toHaveText('Visible tasks: 1')

  await grid.getByRole('button', { name: 'Close details' }).press('Enter')
  await expect(detailButton).toBeFocused()
  await child.getByTestId('detail-2').click()
  await expect(parentDetail).toHaveCount(0)
  await expect(childDetail).toBeVisible()
  await expect(child.getByTestId('detail-2')).toHaveAccessibleName(
    'Hide details for Review content',
  )
  await expect(taskCount).toHaveText('Visible tasks: 1')

  await parent.press('ArrowLeft')
  await expect(childDetail).toHaveCount(0)
  await expect(taskCount).toHaveText('Visible tasks: 0')
  await parent.press('ArrowRight')
  await expect(childDetail).toBeVisible()
  await expect(parentDetail).toHaveCount(0)
})

test('tree and detail buttons follow their columns after pinned reordering', async ({ page }) => {
  await page.goto(
    `${base}/iframe.html?id=grid-detail-rows--separate-control-columns&viewMode=story`,
  )
  const grid = page.getByRole('treegrid', { name: 'Projects and tasks' })
  const row = grid.locator('[data-row-key="1"]')
  const detailCell = row.locator('[data-col-key="details"]')
  const treeCell = row.locator('[data-col-key="name"]')
  const detailButton = detailCell.getByTestId('detail-1')
  const treeButton = treeCell.getByTestId('tree-1')
  const detail = grid.getByText('Details of Website update')
  const child = grid.locator('[data-row-key="2"]')

  await expect(detailButton).toHaveAccessibleName('Show details for Website update')
  await expect(treeButton).toHaveAccessibleName('Show tasks for Website update')
  await expect(detailCell.locator('.vg-tree-gutter')).toHaveCount(0)
  await expect(treeCell.getByTestId('detail-1')).toHaveCount(0)
  await treeCell.press('ArrowRight')
  await expect(treeButton).toHaveAttribute('aria-expanded', 'true')
  await expect(child.getByText('Review content')).toBeVisible()
  await expect(child.locator('[data-col-key="name"] .vg-tree-gutter')).toHaveCount(1)
  await detailCell.press('Shift+Enter')
  await expect(detail).toBeVisible()
  await expect(detailButton).toHaveAccessibleName('Hide details for Website update')

  const detailHeader = grid.locator('.vg-header > [data-col-key="details"]')
  await detailHeader.press('Alt+ArrowRight')
  await expect(grid.getByRole('columnheader').first()).toHaveAttribute('data-col-key', 'name')
  await expect(treeCell).toHaveClass(/vg-pin-left/)
  await expect(detailCell).toHaveClass(/vg-pin-left/)
  const [treeX, detailX] = await Promise.all(
    [treeCell, detailCell].map(async (cell) => (await cell.boundingBox())!.x),
  )
  await grid.evaluate((el) => (el.scrollLeft = 140))
  expect(await grid.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  expect((await treeCell.boundingBox())!.x).toBeCloseTo(treeX, 0)
  expect((await detailCell.boundingBox())!.x).toBeCloseTo(detailX, 0)

  await grid.getByRole('button', { name: 'Close details' }).press('Enter')
  await expect(detailButton).toBeFocused()
  await expect(detail).toHaveCount(0)
  await expect(treeButton).toHaveAttribute('aria-expanded', 'true')
  await treeCell.press('Shift+Enter')
  await expect(detail).toBeVisible()
  await detailButton.click()
  await expect(detail).toHaveCount(0)
  await treeButton.click()
  await expect(child).toHaveCount(0)
})

test('paged details restore focus and keep their overlays usable outside the grid', async ({
  page,
}) => {
  await page.goto(`${base}/iframe.html?id=grid-detail-rows--paged-details&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Paged projects' })
  const project = grid.locator('[data-row-key="1"] > [data-col-key="name"]')
  const detail = grid.getByRole('region', { name: 'Details for Website update' })
  const trigger = detail.getByRole('button', { name: 'Project actions' })
  const menu = page.getByRole('menu', { name: 'Project actions' })
  const review = menu.getByRole('menuitem', { name: 'Mark as reviewed' })
  const pager = page.getByRole('navigation', { name: 'Pagination' })
  const pageOne = pager.getByRole('button', { name: 'Page 1' })
  const pageTwo = pager.getByRole('button', { name: 'Page 2' })

  await project.press('Shift+Enter')
  await expect(detail).toBeVisible()
  await trigger.press('Enter')
  await expect(review).toBeFocused()
  const gridBox = (await grid.boundingBox())!
  const actionBox = (await review.boundingBox())!
  expect(actionBox.x + actionBox.width / 2).toBeGreaterThan(gridBox.x + gridBox.width)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.press('Enter')
  await review.click()
  await expect(detail.getByRole('status')).toHaveText('Project reviewed')
  await expect(trigger).toBeFocused()

  await detail.getByRole('button', { name: 'Close details' }).press('Enter')
  await expect(detail).toHaveCount(0)
  const expander = project.getByRole('button', { name: 'Show row details' })
  await expect(expander).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(detail).toBeVisible()
  await trigger.press('Enter')
  await expect(review).toBeFocused()

  await pageTwo.press('Enter')
  await expect(grid.getByRole('gridcell', { name: /Documentation/ })).toBeVisible()
  await expect(detail).toHaveCount(0)
  await expect(menu).toHaveCount(0)
  await expect(pageTwo).toBeFocused()
  await expect(pageTwo).toHaveAttribute('aria-current', 'page')

  await pageOne.press('Enter')
  await expect(detail.getByRole('status')).toHaveText('Project reviewed')
  await expect(menu).toBeHidden()
  await expect(pageOne).toBeFocused()
})

test('content-sized rows and details leave actions reachable on a short final page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 750 })
  await page.goto(`${base}/iframe.html?id=grid-detail-rows--content-sized-page&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Paged projects' })
  const pager = page.getByRole('navigation', { name: 'Pagination' })
  const rows = grid.locator('.vg-row[data-row-key]')
  const height = async () => (await grid.boundingBox())!.height

  await expect(rows).toHaveCount(3)
  await pager.getByRole('button', { name: 'Page 2' }).click()
  await expect(rows).toHaveCount(2)

  const report = rows.first().locator('[data-col-key="name"]')
  const archive = rows.last().locator('[data-col-key="name"]')
  await expect(report).toContainText('Reporting dashboard and quarterly accessibility review')
  await expect(archive).toContainText('Archive')
  const archiveBox = (await archive.boundingBox())!
  expect((await report.boundingBox())!.height).toBeGreaterThan(archiveBox.height)
  const gridBox = (await grid.boundingBox())!
  expect(archiveBox.y + archiveBox.height).toBeCloseTo(gridBox.y + gridBox.height, 0)

  const collapsedHeight = gridBox.height
  const detail = grid.getByRole('region', {
    name: 'Details for Reporting dashboard and quarterly accessibility review',
  })
  await report.press('Shift+Enter')
  await expect(detail).toBeInViewport({ ratio: 1 })
  expect(await height()).toBeGreaterThan(collapsedHeight)
  expect(await grid.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1)
  expect(await grid.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1)

  const archiveAction = grid.getByRole('button', { name: 'Review status for Archive' })
  await expect(archiveAction).toBeInViewport({ ratio: 1 })
  const panelBox = (await grid.locator('.vg-detail').boundingBox())!
  expect((await archiveAction.boundingBox())!.y).toBeGreaterThanOrEqual(
    panelBox.y + panelBox.height,
  )
  await archiveAction.click()
  await expect(archiveAction).toHaveAttribute('aria-pressed', 'true')

  await detail.getByRole('button', { name: 'Close details' }).press('Enter')
  await expect(detail).toHaveCount(0)
  await expect(report.getByRole('button', { name: 'Show row details' })).toBeFocused()
  expect(await height()).toBeCloseTo(collapsedHeight, 0)
  await expect(archiveAction).toHaveAttribute('aria-pressed', 'true')
})
