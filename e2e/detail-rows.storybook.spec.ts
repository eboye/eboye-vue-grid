import { expect, test } from '@playwright/test'

const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test('tree and detail controls operate independently in a virtual grid', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=grid-detail-rows--independent-expansion&viewMode=story`)
  const grid = page.getByRole('treegrid', { name: 'Projects and tasks' })
  const parent = grid.locator('[data-row-key="1"] > [role="gridcell"]')
  const child = grid.locator('[data-row-key="2"] > [role="gridcell"]')
  const parentDetail = grid.getByText('Details of Website update')
  const childDetail = grid.getByText('Details of Review content')
  const taskCount = page.getByText('Visible tasks:')

  await parent.press('Shift+Enter')
  await expect(parentDetail).toBeVisible()
  await expect(child).toHaveCount(0)
  await expect(taskCount).toHaveText('Visible tasks: 0')

  await parent.press('ArrowRight')
  await expect(child).toBeVisible()
  await expect(grid).toHaveAttribute('aria-rowcount', '4')
  await expect(parentDetail).toBeVisible()
  await expect(taskCount).toHaveText('Visible tasks: 1')

  await parent.getByRole('button', { name: 'Hide row details' }).click()
  await child.getByRole('button', { name: 'Show row details' }).click()
  await expect(parentDetail).toHaveCount(0)
  await expect(childDetail).toBeVisible()
  await expect(taskCount).toHaveText('Visible tasks: 1')

  await parent.press('ArrowLeft')
  await expect(childDetail).toHaveCount(0)
  await expect(taskCount).toHaveText('Visible tasks: 0')
  await parent.press('ArrowRight')
  await expect(childDetail).toBeVisible()
  await expect(parentDetail).toHaveCount(0)
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
