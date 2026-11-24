import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// CSV export and copying (Grid / Export & copy), with real mouse, keyboard, downloads and clipboard.
const base = process.env.STORYBOOK_URL ?? 'http://localhost:6006'
const open = async (page: Page) => {
  await page.goto(`${base}/iframe.html?id=grid-export-copy--export-and-copy&viewMode=story`)
  await page.locator('#storybook-root .vg .vg-row').first().waitFor()
}
const grid = (page: Page) => page.locator('#storybook-root .vg')
const copied = (page: Page) => page.locator('[data-test="copied"]')
const mod = process.platform === 'darwin' ? 'Meta' : 'Control'
/** The names in the body, in order. */
const names = (page: Page) =>
  grid(page)
    .locator(':scope > .vg-row > [data-col-key="player"]')
    .evaluateAll((els) => els.map((e) => e.textContent!.trim()))

test('Download CSV: the filtered, sorted rows with a header, totals, a BOM, and no action column', async ({
  page,
}) => {
  await open(page)
  await page.locator('.vg-header [data-col-key="player"] .vg-sort').click() // sort by player
  const filter = page.locator('.vg-header [data-col-key="city"] input').first()
  await filter.fill('Beograd')
  await expect.poll(async () => (await names(page)).length).toBeLessThan(40)
  const visible = await names(page)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-test="download"]').click(),
  ])
  expect(download.suggestedFilename()).toBe('bets.csv')
  const bytes = readFileSync((await download.path())!)
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
  const lines = bytes.subarray(3).toString('utf8').split('\r\n')
  expect(lines[0]).toBe('#,Player,City,Status,Stake,Δ odds,Placed')
  const body = lines.slice(1, -1)
  expect(body.map((l) => l.split(',')[1])).toEqual(visible)
  expect(body.every((l) => l.split(',')[2] === 'Beograd')).toBe(true)
  expect(lines.at(-1)).toMatch(/^Total,/)
})

/** The files of the stored (uncompressed) ZIP that an .xlsx is, by name, as text. */
function unzip(bytes: Buffer): Record<string, string> {
  const files: Record<string, string> = {}
  let at = 0
  while (bytes.readUInt32LE(at) === 0x04034b50) {
    const size = bytes.readUInt32LE(at + 18)
    const nameLength = bytes.readUInt16LE(at + 26)
    const name = bytes.subarray(at + 30, at + 30 + nameLength).toString('utf8')
    const start = at + 30 + nameLength
    files[name] = bytes.subarray(start, start + size).toString('utf8')
    at = start + size
  }
  return files
}

test('Download Excel: the filtered, sorted rows as typed cells, a bold header, the totals', async ({
  page,
}) => {
  await open(page)
  await page.locator('.vg-header [data-col-key="player"] .vg-sort').click() // sort by player
  await page.locator('.vg-header [data-col-key="city"] input').first().fill('Beograd')
  await expect.poll(async () => (await names(page)).length).toBeLessThan(40)
  const visible = await names(page)
  const stakes = await grid(page)
    .locator(':scope > .vg-row > [data-col-key="stake"]')
    .evaluateAll((els) => els.map((e) => Number(e.textContent!.replace(/[^\d.-]/g, ''))))

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-test="download-xlsx"]').click(),
  ])
  expect(download.suggestedFilename()).toBe('bets.xlsx')
  const files = unzip(readFileSync((await download.path())!))
  expect(files['xl/workbook.xml']).toContain('<sheet name="Bets"')
  const sheet = files['xl/worksheets/sheet1.xml']!
  const rows = [...sheet.matchAll(/<row r="(\d+)">(.*?)<\/row>/g)].map(([, , body]) =>
    [...body!.matchAll(/<c r="([A-Z]+)\d+" s="(\d+)"(?: t="(\w+)")?>(.*?)<\/c>/g)].map(
      ([, col, style, type, value]) => ({
        col,
        style: Number(style),
        type: type ?? 'n',
        value: value!.replace(/<[^>]+>/g, ''),
      }),
    ),
  )
  // header: bold text, frozen
  expect(rows[0]!.map((c) => c.value)).toEqual([
    '#',
    'Player',
    'City',
    'Status',
    'Stake',
    'Δ odds',
    'Placed',
  ])
  expect(rows[0]!.every((c) => c.style === 1)).toBe(true)
  expect(sheet).toContain('state="frozen"')
  // the body: what the grid shows, in its order; stakes as numbers in a money format
  const body = rows.slice(1, -1)
  expect(body.map((r) => r.find((c) => c.col === 'B')!.value)).toEqual(visible)
  expect(body.every((r) => r.find((c) => c.col === 'C')!.value === 'Beograd')).toBe(true)
  const stake = body.map((r) => r.find((c) => c.col === 'E')!)
  expect(stake.every((c) => c.type === 'n' && c.style === 2)).toBe(true)
  expect(stake.map((c) => Number(c.value))).toEqual(stakes)
  // dates are Excel dates (serial numbers in a date format), not text
  expect(body.every((r) => r.find((c) => c.col === 'G')!.style === 4)).toBe(true)
  // totals: a bold last line, the sum of the stakes
  const totals = rows.at(-1)!
  expect(totals[0]).toMatchObject({ value: 'Total', style: 1 })
  expect(Number(totals.find((c) => c.col === 'E')!.value)).toBeCloseTo(
    stakes.reduce((a, b) => a + b, 0),
    6,
  )
})

test('Ctrl/⌘+C on a focused cell copies it as shown; with rows selected it copies the rows', async ({
  page,
  browserName,
}) => {
  // Chromium lets the test read the clipboard back; elsewhere the grid's `copy` event is the check
  if (browserName === 'chromium')
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  const cell = grid(page).locator(':scope > .vg-row').first().locator('[data-col-key="stake"]')
  const shown = (await cell.textContent())!.trim()
  await cell.click()
  await page.keyboard.press(`${mod}+c`)
  await expect(copied(page)).toHaveText(`Cell: ${shown}`)
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown)

  const rows = grid(page).locator(':scope > .vg-row')
  await rows.nth(0).locator('.vg-cell-select input').click()
  await rows.nth(2).locator('.vg-cell-select input').click()
  await rows.nth(0).locator('[data-col-key="player"]').click()
  await page.keyboard.press(`${mod}+c`)
  await expect(copied(page)).toContainText('2 rows:')
  const text = (await copied(page).textContent())!.replace(/^2 rows: /, '')
  const first = text.split('\n')[0]!.split('\t')
  expect(first).toHaveLength(7) // every exportable column, tab-separated
  expect(first[1]).toBe(
    (await rows.nth(0).locator('[data-col-key="player"]').textContent())!.trim(),
  )
  if (browserName === 'chromium')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text)
})

test('a text selection is copied by the browser, not replaced by the grid', async ({ page }) => {
  await open(page)
  const cell = grid(page).locator(':scope > .vg-row').first().locator('[data-col-key="city"]')
  await cell.click()
  await cell.evaluate((el) => {
    const range = document.createRange()
    range.selectNodeContents(el)
    getSelection()!.removeAllRanges()
    getSelection()!.addRange(range)
  })
  await page.keyboard.press(`${mod}+c`)
  await expect(copied(page)).toHaveText('')
})

test('the Copy button copies the selected rows; the preview shows formatted values', async ({
  page,
  browserName,
}) => {
  await open(page)
  await grid(page).locator(':scope > .vg-row').nth(1).locator('.vg-cell-select input').click()
  // no clipboard permission here: headless Chromium refuses the Clipboard API, the fallback copies
  await page.locator('[data-test="copy"]').click()
  await expect(copied(page)).toContainText('1 rows:')
  if (browserName === 'chromium') {
    await page.context().grantPermissions(['clipboard-read'])
    const text = (await copied(page).textContent())!.replace(/^1 rows: /, '')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text)
  }
  await page.locator('[data-test="preview"]').click()
  const csv = (await page.locator('[data-test="csv"]').textContent())!
  expect(csv.split('\n')[1]).toMatch(/€/) // stake as currency
})

test('Print: a table of the filtered, sorted rows from a hidden frame, then the frame goes', async ({
  page,
}) => {
  await open(page)
  await page.locator('.vg-header [data-col-key="player"] .vg-sort').click()
  await page.locator('.vg-header [data-col-key="city"] input').first().fill('Beograd')
  await expect.poll(async () => (await names(page)).length).toBeLessThan(40)
  const visible = await names(page)

  // No print dialog in a test browser: catch the frame as it's added, keep what it would print.
  await page.evaluate(() => {
    const w = window as unknown as { printed?: unknown }
    new MutationObserver((records) => {
      for (const r of records)
        for (const node of r.addedNodes)
          if (node instanceof HTMLIFrameElement)
            node.contentWindow!.print = () => {
              const doc = node.contentDocument!
              const cells = (sel: string) =>
                [...doc.querySelectorAll(sel)].map((e) => e.textContent ?? '')
              w.printed = {
                title: doc.title,
                header: cells('thead th'),
                players: [...doc.querySelectorAll('tbody tr:not(.total)')].map(
                  (tr) => tr.children[1]!.textContent,
                ),
                cities: [...doc.querySelectorAll('tbody tr:not(.total)')].map(
                  (tr) => tr.children[2]!.textContent,
                ),
                stakeAlign: getComputedStyle(doc.querySelector('tbody td:nth-child(5)')!).textAlign,
                footer: cells('tbody tr.total td'),
                frameVisibleOnScreen: node.getBoundingClientRect().right > 0,
              }
            }
    }).observe(document.body, { childList: true })
  })
  await page.locator('[data-test="print"]').click()
  await expect
    .poll(() => page.evaluate(() => !!(window as { printed?: unknown }).printed))
    .toBe(true)
  const printed = (await page.evaluate(() => (window as { printed?: unknown }).printed)) as {
    title: string
    header: string[]
    players: string[]
    cities: string[]
    stakeAlign: string
    footer: string[]
    frameVisibleOnScreen: boolean
  }
  expect(printed.title).toBe('Bets')
  expect(printed.header).toEqual(['#', 'Player', 'City', 'Status', 'Stake', 'Δ odds', 'Placed'])
  expect(printed.players).toEqual(visible) // every matching row, in the grid's order
  expect(printed.cities.every((c) => c === 'Beograd')).toBe(true)
  expect(printed.stakeAlign).toMatch(/^(end|right)$/)
  expect(printed.footer[0]).toBe('Total')
  expect(printed.footer[4]).toMatch(/^€[\d,]+\.\d\d$/)
  expect(printed.frameVisibleOnScreen).toBe(false)
  // printing is over once the page has focus again: the frame is removed
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('iframe[aria-hidden="true"]')).toHaveCount(0)
})
