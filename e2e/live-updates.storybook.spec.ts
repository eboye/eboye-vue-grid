import { expect, test, type Page } from '@playwright/test'

// Partial updates in a real browser: patched cells change, every other cell's DOM node survives.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const story = async (page: Page, id: string) => {
  await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`)
  await page.locator('#storybook-root [role="grid"]').waitFor()
}

/** Tags every body cell's DOM node so we can tell later whether Vue replaced or re-rendered it. */
const tagCells = (page: Page) =>
  page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('.vg-row > [data-col-key]').forEach((el) => {
      ;(el as unknown as { __tag: string }).__tag =
        `${el.parentElement!.dataset.rowKey}:${el.dataset.colKey}`
      ;(el as unknown as { __html: string }).__html = el.innerHTML
    })
  })
/** Cells whose node was replaced, or whose content changed, since tagCells(). */
const changedCells = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.vg-row > [data-col-key]')]
      .filter((el) => {
        const tagged = el as unknown as { __tag?: string; __html?: string }
        return !tagged.__tag || tagged.__html !== el.innerHTML
      })
      .map((el) => `${el.parentElement!.dataset.rowKey}:${el.dataset.colKey}`),
  )

test('enrichment via patchRows: only the patched rows change, nodes elsewhere are kept', async ({
  page,
}) => {
  await story(page, 'grid-live-updates--enrichment')
  const city = (row: number) => page.locator(`[data-row-key="${row}"] > [data-col-key="city"]`)
  await expect(city(1)).toHaveText('loading…')
  await tagCells(page)

  await page.getByTestId('enrich').click()
  await expect(city(1)).not.toHaveText('loading…')
  await expect(city(5)).toHaveText('loading…')
  const changed = await changedCells(page)
  // Rows 1–4 got a city (the player object was patched, so their Player and City cells change).
  expect(new Set(changed.map((c) => c.split(':')[0]))).toEqual(new Set(['1', '2', '3', '4']))
  expect(changed).toContain('1:city')
  expect(changed).not.toContain('1:stake') // unchanged value: same output
})

test('reactive rows: assigning a field changes exactly one cell', async ({ page }) => {
  await story(page, 'grid-live-updates--reactive-rows')
  await tagCells(page)
  const key = await page.locator('.vg-row').nth(2).getAttribute('data-row-key')
  await page.getByTestId('bump').click()
  await expect.poll(() => changedCells(page)).toEqual([`${key}:stake`])
})

test('live ticker keeps updating a few cells at a time and can be paused', async ({ page }) => {
  await story(page, 'grid-live-updates--live-ticker')
  await tagCells(page)
  await expect
    .poll(async () => (await changedCells(page)).length, { timeout: 5000 })
    .toBeGreaterThan(0)
  const changed = await changedCells(page)
  expect(changed.every((c) => /:(stake|change)$/.test(c))).toBe(true) // only the fed fields
  await page.getByTestId('toggle').click()
  await tagCells(page)
  await page.waitForTimeout(1800)
  expect(await changedCells(page)).toEqual([])
})

/**
 * The cell's running flash animation (on its `::after` tint layer), frozen at `progress` so the
 * colour can be read deterministically. `bg` is what shows: the tint layer over the cell's
 * background; `tint` is the layer alone, with its current opacity applied.
 */
const flashAt = (page: Page, selector: string, progress = 0) =>
  page.locator(selector).evaluate((el, p) => {
    const anim = el
      .getAnimations({ subtree: true })
      .find((a) => (a as CSSAnimation).animationName?.startsWith('vg-flash'))
    // Any CSS colour (oklab(), color(srgb …), rgb()) → [r, g, b, a] 0–255 via a canvas pixel.
    const toRgba = (css: string, alpha = 1) => {
      const ctx = Object.assign(document.createElement('canvas'), {
        width: 1,
        height: 1,
      }).getContext('2d')!
      ctx.globalAlpha = alpha
      ctx.fillStyle = css
      ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data]
    }
    const shown = () => {
      const cell = getComputedStyle(el)
      const layer = getComputedStyle(el, '::after')
      const opacity = layer.content === 'none' ? 0 : Number(layer.opacity)
      const ctx = Object.assign(document.createElement('canvas'), {
        width: 1,
        height: 1,
      }).getContext('2d')!
      ctx.fillStyle = cell.backgroundColor
      ctx.fillRect(0, 0, 1, 1)
      ctx.globalAlpha = opacity
      ctx.fillStyle = layer.backgroundColor
      ctx.fillRect(0, 0, 1, 1)
      return {
        bg: [...ctx.getImageData(0, 0, 1, 1).data],
        tint: toRgba(layer.backgroundColor, opacity),
      }
    }
    if (!anim) return { name: 'none', ...shown() }
    anim.pause()
    anim.currentTime = Number(anim.effect!.getComputedTiming().duration) * p
    return { name: (anim as CSSAnimation).animationName, ...shown() }
  }, progress)
const rgb = (c: number[]) => c

test('flash: changed cells get a tint that fades out; direction colours, restart, unchanged cells untouched', async ({
  page,
}) => {
  await story(page, 'grid-live-updates--reactive-rows')
  const key = await page.locator('.vg-row').nth(2).getAttribute('data-row-key')
  const stake = `[data-row-key="${key}"] > [data-col-key="stake"]`
  const other = `[data-row-key="${key}"] > [data-col-key="player"]`
  await page.getByTestId('bump').click()
  const up = await flashAt(page, stake, 0)
  expect(up.name).toBe('vg-flash-1')
  const [r, g, b] = rgb(up.bg)
  expect(g!).toBeGreaterThan(r!) // rising number → green tint
  expect(g!).toBeGreaterThan(b!)
  expect(up.tint[3]!).toBeGreaterThan(20) // visible…
  expect(up.tint[3]!).toBeLessThan(140) // …but subtle (translucent)
  const neighbour = await flashAt(page, other)
  expect(neighbour.name).toBe('none') // unchanged cell: no animation
  // near the end it has faded back to the cell's own background (same as its unchanged neighbour)
  const end = await flashAt(page, stake, 0.999)
  end.bg.forEach((channel, i) =>
    expect(Math.abs(channel - neighbour.bg[i]!)).toBeLessThanOrEqual(3),
  )
  // a second change restarts it with the other (identical) keyframes
  await page.getByTestId('bump').click()
  expect((await flashAt(page, stake)).name).toBe('vg-flash-2')
})

test('flash: neutral tint for non-numeric changes, red for falling numbers', async ({ page }) => {
  await story(page, 'grid-live-updates--enrichment')
  await page.getByTestId('enrich').click()
  const city = await flashAt(page, '[data-row-key="1"] > [data-col-key="city"]')
  expect(city.name).toMatch(/^vg-flash-/)
  const [r, g, b] = rgb(city.bg)
  expect(b!).toBeGreaterThan(g!) // accent (blue-violet) tint, not green / red
  expect(b!).toBeGreaterThan(r!)

  await story(page, 'grid-live-updates--live-ticker')
  await expect
    .poll(() => page.locator('[data-vg-flash-dir="down"]').count(), { timeout: 8000 })
    .toBeGreaterThan(0)
  const down = await flashAt(page, '[data-vg-flash-dir="down"] >> nth=0')
  const [dr, dg] = rgb(down.bg)
  expect(dr!).toBeGreaterThan(dg!) // falling number → red tint
})

test('flash with prefers-reduced-motion: the tint holds, then switches off, without fading', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await story(page, 'grid-live-updates--reactive-rows')
  const key = await page.locator('.vg-row').nth(2).getAttribute('data-row-key')
  const stake = `[data-row-key="${key}"] > [data-col-key="stake"]`
  await page.getByTestId('bump').click()
  const start = await flashAt(page, stake, 0)
  const middle = await flashAt(page, stake, 0.6)
  expect(middle.bg).toEqual(start.bg) // no fade: same tint mid-way
  expect(start.tint[3]!).toBeGreaterThan(20) // and it is visible
})
