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
      await page
        .locator(`[data-demo="${demo}"]`)
        .screenshot({ path: `e2e/screenshots/${browserName}-${width}-${demo}.png`, animations: 'disabled' })
    }
  })
}

test('dark mode screenshot', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium')
  await page.goto('/?theme=dark')
  await page.locator('[data-demo="subgrid"] [data-row-key="fb"] .vg-expander').click()
  for (const demo of ['basic', 'subgrid', 'theme']) {
    await page.locator(`[data-demo="${demo}"]`).screenshot({ path: `e2e/screenshots/chromium-dark-${demo}.png` })
  }
})
