// Screenshots one Storybook story per built-in renderer for the README gallery: the grid only,
// light theme, 2x, cut after the last whole row that fits; popover renderers are shown open.
//
//   npm run storybook                    (Storybook on :6006)
//   npm run screenshots                  → docs/media/renderers/<renderer>.png
//
// Compressed with pngquant when it is installed (optional).
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? fileURLToPath(new URL('../docs/media/renderers', import.meta.url))
mkdirSync(outDir, { recursive: true })
const SB = 'http://localhost:6006/iframe.html?viewMode=story&id=renderers--'
const MAX_HEIGHT = 300

/** Renderer → the story that shows it best. */
const stories = {
  text: 'text-adornments',
  'toggle-text': 'toggle-text',
  number: 'number',
  'signed-number': 'signed-number',
  currency: 'currency',
  change: 'change',
  date: 'date',
  datetime: 'date-time',
  boolean: 'boolean',
  status: 'status-variants',
  chip: 'chip',
  icon: 'icon',
  image: 'image',
  link: 'link',
  'multi-line': 'multi-line',
  list: 'list',
  code: 'code',
  json: 'json',
  'json-tree': 'json-tree',
  details: 'details',
  copy: 'copy',
  edit: 'edit',
  'action-button': 'action-button-variants',
  'button-group': 'button-group',
  'actions-menu': 'actions-menu',
  'icon-toggle': 'icon-toggle',
  checkbox: 'checkbox',
  switch: 'switch',
  radio: 'radio',
}
/** Popover renderers: opened before the shot. */
const openers = { details: '.vg-details button', 'actions-menu': '.vg-actions-menu button' }

const hasPngquant = spawnSync('pngquant', ['--version']).status === 0
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 500, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
})
// A freshly started Storybook may reload the page once while Vite optimises dependencies:
// warm it up, and retry a navigation that such a reload interrupts.
const open = async (url) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await page.goto(url)
    } catch (error) {
      if (attempt === 3) throw error
      await page.waitForTimeout(1500)
    }
  }
}
await open(SB + 'text')
await page.waitForTimeout(3000)

for (const [name, story] of Object.entries(stories)) {
  await open(SB + story)
  const grid = page.locator('#storybook-root .vg-root').first()
  await grid.waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
  if (openers[name]) {
    await page.locator(`#storybook-root ${openers[name]}`).first().click()
    await page.waitForTimeout(300)
  }
  const box = await grid.boundingBox()
  const bottom = await grid.evaluate((el, max) => {
    const top = el.getBoundingClientRect().top
    if (el.getBoundingClientRect().bottom - top <= max) return el.getBoundingClientRect().bottom
    let cut = top
    for (const row of el.querySelectorAll('.vg-row')) {
      const b = Math.max(...[...row.children].map((c) => c.getBoundingClientRect().bottom))
      if (b - top <= max) cut = b
    }
    return cut
  }, MAX_HEIGHT)
  let clip = { x: box.x, y: box.y, width: box.width, height: bottom - box.y }
  const popover = page.locator(':popover-open').first()
  if (openers[name] && (await popover.count())) {
    const p = await popover.boundingBox()
    clip = { ...clip, height: Math.max(clip.y + clip.height, p.y + p.height + 8) - clip.y }
  }
  const file = join(outDir, `${name}.png`)
  await page.screenshot({ path: file, clip, animations: 'disabled' })
  if (hasPngquant)
    spawnSync('pngquant', [
      '--quality=80-95',
      '--speed',
      '1',
      '--strip',
      '--force',
      '--output',
      file,
      file,
    ])
  console.log(name)
}
await browser.close()
if (!hasPngquant) console.log('(pngquant not found: screenshots left uncompressed)')
