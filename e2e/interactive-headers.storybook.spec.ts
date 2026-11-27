import { expect, test, type Locator } from '@playwright/test'

const box = async (locator: Locator) => (await locator.boundingBox())!

test('interactive headers and menus preserve the layout of a fitted grid', async ({ page }) => {
  const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
  await page.goto(`${base}/iframe.html?id=grid-columns--interactive-headers&viewMode=story`)
  const grid = page.getByRole('grid', { name: 'Projects' })
  const groups = grid.locator('.vg-group-cell')
  const header = grid.locator('.vg-header > [data-col-key="name"]')
  const trigger = grid.getByRole('button', { name: 'Name options' })
  const menu = page.getByRole('menu', { name: 'Name options' })
  const help = page.getByRole('status', { name: 'Project help' })
  const fieldAction = menu.getByRole('menuitem', { name: 'Show field key' })

  const expectFitted = async (rowCount: number) => {
    await expect(grid.locator('.vg-row')).toHaveCount(rowCount)
    const viewport = await box(grid)
    expect(viewport.height).toBeCloseTo(32 + 40 + 36 * rowCount, 0)
    expect((await box(groups)).y).toBeCloseTo(viewport.y, 0)
    expect((await box(header)).y).toBeCloseTo(viewport.y + 32, 0)
    const lastCell = await box(grid.locator('.vg-row > .vg-cell').last())
    expect(lastCell.y + lastCell.height).toBeCloseTo(viewport.y + viewport.height, 0)
    expect(await grid.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1)
    return viewport
  }

  const compact = await expectFitted(1)
  await header.focus()
  await page.keyboard.press('F2')
  await expect(trigger).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Show column description' })).toBeFocused()
  await expectFitted(1)
  expect((await box(fieldAction)).y).toBeGreaterThan(compact.y + compact.height)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(header).not.toHaveAttribute('aria-sort', 'ascending')

  await trigger.click()
  await fieldAction.click()
  await expect(menu).toBeHidden()
  await expect(help).toHaveText('Field key: name')

  const groupAction = grid.getByRole('button', { name: 'About this group' })
  await groupAction.focus()
  await page.keyboard.press('Space')
  await expect(help).toHaveText('Project columns describe the project and its owner.')

  await page.getByRole('button', { name: 'Show all projects' }).click()
  await expectFitted(3)
  await header.focus()
  await page.keyboard.press('Enter')
  await expect(header).toHaveAttribute('aria-sort', 'ascending')
  await expect(grid.locator('.vg-row').first()).toContainText('Design system')
  await expectFitted(3)
})
