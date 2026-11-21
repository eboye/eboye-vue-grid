# @eboye/vue-grid-renderer-template

Boilerplate for a **3rd-party cell renderer** for [`@eboye/vue-grid`](../vue-grid): a star `rating`
renderer. Copy this package, rename it, and replace `RatingCell.vue`.

## Use it

```ts
import { createVueGrid } from '@eboye/vue-grid'
import { ratingRenderer } from '@eboye/vue-grid-renderer-template'
import '@eboye/vue-grid/style.css'
import '@eboye/vue-grid-renderer-template/style.css'

app.use(createVueGrid({ renderers: [ratingRenderer] }))
```

```ts
const col = createColumnHelper<Product>()
const columns = [col({ key: 'stars', header: 'Rating', renderer: 'rating', rendererOptions: { max: 5 } })]
```

```vue
<VGrid :rows :columns row-key="id" @cell-action="(e) => e.name === 'rate' && save(e.rowKey, e.payload)" />
```

## Anatomy

| File | What it shows |
|---|---|
| `src/RatingCell.vue` | The renderer component: `defineProps<CellRendererProps<Row, Value, Options>>()`, `defineEmits<CellRendererEmits>()`, `useGridContext()` for locale, emitting `action('rate', n)`, accessible markup. |
| `src/types.ts` | The options interface. |
| `src/index.ts` | `defineCellRenderer({ name, component, defaults, align, sortValue, format })` and the **module augmentation** that makes `renderer: 'rating'` and its `rendererOptions` type-checked. |
| `src/rating.css` | Styles in `@layer vue-grid-addons`, built only from grid tokens (`--vg-color-*`, `--vg-radius-sm`, …) plus the addon's own `--vg-rating-*` tokens. |
| `vite.config.ts` | Library build; `vue` and `@eboye/vue-grid` stay external (peer dependencies). |
| `test/rating.spec.ts` | Unit test of the component, and an integration test inside `<VGrid>` — including a `@ts-expect-error` proving the options are typed. |

## Rules of thumb

- Render values as text (`{{ }}`), never `v-html`.
- Don't emit DOM-ish events for grid logic; emit `action(name, payload)` and let the app handle `cell-action`.
- Interactive elements (buttons, links, inputs) inside a cell don't trigger `row-click`.
- Prefer `(value, row) => …` options for per-row behaviour.
- Use grid tokens so your renderer follows the host theme and dark mode.

## Scripts

`npm run build` · `npm test` · `npm run typecheck`
