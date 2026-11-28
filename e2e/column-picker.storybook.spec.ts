import { expect, test } from '@playwright/test'

const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test('the default trigger keeps its text, icon and keyboard focus', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=components-vgridcolumnmenu--default&viewMode=story`)
  const trigger = page.getByRole('button', { name: 'Columns', exact: true })
  await expect(trigger).toHaveText('Columns')
  await expect(trigger.locator('svg')).toBeVisible()
  await trigger.press('Enter')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('the icon-only picker opens from its trigger and the header menu with keyboard focus', async ({
  page,
}) => {
  await page.goto(
    `${base}/iframe.html?id=components-vgridcolumnmenu--header-command&viewMode=story`,
  )
  const trigger = page.getByRole('button', { name: 'Choose columns' })
  const picker = page.getByRole('dialog', { name: 'Choose columns' })
  const search = picker.getByRole('searchbox')
  const nameHeader = page.locator('[role="columnheader"][data-col-key="name"]')

  await expect(trigger).toHaveText('')
  await expect(trigger).toHaveAttribute('title', 'Choose columns')
  await expect(trigger.getByTestId('picker-icon')).toBeVisible()
  await trigger.press('Enter')
  await expect(search).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await search.press('Escape')
  await expect(picker).toBeHidden()
  await expect(trigger).toBeFocused()

  await nameHeader.press('Shift+F10')
  const command = page.getByRole('menuitem', { name: 'Choose columns' })
  await expect(command).toBeVisible()
  await command.press('Enter')
  await expect(search).toBeFocused()
  await expect(command).toBeHidden()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await picker.getByRole('checkbox', { name: 'Region' }).uncheck()
  await expect(page.getByRole('columnheader', { name: 'Region' })).toHaveCount(0)
  await search.press('Escape')
  await expect(picker).toBeHidden()
  await expect(nameHeader).toBeFocused()

  await nameHeader.click({ button: 'right' })
  await command.click()
  await expect(search).toBeFocused()
})
