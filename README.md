# eboye-vue-grid

Monorepo for **[@eboye/vue-grid](packages/vue-grid)**: a CSS-Grid based data grid for Vue 3 with
real `subgrid` sub-rows, pinned columns, column reorder/visibility with persistence, selection,
virtual scrolling, pagination, a pluggable cell-renderer registry and CSS-variable theming.

| Path | |
|---|---|
| [`packages/vue-grid`](packages/vue-grid) | The library (`@eboye/vue-grid`). Full docs in its README. |
| [`packages/cell-renderer-template`](packages/cell-renderer-template) | Boilerplate 3rd-party renderer addon (`rating`). |
| `playground/` | Demo app for every feature; target of the browser tests. |
| `e2e/` | Playwright tests (Chromium + Firefox) driving the playground with real mouse/keyboard. |
| `docs/superpowers/` | Design spec and implementation plan. |

## Develop

```sh
npm install
npm run dev          # playground on http://localhost:5180 (uses package sources, hot reload)
npm test             # unit tests (Vitest)
npm run typecheck
npm run lint
npm run build        # builds both packages to dist/
npm run e2e          # browser tests; first time: npx playwright install chromium firefox
```

## Publish

```sh
npm run build
npm publish -w @eboye/vue-grid --access public
npm publish -w @eboye/vue-grid-renderer-template --access public
```
