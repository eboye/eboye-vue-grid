<div align="center">

# @eboye/vue-grid

**A fast, accessible data grid for Vue 3 — built on CSS Grid, themed with CSS variables, tree-shakeable.**

![Vue 3.5+](https://img.shields.io/badge/Vue-3.5%2B-42b883?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-success)
![ESM, tree-shakeable](https://img.shields.io/badge/ESM-tree--shakeable-blueviolet)
![Tested in Chromium and Firefox](https://img.shields.io/badge/tested-Chromium%20%C2%B7%20Firefox-orange)
![License: MIT](https://img.shields.io/badge/license-MIT-blue)

<img src="docs/media/showcase.gif" alt="vue-grid showcase: sorting, context menus, pinned columns, nested sub-grids, 10,000-row virtual scrolling, cell renderers, theming and dark mode" width="800">

[▶ Watch the full-quality video (MP4, 43 s)](docs/media/showcase.mp4) ·
[Examples cookbook](docs/examples.md) ·
[API reference](packages/vue-grid/README.md) ·
[Storybook](#documentation)

</div>

---

## Why vue-grid

- **Native layout, not a table emulation.** Rows are CSS Grid; nested rows use real `subgrid`, so
  children line up with their parent's columns at any depth — no width syncing in JavaScript.
- **CSS first.** Sticky pinned columns, pin shadows, popover menus anchored with CSS anchor
  positioning, `light-dark()` theming, native `<details>` disclosures. JavaScript only fills in
  where a browser lacks a feature — see [Browser support](#browser-support).
- **Small by default.** ESM, one file per module, zero runtime dependencies. Renderers are opt-in:
  a grid with plain text cells is **14.5 kB gzipped**, and every renderer you add costs only itself.
- **Typed end to end.** `<VGrid generic="T">`, typed column helpers, and renderer options checked
  against the renderer you pick.
- **Accessible.** `grid` / `treegrid` semantics, `aria-sort`, full keyboard navigation (cells,
  headers, menus, column reordering), focus management, screen-reader labels.
- **Yours to style.** Everything sits in `@layer vue-grid` and reads `--vg-*` tokens, so your CSS and
  Tailwind utilities win without `!important`.

## Features

| Area | What you get |
|---|---|
| **Data** | Plain row objects · partial updates that re-render only changed cells, with an optional change highlight · client or server (controlled) sorting · selection (multi, single, cascading) · pagination component · 10,000+ rows with virtual scrolling |
| **Columns** | Pin left / right (also at runtime) · drag or keyboard reordering · show / hide picker · any CSS grid track as width · layout persisted to `localStorage` or your own storage |
| **Rows** | Nested sub-grids (sync or lazy-loaded, with retry) · detail rows with any content, including another grid · row highlighting and classes |
| **Menus** | Right-click menus for cells and headers (sort, pin, move, hide, reset, your own items) · `⋯` actions menu · keyboard: ContextMenu / Shift+F10, arrows, typeahead |
| **Cells** | 29 renderers (below) · slots for any cell or header · your own renderers as typed add-ons |
| **Theming** | CSS variables for colours, spacing, radii, typography · dark mode · three densities · `ui` prop for utility classes |

### 29 cell renderers

`text` · `number` · `signed-number` · `currency` · `change` · `date` · `datetime` · `boolean` ·
`status` · `chip` · `icon` · `image` · `link` (incl. router links) · `multi-line` · `list` · `code` ·
`json` · `json-tree` · `details` (badge + popover) · `copy` · `toggle-text` · `edit` ·
`action-button` · `button-group` · `actions-menu` · `icon-toggle` · `checkbox` · `switch` · `radio`

Editable controls are *controlled*: they show your data and emit the requested change, your app
updates the rows. Writing your own renderer takes a component and a three-line definition — see the
[add-on template](packages/cell-renderer-template).

## Quick start

```sh
npm i @eboye/vue-grid
```

```ts
// main.ts
import { createApp } from 'vue'
import '@eboye/vue-grid/style.css'
import App from './App.vue'

createApp(App).mount('#app')
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  VGrid,
  createColumnHelper,
  currencyRenderer,
  statusRenderer,
  type SortState,
} from '@eboye/vue-grid'

interface Order { id: number; customer: string; total: number; status: 'Paid' | 'Open' }

const rows = ref<Order[]>([
  { id: 1, customer: 'Ana', total: 1234.5, status: 'Paid' },
  { id: 2, customer: 'Marko', total: 99, status: 'Open' },
])
const sort = ref<SortState | null>(null)

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content', pinned: 'left' }),
  col({ key: 'customer', header: 'Customer', width: '1fr', sortable: true }),
  col({
    key: 'total',
    header: 'Total',
    renderer: currencyRenderer, // renderers are opt-in: import only what you use
    rendererOptions: { currency: 'EUR' }, // typed against the renderer
    sortable: true,
  }),
  col({
    key: 'status',
    header: 'Status',
    renderer: statusRenderer,
    rendererOptions: { tone: { Paid: 'success', Open: 'info' } },
  }),
]
</script>

<template>
  <VGrid
    v-model:sort="sort"
    :rows="rows"
    :columns="columns"
    row-key="id"
    sort-mode="client"
    style="height: 420px"
  />
</template>
```

## Theming

```css
.brand-grid {
  --vg-color-accent: #db2777;
  --vg-color-header-bg: light-dark(#fdf2f8, #3b0a24);
  --vg-radius: 1rem;
  --vg-cell-padding-x: 1.25rem;
}
```

Set `color-scheme: light dark` on `html` to follow the OS, or `dark` to force it. Every token is
listed in the [API reference](packages/vue-grid/README.md#theming).

## Bundle size

Measured by bundling small apps against the published build (minified / gzip, Vue excluded):

| You import | Bundled |
|---|---|
| `VGrid` | 41.2 kB / 14.5 kB |
| `VGrid` + `currencyRenderer` | 42.6 kB / 15.0 kB |
| `VGrid` + `VGridPagination` + `VGridColumnMenu` | 46.3 kB / 16.1 kB |
| everything | 81.4 kB / 25.4 kB |

CSS: `style.css` has everything (7.3 kB gzip); `core.css` + optional `renderers.css` let you trim it.

## Browser support

Current Chrome / Edge and Firefox — both covered by the automated browser tests — and Safari
(same baseline, not yet in the automated tests). The baseline is CSS `subgrid`, `@layer`,
`light-dark()` and the Popover API.
Newer CSS — anchor positioning, `position-visibility`, scroll-state container queries,
`contrast-color()` — is used where available, with small JavaScript fallbacks elsewhere. The full
matrix is in the [API reference](packages/vue-grid/README.md#browser-support).

## Documentation

| Resource | What it covers |
|---|---|
| [Examples cookbook](docs/examples.md) | Task-by-task guide with copy-paste snippets for every feature |
| [API reference](packages/vue-grid/README.md) | Props, events, slots, column options, every renderer option, CSS tokens |
| **Storybook** — `npm run storybook` | A story per feature and per renderer, live controls, generated prop tables, dark mode |
| **Playground** — `npm run dev` | Every feature on one page |
| [Add-on template](packages/cell-renderer-template) | A publishable third-party renderer (star rating) to copy |

## Development

```sh
npm install
npm run dev              # playground → http://localhost:5180
npm run storybook        # Storybook  → http://localhost:6006
npm test                 # unit tests (Vitest)
npm run typecheck && npm run lint
npm run build            # both packages → dist/
npm run e2e              # browser tests, Chromium + Firefox (first time: npx playwright install chromium firefox)
npm run e2e:storybook    # every story renders without errors; interactive renderers with real input
npm run showcase         # re-record docs/media/showcase.* (needs dev + Storybook running, and ffmpeg)
```

<details>
<summary>Repository layout</summary>

| Path | |
|---|---|
| [`packages/vue-grid`](packages/vue-grid) | The library, `@eboye/vue-grid` |
| [`packages/cell-renderer-template`](packages/cell-renderer-template) | Boilerplate third-party renderer add-on |
| `stories/`, `.storybook/` | Storybook |
| `playground/` | Demo app; target of the browser tests |
| `e2e/` | Playwright tests driving the playground and Storybook with real mouse and keyboard |
| `docs/` | Examples cookbook, showcase media, design notes |
| `scripts/` | Showcase recorder |

</details>

### Publishing

```sh
npm run build
npm publish -w @eboye/vue-grid --access public
npm publish -w @eboye/vue-grid-renderer-template --access public
```

## License

MIT
