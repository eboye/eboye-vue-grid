import { test } from '@playwright/test'

// Visual evidence, not assertions: writes e2e/screenshots/<engine>-<width>-<demo>.png
const demos = ['basic', 'pinned', 'subgrid', 'lazy', 'detail', 'virtual', 'pagination', 'theme']

for (const width of [1280, 390]) {
  test(`screenshots @ ${width}px`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium' && width === 390, 'mobile width captured once')
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await page.locator('[data-demo="subgrid"] [data-row-key="fb"] .vg-expander').click()
    await page.locator('[data-demo="subgrid"] [data-row-key="fb-1x2"] .vg-expander').click()
    await page.locator('[data-demo="detail"] [data-row-key="1"] .vg-expander').click()
    for (const demo of demos) {
      await page.locator(`[data-demo="${demo}"]`).screenshot({
        path: `e2e/screenshots/${browserName}-${width}-${demo}.png`,
        animations: 'disabled',
      })
    }
  })
}

test('menu screenshots', async ({ page, browserName }) => {
  await page.goto('/')
  const grid = page.locator('[data-demo="basic"]')
  const cell = grid.locator('[data-row-key="2"] > [data-col-key="status"]')
  const c = (await cell.boundingBox())!
  await page.mouse.click(c.x + 20, c.y + c.height / 2, { button: 'right' })
  await page.locator('[role="menu"]:popover-open').waitFor()
  await page.screenshot({
    path: `e2e/screenshots/${browserName}-context-menu.png`,
    clip: { x: c.x - 200, y: c.y - 60, width: 560, height: 320 },
  })
  await page.keyboard.press('Escape')

  const header = grid.locator('[role="columnheader"][data-col-key="stake"]')
  await header.click({ button: 'right' })
  await page.locator('[role="menu"]:popover-open').waitFor()
  const h = (await header.boundingBox())!
  await page.screenshot({
    path: `e2e/screenshots/${browserName}-header-menu.png`,
    clip: { x: h.x - 200, y: h.y - 20, width: 560, height: 420 },
  })
  await page.keyboard.press('Escape')

  const trigger = grid.locator('[data-row-key="1"]').getByRole('button', { name: 'Actions' })
  await trigger.click()
  await page.locator('[role="menu"]:popover-open').waitFor()
  const t = (await trigger.boundingBox())!
  await page.screenshot({
    path: `e2e/screenshots/${browserName}-actions-menu.png`,
    clip: { x: t.x - 300, y: t.y - 20, width: 380, height: 160 },
  })
})

test('dark mode screenshot', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  await page.goto('/?theme=dark')
  await page.locator('[data-demo="subgrid"] [data-row-key="fb"] .vg-expander').click()
  for (const demo of ['basic', 'subgrid', 'theme']) {
    await page
      .locator(`[data-demo="${demo}"]`)
      .screenshot({ path: `e2e/screenshots/chromium-dark-${demo}.png` })
  }
})
