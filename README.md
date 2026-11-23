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
- **Small by default, everything optional.** ESM, one file per module, zero runtime dependencies.
  Sorting, filtering, server data, pagination, selection, sub-grids, menus, column reordering,
  resizing, pinning, visibility and grouping, virtual scrolling and keyboard navigation are opt-in **features**, and
  renderers are opt-in too. A plain grid with text cells is **12.6 kB gzipped**, and each feature or renderer you add costs
  only itself.
- **Fast where it counts.** Virtual scrolling renders a screenful out of tens of thousands of rows,
  expanded sub-grids and detail rows included. Data changes re-render only the cells that changed,
  and the change highlight animates on the GPU. Filtering, sorting and value lists are built for
  big data. See [Performance](#performance).
- **Typed end to end.** `<VGrid generic="T">`, typed column helpers, and renderer options checked
  against the renderer you pick.
- **Accessible.** With `keyboardNavigationFeature`: `grid` / `treegrid` semantics and full keyboard
  navigation (cells, headers, menus, column reordering). Without it: an ARIA `table` whose controls
  sit in the normal Tab order. Either way: `aria-sort`, focus management, screen-reader labels.
- **Yours to style.** Everything sits in `@layer vue-grid` and reads `--vg-*` tokens, so your CSS and
  Tailwind utilities win without `!important`. Or skip the default theme: `base.css` is the grid's
  structure alone, ready for your own styles.
- **Safe with untrusted data.** No `v-html` or `innerHTML` anywhere. Links only allow http(s),
  mailto and tel, and URLs are checked the way browsers parse them, so `java\tscript:` tricks don't
  get through. Value maps ignore inherited keys such as `constructor`, and saved state from
  `localStorage` is validated before use.

## Features

| Area | What you get |
|---|---|
| **Data** | Plain row objects · partial updates that re-render only changed cells, with an optional change highlight · client or server (controlled) sorting · selection (multi, single, cascading) · built-in or standalone pagination · 10,000+ rows with virtual scrolling, sub-grids and detail rows included |
| **Filtering** | Typed column filters in header popovers (text, number, date, yes / no, value list with counts, your own component) · optional filter row with shorthand (`>10`, `5..20`, `-5..-1`, `100..`, `1,5`) · quick search · case- and accent-insensitive · date-only values are calendar days in every time zone · tree-aware · persisted to `localStorage` |
| **Server data** | A `dataSource(query, { signal })` function: the grid sends sort, filters and page, cancels superseded requests, and shows loading, error and retry states · or a single `query-change` event if you fetch yourself · backend-loaded value lists |
| **Columns** | Pin left / right (also at runtime) · drag or keyboard reordering · drag-to-resize with fit-to-content · grouped headers · show / hide picker · any CSS grid track as width · layout persisted to `localStorage` or your own storage |
| **Rows** | Nested sub-grids (sync or lazy-loaded, with retry; `reloadSubRows()`) · detail rows with any content, including another grid · cascading selection that follows lazily loaded children · row highlighting and classes |
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

Use it with a bundler (Vite, webpack, Rollup, esbuild): like Vue's `esm-bundler` build, it relies
on the bundler replacing `process.env.NODE_ENV`, which also strips its dev warnings from production
builds. See the [API reference](packages/vue-grid/README.md#install) for use without a build step.

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
  columnPinningFeature,
  sortingFeature,
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
    :features="[sortingFeature, columnPinningFeature]"
    sort-mode="client"
    style="height: 420px"
  />
</template>
```

Features are opt-in: list them per grid with `:features`, or once for the whole app with
`app.use(createVueGrid({ features: [sortingFeature, filteringFeature] }))` (`allFeatures` for
all of them). Without `sortingFeature`, `sortable` columns stay plain headers; without `columnPinningFeature`, `pinned` is ignored.

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

## Performance

The numbers below were measured in real browsers (Chromium and Firefox, driven by Playwright).
Ideas that measured no better were left out. `content-visibility`, for example, made scrolling
about 9× slower here and shifted column widths.

**Rendering only what's in view**

- Virtual scrolling (`virtualScrollingFeature`) renders the rows in view plus `overscan`, at every
  level of the tree. Off-screen siblings become spacers. Children stay inside their parent's CSS
  `subgrid`, so the DOM keeps the same structure as without virtual scrolling. *Expand all* on a
  14,000-row tree keeps about 24 rows in the DOM.
- Layout is one pass over the visible tree, run only when rows, expansion or measured heights
  change. Scrolling does a binary search per level, never a walk over all rows. On a 5,000-row
  expanded lazy tree, a fast fling causes no long tasks (over 50 ms).
- Detail rows of any height are measured as they render. The grid holds the first row in view in
  place while heights settle or children load above it, the same in every browser.
- Lazy children (`load-sub-rows`) are requested only for expanded rows in view, once a scroll
  settles. Flinging past 5,000 expanded rows sends about 40 requests instead of about 850.

**Updating only what changed**

- Partial updates re-render only the cells whose value changed. Use field assignments on reactive
  rows, or `patchRows` on immutable ones; unchanged rows keep their identity.
- The change highlight (`flash`) is an `opacity` fade on a layer under the text, which browsers run
  on the compositor (GPU). With 119 cells flashing for about 4 s, main-thread time dropped from about
  590 ms to about 90 ms.

**Filtering and sorting large data**

- Filters run as one pass over the row tree that produces the set of visible keys. Each level then
  filters in O(1) per row.
- Date filter on 10,000 rows: about 1.1 s → 12 ms (one cached formatter per time zone). Text filter
  and search on 100,000 rows: 66 ms → 16 ms (ASCII fast path, query folded once per filter).
  Value-list membership is a `Set` lookup.
- Value-list counts are memoised per column, so ticking values doesn't recount every row. Lists of
  thousands of values render their first 300.
- Sorting evaluates each row's sort value once (decorate–sort–undecorate) with one shared collator.
  `Intl` number and date formatters are cached and reused.

**Letting CSS do the work**

- Column alignment (`subgrid`), sticky headers and pins, menu placement (anchor positioning) and pin
  shadows (scroll-state container queries) are layout, not per-frame JavaScript. Where a browser
  lacks anchor positioning or scroll-state queries, a small fallback updates at most once per frame.
- Motion uses `transform` and `opacity`. Row highlights (hover, selection) appear at once and only
  fade out, so the grid responds the moment the pointer arrives.

**Shipping less**

- Every feature and renderer is opt-in and tree-shakeable. The filter popover, filter-row editors
  and pager load on demand.
- The published CSS is minified with Lightning CSS without transpiling, so modern CSS ships as
  written.

## Bundle size

Measured by bundling small apps against the published build for production with esbuild
(minified / gzip, Vue excluded):

| You import | Initial chunk |
|---|---|
| `VGrid` (no features) | 35.2 kB / 12.6 kB |
| `VGrid` + `sortingFeature` | 35.9 kB / 12.9 kB |
| `VGrid` + `filteringFeature` | 38.8 kB / 13.9 kB |
| `VGrid` + `selectionFeature` | 37.5 kB / 13.4 kB |
| `VGrid` + `subGridsFeature` | 37.4 kB / 13.4 kB |
| `VGrid` + `menusFeature` | 43.9 kB / 15.7 kB |
| `VGrid` + `columnReorderFeature` | 37.1 kB / 13.3 kB |
| `VGrid` + `columnPinningFeature` | 37.4 kB / 13.5 kB |
| `VGrid` + `virtualScrollingFeature` | 39.9 kB / 14.6 kB |
| `VGrid` + `columnVisibilityFeature` | 35.3 kB / 12.6 kB |
| `VGrid` + `keyboardNavigationFeature` | 37.5 kB / 13.4 kB |
| `VGrid` + `columnResizingFeature` | 38.1 kB / 13.7 kB |
| `VGrid` + `columnGroupsFeature` | 36.7 kB / 13.1 kB |
| `VGrid` + `allFeatures` + `VGridSearch` | 69.3 kB / 24.6 kB |
| `VGrid` + `currencyRenderer` | 36.4 kB / 12.9 kB |
| everything | 112.4 kB / 36.7 kB |

With `filteringFeature`, the filter popover body and the filter-row editors load on demand. With
`paginationFeature`, the pager does too.

CSS (minified with Lightning CSS): `style.css` has everything (6.2 kB gzip). The default theme is optional too: `base.css`
(2.0 kB) is the structure alone, `theme.css` (3.1 kB) the look on top of it, and `renderers.css`
(2.2 kB) the cell renderers. Import only `base.css` to theme the grid from scratch.

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
