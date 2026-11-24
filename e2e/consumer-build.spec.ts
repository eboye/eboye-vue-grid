import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { build } from 'vite'

/**
 * The published CSS in an app's production build, with Vite's default settings. Vite 8 minifies
 * CSS with Lightning CSS, which rewrites `light-dark()` for its default browser targets into
 * `var(--lightningcss-light, A) var(--lightningcss-dark, B)` and defines those variables only where
 * the app's CSS declares `color-scheme`. The grid's colours must still be valid, light by default,
 * and follow a `color-scheme` the app declares. Uses the built package: `npm run build` first.
 */
const root = fileURLToPath(new URL('./fixtures/consumer-build/', import.meta.url))
let outDir = ''
let server: Server | undefined
let origin = ''

const LIGHT_TEXT = 'rgb(31, 41, 55)' // --vg-color-text, light: #1f2937
const DARK_TEXT = 'rgb(229, 231, 235)' // --vg-color-text, dark: #e5e7eb

test.beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'vg-consumer-build-'))
  await build({
    root,
    logLevel: 'warn',
    configFile: false,
    build: {
      outDir,
      rollupOptions: {
        input: {
          none: join(root, 'none.html'),
          dark: join(root, 'dark.html'),
          auto: join(root, 'auto.html'),
        },
      },
    },
  })
  // Served over http: the built pages load their CSS with `crossorigin`, which file:// refuses.
  const types: Record<string, string> = { '.html': 'text/html', '.css': 'text/css' }
  server = createServer(async (req, res) => {
    const file = join(outDir, normalize(new URL(req.url ?? '/', 'http://x').pathname))
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
test.afterAll(async () => {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)))
  if (outDir) await rm(outDir, { recursive: true, force: true })
})

const open = async (page: Page, name: string) => {
  await page.goto(`${origin}/${name}.html`)
  return page.locator('#grid')
}

test('no color-scheme anywhere: the grid has its light colours', async ({ page }) => {
  const grid = await open(page, 'none')
  await expect(grid).toHaveCSS('color', LIGHT_TEXT)
  await expect(page.locator('#header')).toHaveCSS('background-color', 'rgb(248, 250, 252)')
})

test('no color-scheme, OS in dark mode: still light, like native light-dark()', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(await open(page, 'none')).toHaveCSS('color', LIGHT_TEXT)
})

test('color-scheme: dark in the app CSS: the grid is dark', async ({ page }) => {
  await expect(await open(page, 'dark')).toHaveCSS('color', DARK_TEXT)
})

test('color-scheme: light dark follows the OS', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(await open(page, 'auto')).toHaveCSS('color', LIGHT_TEXT)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('#grid')).toHaveCSS('color', DARK_TEXT)
})

// Documented limit (README → Theming): the rewritten CSS only follows color-scheme rules that were
// in the stylesheet at build time. An inline style set from JavaScript leaves the grid light.
test('color-scheme set inline from JavaScript: valid colours, but light', async ({ page }) => {
  const grid = await open(page, 'none')
  await page.evaluate(() => (document.documentElement.style.colorScheme = 'dark'))
  await expect(grid).toHaveCSS('color', LIGHT_TEXT)
})
