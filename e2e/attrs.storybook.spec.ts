import { expect, test } from '@playwright/test'

// row-attrs / cell-attrs: your own attributes (test hooks) on rows and cells, 2,000 virtual rows.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

test('test hooks on rows and cells follow sorting and virtual scrolling', async ({ page }) => {
  await page.goto(`${base}/iframe.html?id=grid-configuration--test-hooks&viewMode=story`)
  const grid = page.locator('#storybook-root .vg')
  await grid.locator('.vg-row[data-row-key]').first().waitFor()

  // the first drawn row is row 0, with its cells' hooks; the grid's own attributes are kept
  const first = page.locator('[data-test="row-0"]')
  await expect(first).toHaveAttribute('role', 'row')
  const key = await first.getAttribute('data-row-key')
  expect(key).toBeTruthy()
  const playerCell = first.locator('[data-test="player-0"]')
  await expect(playerCell).toHaveAttribute('data-col-key', 'player')
  await expect(playerCell).toHaveAttribute('role', /^(grid)?cell$/)

  // sort by Stake, highest first: row 0 is now the biggest stake
  const stakeHeader = page.getByRole('columnheader', { name: /Stake/ })
  await stakeHeader.click()
  await stakeHeader.click()
  await expect(stakeHeader).toHaveAttribute('aria-sort', 'descending')
  const stakes = await page.locator('[data-test^="stake-"]').evaluateAll((els) =>
    els.slice(0, 5).map((el) => ({
      hook: el.getAttribute('data-test'),
      value: Number(el.textContent!.replace(/[^\d.-]/g, '')),
    })),
  )
  expect(stakes.map((s) => s.hook)).toEqual(['stake-0', 'stake-1', 'stake-2', 'stake-3', 'stake-4'])
  for (let i = 1; i < stakes.length; i++)
    expect(stakes[i]!.value).toBeLessThanOrEqual(stakes[i - 1]!.value)

  // far down, the drawn rows carry their real positions, not 0, 1, 2…
  await grid.hover()
  await expect(async () => {
    await page.mouse.wheel(0, 200_000)
    await expect(page.locator('[data-test="row-1999"]')).toBeVisible({ timeout: 1000 })
  }).toPass()
  await expect(page.locator('[data-test="row-0"]')).toHaveCount(0)
  await expect(page.locator('[data-test="row-1999"] [data-test="stake-1999"]')).toBeVisible()
  const drawn = await page
    .locator('.vg-row[data-test^="row-"]')
    .evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-test')!.slice(4))))
  expect(Math.min(...drawn)).toBeGreaterThan(1900)
})
