import { expect, test, type Locator, type Page } from '@playwright/test'

const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const title = (grid: Locator, key: string) =>
  grid.locator(`[data-row-key="${key}"] > [data-col-key="title"]`)
const scrollTop = (grid: Locator) => grid.evaluate((el) => el.scrollTop)
const center = (cell: Locator) => cell.evaluate((el) => el.scrollIntoView({ block: 'center' }))

async function open(page: Page) {
  await page.goto(`${base}/iframe.html?id=grid-detail-rows--refreshing-views&viewMode=story`)
  const count = page.getByRole('status', { name: 'Visible tasks' })
  await expect(count).toHaveText('Visible tasks: 12')
  return {
    tree: page.getByRole('treegrid', { name: 'Work item tree' }),
    groups: page.getByRole('treegrid', { name: 'Tasks by team' }),
    count,
    // Deliver the update without moving focus, as a live feed would.
    refresh: () => page.getByRole('button', { name: 'Refresh records' }).dispatchEvent('click'),
    patch: () => page.getByRole('button', { name: 'Apply task update' }).dispatchEvent('click'),
  }
}

test('tree refresh keeps the focused row and restores details under collapsed ancestors', async ({
  page,
}) => {
  const { tree, count, refresh, patch } = await open(page)
  const leaf = title(tree, 'ops-6')
  const detail = tree.locator('[data-detail-for="ops-6"]')
  await leaf.press('Shift+Enter')
  await expect(detail).toContainText('Revision 1')
  await leaf.scrollIntoViewIfNeeded()
  const before = await scrollTop(tree)
  expect(before).toBeGreaterThan(0)

  await refresh()
  await expect(detail).toContainText('Revision 2')
  await patch()
  await expect(detail).toContainText('Revision 3')
  await expect(count).toHaveText('Visible tasks: 12')
  await expect(leaf).toBeFocused()
  expect(await scrollTop(tree)).toBeCloseTo(before, 0)

  const workspace = title(tree, 'workspace')
  await workspace.press('ArrowLeft')
  await expect(detail).toHaveCount(0)
  await expect(count).toHaveText('Visible tasks: 0')
  await refresh()
  await expect(count).toHaveText('Visible tasks: 0')
  await expect(workspace).toBeFocused()
  await workspace.press('ArrowRight')
  await expect(detail).toContainText('Revision 4')
  await expect(count).toHaveText('Visible tasks: 12')

  await title(tree, 'library').press('ArrowRight')
  await expect(count).toHaveText('Visible tasks: 18')
  await expect(title(tree, 'support-6')).toContainText('Library task 6')
})

test('grouped refresh and view switching preserve labels, expansion, scroll, and focus', async ({
  page,
}) => {
  const { tree, groups, count, refresh, patch } = await open(page)
  const treeLeaf = title(tree, 'ops-6')
  await treeLeaf.press('Shift+Enter')
  await center(treeLeaf)
  const treeScroll = await scrollTop(tree)
  const showGrouped = () => page.getByRole('button', { name: 'Grouped view' }).press('Enter')
  const showTree = () => page.getByRole('button', { name: 'Tree view' }).press('Enter')

  await showGrouped()
  await expect(tree).toHaveCount(0)
  const operations = groups.locator('.vg-rowgroup-cell').filter({ hasText: 'Operations team' })
  const support = groups.locator('.vg-rowgroup-cell').filter({ hasText: 'Support team' })
  await expect(count).toHaveText('Visible tasks: 0')
  await operations.press('ArrowRight')
  const leaf = title(groups, 'ops-6')
  const detail = groups.locator('[data-detail-for="ops-6"]')
  await expect(detail).toContainText('Revision 1')
  await leaf.focus()
  await center(leaf)
  const groupScroll = await scrollTop(groups)
  expect(groupScroll).toBeGreaterThan(0)

  await patch()
  await expect(detail).toContainText('Revision 2')
  await refresh()
  await expect(detail).toContainText('Revision 3')
  await expect(leaf).toBeFocused()
  await expect(support.getByRole('button', { name: 'Expand group' })).toBeAttached()
  await expect(count).toHaveText('Visible tasks: 12')
  expect(await scrollTop(groups)).toBeCloseTo(groupScroll, 0)

  await showTree()
  await expect(groups).toHaveCount(0)
  expect(await scrollTop(tree)).toBeCloseTo(treeScroll, 0)
  await tree.focus()
  await expect(treeLeaf).toBeFocused()
  expect(await scrollTop(tree)).toBeCloseTo(treeScroll, 0)
  await expect(tree.locator('[data-detail-for="ops-6"]')).toContainText('Revision 3')
  await showGrouped()
  expect(await scrollTop(groups)).toBeCloseTo(groupScroll, 0)
  await groups.focus()
  await expect(leaf).toBeFocused()
  expect(await scrollTop(groups)).toBeCloseTo(groupScroll, 0)
  await expect(count).toHaveText('Visible tasks: 12')

  await operations.press('ArrowLeft')
  await expect(detail).toHaveCount(0)
  await expect(count).toHaveText('Visible tasks: 0')
  await showTree()
  await showGrouped()
  await expect(operations.getByRole('button', { name: 'Expand group' })).toBeAttached()
  await operations.press('ArrowRight')
  await expect(detail).toContainText('Revision 3')
  await support.press('ArrowRight')
  await expect(count).toHaveText('Visible tasks: 18')
})
