// Records the README showcase video: the playground and Storybook driven with a real mouse and
// keyboard, with an injected visible cursor and scene captions.
//
//   npm run dev & npm run storybook      (playground on :5180, Storybook on :6006)
//   npm run showcase                     → docs/media/showcase.{mp4,gif} + showcase-poster.png (needs ffmpeg)
import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const outDir = process.argv[2] ?? fileURLToPath(new URL('../docs/media', import.meta.url))
rmSync(join(outDir, 'raw'), { recursive: true, force: true })
mkdirSync(join(outDir, 'raw'), { recursive: true })
const size = { width: 1280, height: 720 }
const PG = 'http://localhost:5180/'
const SB = 'http://localhost:6006/iframe.html?viewMode=story&id='

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: size,
  deviceScaleFactor: 1,
  recordVideo: { dir: join(outDir, 'raw'), size },
})

// Visible cursor + click ripple + caption bar, re-installed on every navigation.
await context.addInitScript(() => {
  const install = () => {
    if (document.getElementById('sc-cursor')) return
    const style = document.createElement('style')
    style.textContent = `
      #sc-cursor{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-3px,-2px);transition:transform .05s}
      #sc-cursor svg{filter:drop-shadow(0 1px 2px rgb(0 0 0/.45))}
      .sc-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #2563eb;z-index:2147483646;pointer-events:none;animation:sc-r .45s ease-out forwards}
      @keyframes sc-r{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.4)}}
      #sc-caption{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;
        font:600 20px/1.3 system-ui,sans-serif;color:#fff;background:rgb(15 23 42/.88);padding:10px 20px;border-radius:12px;
        box-shadow:0 10px 30px -10px rgb(0 0 0/.5);opacity:0;transition:opacity .3s;white-space:nowrap}
      #sc-caption.on{opacity:1}
      #sc-caption small{display:block;font-weight:400;font-size:14px;opacity:.8}
      #sc-title{position:fixed;inset:0;z-index:2147483644;display:grid;place-items:center;text-align:center;
        background:radial-gradient(circle at 30% 20%,#1e3a8a,#0b1020 70%);color:#fff;font-family:system-ui,sans-serif;transition:opacity .5s}
      #sc-title h1{font-size:56px;margin:0 0 12px;letter-spacing:-.02em} #sc-title p{font-size:22px;margin:0;opacity:.85}
      #sc-title code{font-size:20px;background:rgb(255 255 255/.12);padding:4px 10px;border-radius:8px;display:inline-block;margin-top:22px}`
    document.documentElement.append(style)
    const cursor = document.createElement('div')
    cursor.id = 'sc-cursor'
    const svgNs = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(svgNs, 'svg')
    for (const [k, v] of Object.entries({ width: 22, height: 22, viewBox: '0 0 24 24' }))
      svg.setAttribute(k, String(v))
    const arrow = document.createElementNS(svgNs, 'path')
    const attrs = {
      d: 'M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.6-6.8L4 19z',
      fill: '#fff',
      stroke: '#111',
      'stroke-width': 1.4,
      'stroke-linejoin': 'round',
    }
    for (const [k, v] of Object.entries(attrs)) arrow.setAttribute(k, String(v))
    svg.append(arrow)
    cursor.append(svg)
    document.documentElement.append(cursor)
    const cap = document.createElement('div')
    cap.id = 'sc-caption'
    document.documentElement.append(cap)
    addEventListener(
      'mousemove',
      (e) => (cursor.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 2}px)`),
      true,
    )
    addEventListener(
      'mousedown',
      (e) => {
        const r = document.createElement('div')
        r.className = 'sc-ripple'
        r.style.left = `${e.clientX}px`
        r.style.top = `${e.clientY}px`
        document.documentElement.append(r)
        setTimeout(() => r.remove(), 500)
      },
      true,
    )
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', install)
  else install()
})

const page = await context.newPage()
const wait = (ms) => page.waitForTimeout(ms)
let mouse = { x: 640, y: 360 }
async function moveTo(target, dx = 0.5, dy = 0.5) {
  const b = await target.boundingBox()
  const x = b.x + b.width * dx
  const y = b.y + b.height * dy
  const dist = Math.hypot(x - mouse.x, y - mouse.y)
  await page.mouse.move(x, y, { steps: Math.max(8, Math.round(dist / 18)) })
  mouse = { x, y }
}
async function click(target, opts = {}) {
  await moveTo(target, opts.dx, opts.dy)
  await wait(120)
  await page.mouse.click(mouse.x, mouse.y, { button: opts.button ?? 'left' })
}
async function caption(title, sub = '') {
  await page.evaluate(
    ([t, s]) => {
      // The init script normally creates it; recreate it if a re-render removed it.
      let c = document.getElementById('sc-caption')
      if (!c) {
        c = Object.assign(document.createElement('div'), { id: 'sc-caption' })
        document.documentElement.append(c)
      }
      c.replaceChildren()
      c.append(t)
      if (s) {
        const small = document.createElement('small')
        small.textContent = s
        c.append(small)
      }
      c.classList.add('on')
    },
    [title, sub],
  )
}
const hideCaption = () =>
  page.evaluate(() => document.getElementById('sc-caption').classList.remove('on'))
async function show(selector, block = 'start', offset = 70) {
  await page.evaluate(
    ([sel, b, o]) => {
      const el = document.querySelector(sel)
      const top =
        el.getBoundingClientRect().top +
        scrollY -
        (b === 'start' ? o : (innerHeight - el.getBoundingClientRect().height) / 2)
      scrollTo({ top, behavior: 'smooth' })
    },
    [selector, block, offset],
  )
  await wait(900)
}
const demo = (name) => page.locator(`[data-demo="${name}"]`)

/** Full-screen title / end card (runs in the page). */
function titleCard({ tagline, fadeIn }) {
  const el = (tag, text) =>
    Object.assign(document.createElement(tag), text ? { textContent: text } : {})
  const card = el('div')
  card.id = 'sc-title'
  const inner = el('div')
  inner.append(el('h1', '@nocopypaste/vue-grid'), el('p', tagline), el('code', 'npm i @nocopypaste/vue-grid'))
  card.append(inner)
  if (fadeIn) card.style.opacity = '0'
  document.documentElement.append(card)
  if (fadeIn) requestAnimationFrame(() => (card.style.opacity = '1'))
}
/** Storybook iframe: centre the story in the frame and fit wide grids. */
async function sbStory(id, extra = '') {
  await page.goto(`${SB}${id}${extra}`, { waitUntil: 'networkidle' })
  await page.locator('[role="grid"]').waitFor()
  // Let Storybook finish its own render passes before reframing, so the layout doesn't jump mid-scene.
  await page.evaluate(() => document.fonts.ready)
  await wait(500)
  await page.addStyleTag({
    content: `#storybook-root{min-height:100vh;display:grid;align-content:center;padding:0 24px 90px!important;box-sizing:border-box;zoom:.94}`,
  })
  await wait(300)
}

// ── 0. Title card ──────────────────────────────────────────────────────────────────────────
await page.goto(PG)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.evaluate(titleCard, {
  tagline: 'A data grid for Vue 3, built on CSS Grid',
  fadeIn: false,
})
await wait(2600)
await page.evaluate(() => {
  const t = document.getElementById('sc-title')
  t.style.opacity = '0'
  setTimeout(() => t.remove(), 600)
})
await wait(600)

// ── 1. Sorting + renderers + context menus ─────────────────────────────────────────────────
await show('[data-demo="basic"]')
await caption(
  'Typed cell renderers & client-side sorting',
  'currency · status · change · dates · links · JSON · menus',
)
const stakeHeader = demo('basic').locator('[role="columnheader"][data-col-key="stake"] .vg-sort')
await click(stakeHeader)
await wait(700)
await click(stakeHeader)
await wait(900)
await caption(
  'Right-click menus',
  'Popover API + CSS anchor positioning — never clipped, flips at screen edges',
)
await click(demo('basic').locator('[data-row-key="3"] > [data-col-key="city"]'), {
  button: 'right',
  dx: 0.3,
})
await wait(500)
const ctxMenu = page.locator('[role="menu"]:popover-open')
await moveTo(ctxMenu.getByRole('menuitem').nth(1))
await wait(400)
await moveTo(ctxMenu.getByRole('menuitem').nth(3))
await wait(700)
await page.keyboard.press('Escape')
await click(demo('basic').locator('[role="columnheader"][data-col-key="status"]'), {
  button: 'right',
  dx: 0.3,
})
await wait(500)
await moveTo(ctxMenu.getByRole('menuitem', { name: 'Sort descending' }))
await wait(300)
await moveTo(ctxMenu.getByRole('menuitem', { name: 'Pin left' }))
await wait(800)
await page.keyboard.press('Escape')
await hideCaption()

// ── 2. Pinned columns ─────────────────────────────────────────────────────────────────────
await show('[data-demo="pinned"]')
await caption('Pinned columns', 'sticky in CSS · shadow only while content scrolls underneath')
const pinnedGrid = demo('pinned').locator('.vg')
await moveTo(pinnedGrid, 0.55, 0.45)
for (let i = 0; i < 14; i++) {
  await page.mouse.wheel(45, 0)
  await wait(45)
}
await wait(700)
await caption(
  'Pin, move & hide columns at runtime',
  'header menu · drag headers · saved to localStorage',
)
await click(demo('pinned').locator('[role="columnheader"][data-col-key="stake"]'), {
  button: 'right',
  dx: 0.3,
})
await wait(500)
await click(ctxMenu.getByRole('menuitem', { name: 'Pin left' }))
await wait(900)
for (let i = 0; i < 14; i++) {
  await page.mouse.wheel(-45, 0)
  await wait(40)
}
await wait(600)
await hideCaption()

// ── 3. Sub-grids ──────────────────────────────────────────────────────────────────────────
await show('[data-demo="subgrid"]')
await caption(
  'Nested rows with CSS subgrid',
  'children share the parent columns at any depth · cascading selection',
)
await click(demo('subgrid').locator('[data-row-key="fb"] .vg-expander'))
await wait(600)
await click(demo('subgrid').locator('[data-row-key="fb-1x2"] .vg-expander'))
await wait(700)
await click(demo('subgrid').locator('[data-row-key="fb-1x2"] .vg-checkbox input'))
await wait(1000)
await click(demo('subgrid').locator('[data-row-key="bb"] .vg-expander'))
await wait(900)
await hideCaption()

// ── 4. Virtual scrolling ──────────────────────────────────────────────────────────────────
await show('[data-demo="virtual"]')
await caption('10,000 rows, virtual scrolling', 'only the visible window is rendered')
await moveTo(demo('virtual').locator('.vg'), 0.5, 0.55)
for (let i = 0; i < 26; i++) {
  await page.mouse.wheel(0, 260)
  await wait(55)
}
await wait(500)
await click(demo('virtual').getByTestId('jump'))
await wait(1200)
await hideCaption()

// ── 5. Renderer recipes (Storybook) ───────────────────────────────────────────────────────
await sbStory('recipes-back-office-grid--bet-monitor')
await caption(
  '29 cell renderers — and your own',
  'multi-line · copy · chips · switches · favourites · details popovers',
)
await click(page.locator('[data-row-key="2"] > [data-col-key="web"]').getByRole('switch'))
await wait(600)
await click(page.locator('[data-row-key="3"] > [data-col-key="favourite"]').getByRole('button'))
await wait(600)
await click(page.locator('[data-row-key="2"] > [data-col-key="terminal"]').getByRole('button'))
await wait(1600)
await page.keyboard.press('Escape')
await wait(300)
await click(page.locator('[data-row-key="1"] > [data-col-key="reference"]').getByRole('button'))
await wait(900)
await hideCaption()

// ── 6. Theming ────────────────────────────────────────────────────────────────────────────
await sbStory('theming--brand')
await caption(
  'Themed with CSS variables',
  'a few --vg-* tokens · @layer, so Tailwind and your CSS always win',
)
await wait(1800)
await sbStory('recipes-back-office-grid--bet-monitor', '&globals=scheme:dark')
await caption('Dark mode built in', 'light-dark() colours follow the OS or your switch')
await wait(2200)
await hideCaption()
await wait(300)

// ── 7. End card ───────────────────────────────────────────────────────────────────────────
await page.evaluate(titleCard, {
  tagline: 'Sub-grids · pinning · virtual scrolling · menus · 29 renderers · tree-shakeable',
  fadeIn: true,
})
await wait(2600)

await page.close()
await context.close()
await browser.close()
const [file] = readdirSync(join(outDir, 'raw')).filter((f) => f.endsWith('.webm'))
const webm = join(outDir, 'raw', 'showcase.webm')
renameSync(join(outDir, 'raw', file), webm)

// Encode: MP4 (full quality), GIF (plays inline in any README), poster frame.
const ffmpeg = (...args) =>
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' })
ffmpeg(
  '-i',
  webm,
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '24',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  '-an',
  join(outDir, 'showcase.mp4'),
)
ffmpeg(
  '-i',
  webm,
  '-vf',
  'fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle',
  join(outDir, 'showcase.gif'),
)
ffmpeg('-ss', '31', '-i', webm, '-frames:v', '1', join(outDir, 'showcase-poster.png'))
rmSync(join(outDir, 'raw'), { recursive: true, force: true })
console.log(
  'wrote',
  ['showcase.mp4', 'showcase.gif', 'showcase-poster.png'].map((f) => join(outDir, f)).join(', '),
)
