# @eboye/vue-grid — examples

A task-oriented cookbook. Every snippet is a complete `<script setup>` component you can paste into an
app that has the plugin and stylesheet installed (step 1). For the full prop/event tables see the
[package README](../packages/vue-grid/README.md). To try every example live, with editable props,
run Storybook (`npm run storybook` → http://localhost:6006).

The examples share this row type:

```ts
// types.ts
export interface Order {
  id: number
  customer: { name: string; city: string }
  total: number
  currency: string
  change: number
  status: 'Paid' | 'Open' | 'Refunded'
  placedAt: string // ISO date
  verified: boolean | null
  url: string
  meta: Record<string, unknown>
  children?: Order[]
}
```

---

## Contents

1. [Install and set up](#1-install-and-set-up)
2. [A first grid](#2-a-first-grid)
3. [Columns](#3-columns)
4. [Every built-in renderer](#4-every-built-in-renderer)
5. [Custom cells with slots](#5-custom-cells-with-slots)
6. [Sorting](#6-sorting)
7. [Events: row, cell and renderer actions](#7-events-row-cell-and-renderer-actions)
8. [Selection](#8-selection)
9. [Sub-grids (nested rows)](#9-sub-grids-nested-rows)
10. [Detail rows](#10-detail-rows)
11. [Column state: order, visibility, pinning, persistence](#11-column-state-order-visibility-pinning-persistence)
12. [Context menus](#12-context-menus)
13. [Filtering](#13-filtering)
14. [Server data](#14-server-data)
15. [Pagination (server-style)](#15-pagination-server-style)
16. [Virtual scrolling](#16-virtual-scrolling)
17. [Loading and empty states](#17-loading-and-empty-states)
18. [Programmatic control (template ref)](#18-programmatic-control-template-ref)
19. [Theming](#19-theming)
20. [Writing a cell renderer add-on](#20-writing-a-cell-renderer-add-on)
21. [Using VGridMenu in your own components](#21-using-vgridmenu-in-your-own-components)
22. [Pure helpers](#22-pure-helpers)

---

## 1. Install and set up

```sh
npm i @eboye/vue-grid
```

```ts
// main.ts
import { createApp } from 'vue'
import { createVueGrid } from '@eboye/vue-grid'
import '@eboye/vue-grid/style.css'
import App from './App.vue'

createApp(App)
  .use(
    createVueGrid({
      locale: 'en-GB', // number/date formatting (default: browser locale)
      currency: 'EUR', // default for the currency renderer
      timeZone: 'Europe/Belgrade', // optional, for date renderers
      density: 'cozy', // 'compact' | 'cozy' | 'comfortable'
      renderers: [], // renderers usable by name — see “Choosing renderers” below
      features: [], // sorting, filtering, server data, pagination — see “Choosing features” below
    }),
  )
  .mount('#app')
```

The plugin is optional — `<VGrid>` works without it, using the browser locale and USD.
Every setting can also be given per grid (`:locale`, `:currency`, `:time-zone`, `:density`).

### Choosing renderers (tree-shaking)

Only the `text` renderer is built into `<VGrid>`; the rest are opt-in so your bundle only contains
what you use. Two ways:

```ts
import { createColumnHelper, currencyRenderer, statusRenderer } from '@eboye/vue-grid'

// 1. Per column — smallest bundle, options type-checked against the renderer
const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'total', renderer: currencyRenderer, rendererOptions: { currency: 'EUR' } }),
  col({ key: 'status', renderer: statusRenderer, rendererOptions: { tone: { Paid: 'success' } } }),
]

// 2. By name — register once (app-wide or per grid), then use 'currency', 'status', …
app.use(createVueGrid({ renderers: [currencyRenderer, statusRenderer] }))
// or everything: import { allRenderers } … createVueGrid({ renderers: allRenderers })
```

The examples below use names for brevity — they assume `createVueGrid({ renderers: allRenderers })`
(or swap each `'name'` for its `nameRenderer` import). An unregistered name renders as plain text
and logs a dev warning.

CSS: `@eboye/vue-grid/style.css` contains everything; `core.css` + (optionally) `renderers.css` let
you leave out the renderer styles.

### Choosing features

Out of the box `<VGrid>` is a plain table. Sorting, filtering, server data, pagination,
selection, sub-grids, context menus, column reordering, pinning and visibility, virtual scrolling and keyboard navigation are
opt-in features, and only the ones you import are bundled:

```ts
import { allFeatures, filteringFeature, sortingFeature } from '@eboye/vue-grid'

// per grid
// <VGrid :features="[sortingFeature, filteringFeature]" … />

// or for every grid (merged with each grid's own list)
app.use(createVueGrid({ features: [sortingFeature, filteringFeature] }))
app.use(createVueGrid({ features: allFeatures })) // all of them
```

| Feature | Needed for |
|---|---|
| `sortingFeature` | `sortable` columns, `v-model:sort` header UI, `sort-mode="client"` |
| `filteringFeature` | `filterable` columns, `filter-row`, `<VGridSearch>`, `v-model:filters`, `filter-storage` |
| `serverDataFeature` | `data-source` |
| `paginationFeature` | `pagination`, `v-model:page`, `v-model:page-size` |
| `selectionFeature` | `selectable`, `v-model:selected`, `selection-mode`, `is-row-selectable` |
| `subGridsFeature` | `sub-rows`, `load-sub-rows`, `has-sub-rows` (detail rows work without it) |
| `menusFeature` | the header right-click menu (`header-menu`) and `context-menu` for body cells |
| `columnReorderFeature` | dragging headers, Alt+←/→ on a header, the menu's Move items |
| `columnPinningFeature` | `pinned` columns (sticky, with shadows), the menu's Pin items |
| `virtualScrollingFeature` | `virtual` (render only the rows in view) |
| `columnVisibilityFeature` | `hidden` columns, `columnState.hidden`, the menu's Hide column item |
| `keyboardNavigationFeature` | arrow-key navigation between cells (ARIA grid); without it an ARIA table with tabbable controls |

Without its feature, an option does nothing and a dev warning names the feature to add. A grid
reads `features` once when it is created.

The examples below assume `createVueGrid({ renderers: allRenderers, features: allFeatures })`.

---

## 2. A first grid

```vue
<script setup lang="ts">
import { VGrid, createColumnHelper } from '@eboye/vue-grid'
import type { Order } from './types'

const rows: Order[] = [/* … */]

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'id', header: '#', width: 'min-content' }),
  col({ key: 'customer', header: 'Customer', field: 'customer.name', width: '1fr' }),
  col({ key: 'total', header: 'Total', renderer: 'currency' }),
  col({ key: 'placedAt', header: 'Placed', renderer: 'date' }),
]
</script>

<template>
  <VGrid :rows="rows" :columns="columns" row-key="id" aria-label="Orders" style="height: 420px" />
</template>
```

- `row-key` is required: a property name, or a function `(row) => string | number`. All row state
  (selection, expansion, focus) is keyed by it, so it must be stable and unique.
- Give the grid a height (or a parent with one) if you want the header to stick while the body
  scrolls; otherwise it grows with its rows.
- `createColumnHelper<T>()` is optional. It does nothing at runtime, but it types `field`-less `value`
  functions against `T` and type-checks each column's `rendererOptions` against its `renderer`.

---

## 3. Columns

```ts
const col = createColumnHelper<Order>()

const columns = [
  // value from a property (key doubles as the field)
  col({ key: 'id', header: '#' }),

  // value from a nested path
  col({ key: 'city', header: 'City', field: 'customer.city' }),

  // computed value (wins over field)
  col({ key: 'label', header: 'Label', value: (row) => `${row.customer.name} (${row.id})` }),

  // sizing: any CSS grid track
  col({ key: 'a', width: '8rem' }),
  col({ key: 'b', width: '1fr' }), // share the remaining space
  col({ key: 'c', width: 'minmax(10rem, 2fr)' }),
  col({ key: 'd', width: 'min-content' }), // as narrow as the content
  col({ key: 'e', width: '1fr', minWidth: '12rem' }), // → minmax(12rem, 1fr)

  // alignment (numeric renderers default to 'end')
  col({ key: 'f', align: 'center' }),

  // header tooltip and classes
  col({ key: 'g', header: 'Δ', headerTooltip: 'Change since yesterday', headerClass: 'font-mono' }),

  // per-cell classes, static or from the row
  col({
    key: 'total',
    renderer: 'currency',
    cellClass: (row) => (row.total < 0 ? 'text-red-600' : null),
  }),

  // start hidden (the column menu can show it), start pinned
  col({ key: 'meta', hidden: true }),
  col({ key: 'actions', pinned: 'right' }),

  // lock what users may change
  col({ key: 'id2', hideable: false, reorderable: false, pinnable: false }),
]
```

Column keys must be unique: they name sort state, column state and slots (`#cell-<key>`).

---

## 4. Every built-in renderer

Pick a renderer with `renderer: currencyRenderer` (or a registered name such as `'currency'`, see §1), configure it with `rendererOptions`. Options that accept
functions receive `(value, row)`. Values that are `null`/`undefined` render the `placeholder` (or
nothing).

### Text

```ts
col({ key: 'note', renderer: 'text' }) // the default; may be omitted

col({ key: 'url', rendererOptions: { ellipsis: true } }) // one line + "…", full text in a tooltip
col({ key: 'bio', rendererOptions: { lines: 2 } }) // clamp to 2 lines
col({ key: 'sku', rendererOptions: { maxWidth: '12ch', tooltip: true } })
col({ key: 'note', rendererOptions: { tooltip: (v, row) => `Order ${row.id}: ${v}` } })
col({ key: 'note', rendererOptions: { placeholder: '—' } })
col({ key: 'note', rendererOptions: { tone: (v) => (v === 'urgent' ? 'danger' : undefined) } })
```

### Toggle text

Text that becomes a button and emits a `toggle` action (see §7).

```ts
col({
  key: 'name',
  renderer: 'toggle-text',
  rendererOptions: {
    clickable: (v, row) => row.status !== 'Refunded',
    highlighted: (v, row) => row.verified === true,
    placeholder: '—',
  },
})
```

### Numbers and money

```ts
col({ key: 'qty', renderer: 'number' }) // 1,234
col({
  key: 'margin',
  renderer: 'number',
  rendererOptions: { format: { style: 'percent', minimumFractionDigits: 1 } },
})
col({ key: 'delta', renderer: 'signed-number' }) // +12 / −3

col({ key: 'total', renderer: 'currency' }) // grid/plugin currency
col({ key: 'total', renderer: 'currency', rendererOptions: { currency: 'GBP' } })
col({ key: 'total', renderer: 'currency', rendererOptions: { currency: (v, row) => row.currency } })
col({
  key: 'total',
  renderer: 'currency',
  rendererOptions: { format: { maximumFractionDigits: 0 } },
})

col({ key: 'change', renderer: 'change' }) // arrow + colour from the sign
col({ key: 'change', renderer: 'change', rendererOptions: { currency: true } }) // as money
col({
  key: 'odds',
  renderer: 'change',
  rendererOptions: {
    direction: (v, row) => (row.change > 0 ? 'up' : row.change < 0 ? 'down' : 'equal'),
  },
})
```

Numeric renderers right-align and sort numerically in client sort mode.

### Dates

```ts
col({ key: 'placedAt', renderer: 'date' })
col({ key: 'placedAt', renderer: 'date', rendererOptions: { format: { dateStyle: 'long' } } })
col({ key: 'placedAt', renderer: 'datetime' }) // date and time on two lines
col({
  key: 'placedAt',
  renderer: 'datetime',
  rendererOptions: { twoLines: false, milliseconds: true },
})
```

Accepts ISO strings, timestamps and `Date`s. Invalid dates render the placeholder.

### Boolean, status, icon

```ts
col({ key: 'verified', renderer: 'boolean' }) // Yes / No / (empty)
col({
  key: 'verified',
  renderer: 'boolean',
  rendererOptions: { trueLabel: '✓', falseLabel: '✗', nullLabel: '?' },
})

col({
  key: 'status',
  renderer: 'status',
  rendererOptions: {
    tone: { Paid: 'success', Open: 'info', Refunded: 'warning' }, // value → tone
    // tone: 'neutral'                                            // or one tone for all
    // tone: (v, row) => (row.total > 1000 ? 'accent' : 'neutral') // or a function
    label: (v) => String(v).toUpperCase(),
    dot: false, // hide the leading dot
  },
})
```

Tones: `success`, `danger`, `warning`, `info`, `neutral`, `accent`.

```ts
import { CheckIcon, ClockIcon } from './icons' // any Vue component (e.g. lucide-vue-next)

col({
  key: 'verified',
  renderer: 'icon',
  rendererOptions: { icon: CheckIcon, show: (v) => v === true, label: 'Verified' },
})
col({
  key: 'state',
  renderer: 'icon',
  rendererOptions: {
    iconFor: (v) => (v === 'done' ? CheckIcon : ClockIcon), // per row; wins over `icon`
    label: (v) => String(v), // accessible name
    tone: (v) => (v === 'done' ? 'success' : 'warning'),
  },
})
```

### Links and JSON

```ts
col({ key: 'url', renderer: 'link' }) // http(s) values link to themselves
col({
  key: 'id',
  renderer: 'link',
  rendererOptions: { href: (v) => `/orders/${v}`, label: (v) => `Order #${v}`, target: '_blank' },
})
```

`javascript:`, `data:` and other non-web schemes are dropped. Without an `href` the link renders as a
button that only emits a `click` action.

```ts
col({ key: 'meta', renderer: 'json' }) // "View" button → <dialog> with pretty-printed JSON
col({
  key: 'meta',
  renderer: 'json',
  rendererOptions: { label: 'Show', dialogTitle: (v, row) => `Order ${row.id}` },
})
col({ key: 'meta', renderer: 'json-tree', rendererOptions: { collapseAt: 2 } }) // inline collapsible tree
```

### Actions

```ts
col({
  key: 'actions',
  header: '',
  width: 'min-content',
  renderer: 'actions-menu', // ⋯ button with a popover menu
  rendererOptions: {
    label: 'Order actions',
    actions: (row: Order) => [
      { name: 'edit', label: 'Edit' },
      { name: 'refund', label: 'Refund', disabled: row.status !== 'Paid' },
      { separator: true },
      { name: 'delete', label: 'Delete', tone: 'danger' as const, hint: 'Del' },
    ],
  },
})

col({
  key: 'open',
  value: () => 'Open',
  renderer: 'action-button',
  rendererOptions: {
    label: 'Open',
    action: 'open',
    tone: 'accent',
    disabled: (v, row) => !row.url,
  },
})
```

Both emit through `@cell-action` (§7): the menu emits the chosen item's `name`, the button its
`action` (default `click`).

```ts
// action-button extras: per-row visibility, solid/ghost variants, icon-only buttons
col({
  key: 'resolve',
  value: () => 'Resolve',
  renderer: 'action-button',
  rendererOptions: { variant: 'solid', action: 'resolve', visible: (_v, row) => !row.completed },
})
col({
  key: 'remove',
  renderer: 'action-button',
  rendererOptions: {
    label: 'Delete tag',
    icon: TrashIcon,
    iconOnly: true,
    variant: 'ghost',
    tone: 'danger',
    action: 'delete',
  },
})

// several buttons in one cell; each emits its name
col({
  key: 'review',
  renderer: 'button-group',
  rendererOptions: {
    buttons: (row: Order) => [
      { name: 'approve', label: 'Approve', tone: 'success', variant: 'solid' },
      {
        name: 'reject',
        label: 'Reject',
        tone: 'danger',
        variant: 'solid',
        disabled: row.status === 'Refunded',
      },
      { name: 'details', label: 'Details' },
    ],
  },
})
```

### Text extras: badges, icons, secondary text, copy

```ts
// score with a muted half-time suffix: "2:1 (1:0)"
col({ key: 'score', rendererOptions: { bold: true, secondary: (_v, row) => row.halfTime } })

// leading class letter; `badgePosition: 'end'` puts it after the value
col({
  key: 'player',
  field: 'player.name',
  rendererOptions: {
    badge: (_v, row) => ({
      text: row.riskClass,
      tone: { A: 'success', B: 'warning', C: 'danger' }[row.riskClass],
    }),
  },
})

// alert icon before a value
col({
  key: 'usage',
  align: 'end',
  rendererOptions: {
    icon: (_v, row) =>
      row.limitHit ? { icon: AlertIcon, tone: 'danger', label: 'Limit reached' } : null,
  },
})

// filled tone background, kept line breaks, copy button
col({ key: 'note', rendererOptions: { tone: 'danger', toneMode: 'fill', preserveNewlines: true } })
col({ key: 'ticket', rendererOptions: { copyable: true, ellipsis: true } }) // emits `copy`
```

### Status, boolean, numbers: more options

```ts
col({
  key: 'campaign',
  renderer: 'status',
  rendererOptions: {
    tone: { ACTIVE: 'success', DRAFT: 'warning', CANCELLED: 'danger' },
    label: { ACTIVE: 'Active', DRAFT: 'Draft', CANCELLED: 'Canceled' }, // value → label map
    variant: 'outline', // 'soft' (default) | 'solid' | 'outline'
    placeholder: 'N/A',
    clickable: true, // emits `click`
  },
})
col({
  key: 'verified',
  renderer: 'boolean',
  rendererOptions: { display: 'icon', nullLabel: 'N/A' },
}) // ✓ or nothing
col({ key: 'balance', renderer: 'currency', rendererOptions: { clickable: true } }) // drill-down, emits `click`
col({ key: 'trend', renderer: 'change', rendererOptions: { iconOnly: true } }) // value true/'true' → ▲, false → ▼
```

### Router links

```ts
// <RouterLink> when the app uses vue-router; a string location falls back to an href without one.
// Returning null renders plain text.
col({
  key: 'event',
  renderer: 'link',
  rendererOptions: {
    to: (v, row) => (row.canOpen ? { name: 'event', params: { id: v } } : null),
    label: (_v, row) => row.name,
  },
})
```

### Several lines in one cell

```ts
col({
  key: 'ticket',
  renderer: 'multi-line',
  rendererOptions: {
    lines: (_v, row) => [
      { text: row.ticket, href: `/tickets/${row.id}`, bold: true }, // or `to` for the router
      { text: row.reference, muted: true },
    ],
  },
})
// The value itself can be the array: ['Football', 'Premier League']
// Line options: text, href, to, tone, fill (badge look), bold, muted, tooltip, trend ('up'|'down'), action, badge
```

### Colour chips, images, code

```ts
// API sends { name: 'A', color: '#16a34a', description: 'Low risk' } → tile in that colour, readable text
col({ key: 'riskCategory', renderer: 'chip', align: 'center' })
// or a tone map and a round chip
col({
  key: 'riskClass',
  renderer: 'chip',
  rendererOptions: { tone: { A: 'success', B: 'warning', C: 'danger' }, shape: 'circle' },
})

col({
  key: 'logo',
  renderer: 'image',
  rendererOptions: {
    baseUrl: 'https://cdn.example.com',
    size: '2.5rem',
    alt: (_v, row) => row.name,
  },
})

col({ key: 'payload', renderer: 'code', rendererOptions: { lines: 6 } }) // JSON strings/objects get coloured tokens
```

### Copy and edit buttons

```ts
col({ key: 'serial', renderer: 'copy', rendererOptions: { title: 'Serial number' } }) // emits `copy` / `copy-error`
col({
  key: 'payload',
  renderer: 'copy',
  rendererOptions: { iconOnly: true, copyValue: (v) => JSON.stringify(v, null, 2) },
})

col({
  key: 'margin',
  renderer: 'edit',
  rendererOptions: { format: (v) => `${v} %`, placeholder: 'Not set' },
})
// @cell-action: name 'edit' → open your editor for (row, column)
```

### Editable controls (checkbox, switch, radio, icon toggle)

These are **controlled**: they show what's in the row and emit the requested change. Update your rows
in the handler and the cell follows.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { CellActionEvent } from '@eboye/vue-grid'

const rows = ref<Market[]>([/* … */])
const columns = [
  col({ key: 'web', header: 'Web', renderer: 'switch' }),
  col({
    key: 'locked',
    header: 'Locked',
    renderer: 'checkbox',
    rendererOptions: {
      disabled: (_v, row) => row.settled,
      disabledReason: () => 'Settled markets are locked',
    },
  }),
  col({ key: 'primary', header: 'Primary', renderer: 'radio' }),
  col({
    key: 'favourite',
    header: '★',
    renderer: 'icon-toggle',
    rendererOptions: { label: 'Favourite' },
  }),
]

function onCellAction({ name, payload, rowKey, column }: CellActionEvent<Market>) {
  if (name === 'change' || name === 'toggle') {
    rows.value = rows.value.map((r) => (r.id === rowKey ? { ...r, [column.key]: payload } : r))
  } else if (name === 'select') {
    rows.value = rows.value.map((r) => ({ ...r, primary: r.id === rowKey }))
  }
}
</script>

<template>
  <VGrid :rows="rows" :columns="columns" row-key="id" @cell-action="onCellAction" />
</template>
```

Keyboard: focus the cell, press **Enter** to move into the control, then **Space** toggles it.

### Lists and details popovers

```ts
// first item + "+2 more" (emits `expand`)
col({
  key: 'audits',
  renderer: 'list',
  rendererOptions: { itemLabel: (a) => a.dataPoint, max: 1, placeholder: '—' },
})

// summary badge + info button opening a popover with a device list
col({
  key: 'terminal',
  renderer: 'details',
  rendererOptions: {
    label: (v) => v.state,
    tone: (v) => ({ OK: 'success', WARNING: 'warning', ERROR: 'danger' })[v.state],
    items: (v) =>
      v.devices.map((d) => ({ label: d.type, value: d.state, tone: d.tone, detail: d.model })),
    title: 'Devices',
  },
})

// JSON tree hidden behind "More info", parsing JSON nested inside strings
col({
  key: 'audit',
  renderer: 'json-tree',
  rendererOptions: {
    collapsed: true,
    parseNested: true,
    maxDepth: 3,
    emptyText: 'No data to show',
  },
})
```

### Reusing renderer components

Every renderer component is exported (`TextCell`, `CurrencyCell`, `StatusCell`, …), so a slot or an
add-on can compose them:

```vue
<template #cell-total="{ value, row, rowKey, rowIndex, depth, column }">
  <CurrencyCell
    v-bind="{ value, row, rowKey, rowIndex, depth, column }"
    :options="{ currency: row.currency }"
  />
  <small v-if="row.status === 'Refunded'">refunded</small>
</template>
```

---

## 5. Custom cells with slots

A `#cell-<key>` slot replaces the renderer for that column; `#header-<key>` replaces its header.

```vue
<VGrid :rows="rows" :columns="columns" row-key="id">
  <template #cell-customer="{ row, value }">
    <strong>{{ value }}</strong>
    <div class="muted">{{ row.customer.city }}</div>
  </template>

  <template #header-total="{ column }">
    {{ column.header }} <abbr title="incl. VAT">*</abbr>
  </template>
</VGrid>
```

Cell slot props: `{ row, value, rowKey, rowIndex, depth, column }`. Use a slot for a one-off; write
a renderer (§20) for anything reused across grids.

---

## 6. Sorting

### Client-side

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VGrid, createColumnHelper, type SortState } from '@eboye/vue-grid'
import type { Order } from './types'

const rows: Order[] = [/* … */]
const sort = ref<SortState | null>({ key: 'placedAt', dir: 'desc' })

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'customer', field: 'customer.name', sortable: true }),
  col({ key: 'total', renderer: 'currency', sortable: true }), // renderer sorts numerically
  col({ key: 'placedAt', renderer: 'date', sortable: true }), // …and by date
  col({
    key: 'status',
    sortable: true,
    sortValue: (row) => ['Open', 'Paid', 'Refunded'].indexOf(row.status),
  }),
  col({
    key: 'name',
    sortable: true,
    sortFn: (a, b) => a.customer.name.localeCompare(b.customer.name, 'sr'),
  }),
]
</script>

<template>
  <VGrid v-model:sort="sort" sort-mode="client" :rows="rows" :columns="columns" row-key="id" />
</template>
```

Clicking a header (or Enter on a focused header, or the header menu) cycles ascending → descending →
none. Nulls always sort last. Sub-rows are sorted within their level.

### Server-side (`controlled`, the default)

The grid only updates `sort`; you fetch the sorted data:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SortState } from '@eboye/vue-grid'

const sort = ref<SortState | null>(null)
const rows = ref<Order[]>([])
const loading = ref(false)

watch(
  sort,
  async (s) => {
    loading.value = true
    rows.value = await api.orders({ sortBy: s?.key, dir: s?.dir })
    loading.value = false
  },
  { immediate: true },
)
</script>

<template>
  <VGrid v-model:sort="sort" :rows="rows" :columns="columns" row-key="id" :loading="loading" />
</template>
```

---

## 7. Events: row, cell and renderer actions

```vue
<script setup lang="ts">
import type { CellActionEvent, CellClickEvent } from '@eboye/vue-grid'

const col = createColumnHelper<Order>()
const columns = [
  col({ key: 'customer', field: 'customer.name' }),
  col({ key: 'total', renderer: 'currency', clickable: true }), // → cell-click instead of row-click
  col({ key: 'name', renderer: 'toggle-text', rendererOptions: { clickable: true } }),
  col({
    key: 'actions',
    renderer: 'actions-menu',
    rendererOptions: { actions: [{ name: 'edit', label: 'Edit' }] },
  }),
]

function onRowClick(row: Order, event: MouseEvent | KeyboardEvent) {
  router.push(`/orders/${row.id}`)
}

function onCellClick({ row, column, value }: CellClickEvent<Order>) {
  console.log('clicked', column.key, value)
}

function onCellAction({ name, payload, row, rowKey, column }: CellActionEvent<Order>) {
  if (name === 'edit') openEditor(row)
  if (name === 'toggle') toggleFavourite(rowKey)
}
</script>

<template>
  <VGrid
    :rows="rows"
    :columns="columns"
    row-key="id"
    row-clickable
    @row-click="onRowClick"
    @cell-click="onCellClick"
    @cell-action="onCellAction"
  />
</template>
```

- `row-click` is always emitted; `row-clickable` only adds the pointer cursor and hover affordance.
- Clicks on links, buttons and inputs inside a cell never become a `row-click`.
- Highlight rows with `:highlighted-rows="[3, 7]"` or style them with
  `:row-class="(row, index) => ({ 'is-late': row.status === 'Open' })"`.

---

## 8. Selection

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { RowKey } from '@eboye/vue-grid'

const selected = ref<RowKey[]>([])
</script>

<template>
  <VGrid
    v-model:selected="selected"
    selectable
    :is-row-selectable="(row) => row.status !== 'Refunded'"
    :rows="rows"
    :columns="columns"
    row-key="id"
  />
  <p>{{ selected.length }} selected</p>
</template>
```

- `selectable="single"` → one row at a time (radio-like, no "select all").
- With sub-rows, `selection-mode="cascade"` (default) selects/deselects children with their parent
  and shows the parent as indeterminate when only some children are selected;
  `selection-mode="independent"` treats every row on its own.
- Keyboard: Space on a focused row toggles it.

---

## 9. Sub-grids (nested rows)

Children render inside the parent's grid using CSS `subgrid`, so they line up with the parent
columns at every depth, and inherit sorting, pinning, reordering and hiding.

### Children already in the data

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { RowKey } from '@eboye/vue-grid'

const expanded = ref<RowKey[]>([])
</script>

<template>
  <VGrid
    v-model:expanded="expanded"
    :rows="rows"
    :columns="columns"
    row-key="id"
    :sub-rows="(row) => row.children"
    selectable
    sort-mode="client"
  />
</template>
```

Rows whose `subRows` returns a non-empty array get an expander. Use **→ / ←** on a focused tree
cell to expand/collapse.

### Children loaded on demand

```vue
<script setup lang="ts">
interface Folder {
  id: string
  name: string
  hasChildren: boolean
}

async function loadChildren(folder: Folder): Promise<Folder[]> {
  const res = await fetch(`/api/folders/${folder.id}/children`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}
</script>

<template>
  <VGrid
    :rows="rootFolders"
    :columns="folderColumns"
    row-key="id"
    :load-sub-rows="loadChildren"
    :has-sub-rows="(row) => row.hasChildren"
    @sub-rows-error="({ row, error }) => toast(`Could not load ${row.name}: ${error}`)"
  >
    <template #sub-rows-loading="{ row }">Loading {{ row.name }}…</template>
  </VGrid>
</template>
```

Results are cached per row. A failed load shows an inline error with a **Retry** button.

Need children with a _different_ column set? Use a detail row (§10) with another `<VGrid>`.

---

## 10. Detail rows

The `#detail` slot renders a full-width panel under an expanded row. It can hold anything —
including another grid.

```vue
<script setup lang="ts">
const lineColumns = [
  { key: 'sku', header: 'SKU' },
  { key: 'qty', header: 'Qty', renderer: 'number' },
  { key: 'price', header: 'Price', renderer: 'currency' },
]
</script>

<template>
  <VGrid
    :rows="orders"
    :columns="columns"
    row-key="id"
    :row-expandable="(row) => row.lines.length > 0"
  >
    <template #detail="{ row }">
      <VGrid
        :rows="row.lines"
        :columns="lineColumns"
        row-key="sku"
        density="compact"
        :aria-label="`Lines of order ${row.id}`"
      />
    </template>
  </VGrid>
</template>
```

Expansion state is shared with sub-grids through `v-model:expanded`.

---

## 11. Column state: order, visibility, pinning, persistence

Column state is `{ order: string[]; hidden: string[]; pinned?: Record<string, 'left' | 'right' | null> }`.
Users change it by dragging headers, **Alt+←/→** on a focused header, the column menu, or the header
right-click menu (§12).

### Persist it in localStorage

```vue
<VGrid :rows="rows" :columns="columns" row-key="id" storage="orders-grid" />
```

`storage` accepts a key (localStorage) or your own adapter:

```ts
import type { ColumnStateStorage } from '@eboye/vue-grid'

const serverStorage: ColumnStateStorage = {
  load: () => userPrefs.value.ordersGrid ?? null,
  save: (state) => void api.savePrefs({ ordersGrid: state }),
}
```

```vue
<VGrid :rows="rows" :columns="columns" row-key="id" :storage="serverStorage" />
```

Stored state is reconciled with the current columns: unknown keys are dropped and new columns are
appended, so changing your column list never breaks a saved layout.

### Add a column picker

```vue
<script setup lang="ts">
import { VGrid, VGridColumnMenu, columnVisibilityFeature } from '@eboye/vue-grid'
</script>

<template>
  <!-- the picker's checkboxes hide columns, which needs columnVisibilityFeature -->
  <VGrid
    :rows="rows"
    :columns="columns"
    row-key="id"
    storage="orders-grid"
    :features="[columnVisibilityFeature]"
  >
    <template #toolbar="{ columnState, setColumnState }">
      <VGridColumnMenu
        :columns="columns"
        :column-state="columnState"
        label="Columns"
        filter-placeholder="Find a column…"
        reset-label="Reset"
        @update:column-state="setColumnState($event!)"
      />
    </template>
  </VGrid>
</template>
```

### Control it yourself

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ColumnState } from '@eboye/vue-grid'

const columnState = ref<ColumnState>({
  order: ['id', 'customer', 'total'],
  hidden: ['meta'],
  pinned: { id: 'left' },
})
</script>

<template>
  <VGrid v-model:column-state="columnState" :rows="rows" :columns="columns" row-key="id" />
  <button @click="columnState = { ...columnState, hidden: [] }">Show all</button>
</template>
```

### Pinned columns

```ts
col({ key: 'id', pinned: 'left', width: '4rem' }),
col({ key: 'actions', pinned: 'right', width: 'min-content' }),
```

With `columnPinningFeature`, pinned columns stay put while the grid scrolls sideways (without it,
`pinned` is ignored); a shadow marks the edge
(`--vg-shadow-pinned`). They can only be reordered within their pin group. Users can pin/unpin at
runtime from the header menu unless the column has `pinnable: false`.

---

## 12. Context menus

Menus use the native Popover API and CSS anchor positioning: they're never clipped by the grid,
close on Esc / outside click, flip to stay on screen, and support arrow keys, Home/End and typeahead.

### Body cells

```vue
<script setup lang="ts">
import type { CellContext, ContextActionEvent, MenuItem } from '@eboye/vue-grid'

function contextMenu({ row, column, value }: CellContext<Order>): MenuItem[] {
  if (column.key === 'url') return [] // [] or null → the browser's own menu
  return [
    { name: 'copy', label: `Copy ${column.header ?? column.key}`, hint: 'Ctrl+C' },
    { name: 'open', label: `Open order #${row.id}` },
    { separator: true },
    { name: 'refund', label: 'Refund', disabled: row.status !== 'Paid' },
    { name: 'delete', label: 'Delete', tone: 'danger' },
  ]
}

function onContextAction({ name, row, column, value }: ContextActionEvent<Order>) {
  if (name === 'copy') navigator.clipboard.writeText(String(value ?? ''))
  if (name === 'open') router.push(`/orders/${row.id}`)
}
</script>

<template>
  <VGrid
    :rows="rows"
    :columns="columns"
    row-key="id"
    :context-menu="contextMenu"
    @context-action="onContextAction"
  />
</template>
```

Right-click opens the menu at the pointer; the **ContextMenu** key or **Shift+F10** opens it under
the focused cell. Focus returns to the cell when it closes. Menu items can have an `icon` component.

### Column headers

Right-clicking a header shows a built-in menu (on by default): Sort ascending / descending / Clear
sort, Pin left / Pin right / Unpin, Move left / right, Hide column, Reset columns.

```vue
<!-- add your own items (they emit header-action; built-ins run themselves) -->
<VGrid
  :rows="rows"
  :columns="columns"
  row-key="id"
  :header-menu="
    ({ column, items }) => [
      { name: 'copy-column', label: 'Copy column' },
      { separator: true },
      ...items,
    ]
  "
  @header-action="({ name, column }) => name === 'copy-column' && copyColumn(column.key)"
/>

<!-- only some built-ins: filter by their names (vg:sort-asc, vg:pin-left, vg:hide, vg:reset, …) -->
<VGrid
  :header-menu="({ items }) => items.filter((i) => !('name' in i) || !i.name.startsWith('vg:move'))"
  …
/>

<!-- turn it off -->
<VGrid :header-menu="false" … />
```

---

## 13. Filtering

### Header filters, filter row and quick search

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  VGrid,
  VGridSearch,
  dateRenderer,
  numberRenderer,
  statusRenderer,
  booleanRenderer,
  type FilterState,
} from '@eboye/vue-grid'

const filters = ref<FilterState | null>(null)
const columns = [
  { key: 'player', header: 'Player', filterable: true },                             // text
  { key: 'city', header: 'City', filterable: true, filter: 'set' },                  // value list
  { key: 'stake', header: 'Stake', filterable: true, renderer: numberRenderer },     // number
  { key: 'status', header: 'Status', filterable: true, renderer: statusRenderer },   // value list
  { key: 'placedAt', header: 'Placed', filterable: true, renderer: dateRenderer },   // date
  { key: 'vip', header: 'VIP', filterable: true, renderer: booleanRenderer },        // yes / no
  { key: 'notes', header: 'Notes', searchable: false },                              // not in quick search
]
</script>

<template>
  <VGrid v-model:filters="filters" :rows="bets" :columns="columns" row-key="id" filter-row>
    <template #toolbar="{ activeFilterCount, clearFilters }">
      <VGridSearch placeholder="Search bets…" />
      <button v-if="activeFilterCount" type="button" @click="clearFilters()">
        Clear filters ({{ activeFilterCount }})
      </button>
    </template>
  </VGrid>
</template>
```

- Hover a header to show its funnel. Click it to open a popover with the editor for the column's
  type. Changes apply right away, and **Clear** removes the filter.
- The filter row takes shorthand: type `>100`, `10..50` or `!=0` into *Stake*, or `>2026-01-01`
  into *Placed*.
- Matching ignores case and accents, so `nis` finds *Niš*.
- `filters` is plain JSON, so you can save it, put it in the URL or send it to a backend:

```ts
filters.value = {
  columns: {
    stake: { type: 'number', op: 'between', value: 10, to: 50 },
    status: { type: 'set', values: ['Won', 'Open'] },
    placedAt: { type: 'date', op: 'after', value: '2026-01-01' },
  },
  search: 'ana',
}
```

### Remember filters

```vue
<VGrid :rows :columns row-key="id" filter-storage="bets-filters" />
<!-- or your own storage: { load(): FilterState | null, save(state): void } -->
```

### Popover only, opened from your own button

```vue
<script setup lang="ts">
const grid = ref<VGridExposed>()
</script>

<template>
  <button @click="grid?.openFilter('city')">Filter by city</button>
  <VGrid ref="grid" :rows :columns row-key="id" />
</template>
```

`grid.setFilters(state)` and `grid.clearFilters()` work the same way. The header right-click menu
also has *Filter…*, *Clear filter* and *Clear all filters*.

### A custom filter

```vue
<!-- EvenOddFilter.vue -->
<script setup lang="ts">
import type { ColumnFilter } from '@eboye/vue-grid'

defineProps<{ modelValue: ColumnFilter | undefined }>()
const emit = defineEmits<{ 'update:modelValue': [ColumnFilter | undefined] }>()
</script>

<template>
  <select @change="(e) => {
    const v = (e.target as HTMLSelectElement).value
    emit('update:modelValue', v ? { type: 'custom', value: v } : undefined)
  }">
    <option value="">Any</option>
    <option value="even">Even</option>
    <option value="odd">Odd</option>
  </select>
</template>
```

```ts
col({
  key: 'id',
  filterable: true,
  filterComponent: EvenOddFilter,
  filterFn: (row, filter) => {
    const v = (filter as { value: string }).value
    return v === 'even' ? row.id % 2 === 0 : row.id % 2 === 1
  },
})
```

`filterFn` can also replace the matching for a built-in type, and `filterValue: (row) => …`
changes the value a column is filtered by. For example, filter a formatted name by its raw id.

### Trees and sub-grids

Filtering sees nested rows. A parent stays visible when one of its children matches, and a
matching parent keeps all its children. Select-all only selects the rows you can see.

---

## 14. Server data

### Let the grid fetch: `dataSource`

```vue
<script setup lang="ts">
import { VGrid, type DataSource } from '@eboye/vue-grid'

const fetchBets: DataSource<Bet> = async (query, { signal }) => {
  // query = { sort: { key, dir } | null, filters: { columns, search }, page, pageSize }
  const res = await fetch('/api/bets/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal, // the grid aborts superseded requests
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json()
  return { rows: body.items, total: body.total }
}
</script>

<template>
  <VGrid
    ref="grid"
    :data-source="fetchBets"
    :columns="columns"
    row-key="id"
    :pagination="{ pageSizes: [25, 50, 100] }"
    filter-row
    @load-error="(e) => toast.error(e.message)"
  />
</template>
```

- Clicking a header, changing a filter, searching, or changing the page or page size calls
  `fetchBets` with the new query. The grid shows the rows it gets back as they are, without
  sorting, filtering or slicing them.
- New sorts and filters go back to page 1.
- The grid shows a progress bar while a request runs, and *Couldn't load the rows.* with a
  *Retry* button when one fails.
- After a mutation, call `grid.value?.reload()`. Live field updates go through
  `grid.value?.patchLoadedRows([{ id, status: 'Won' }])`.

**Value lists from the backend.** A `set` filter can load its options, with search:

```ts
col({
  key: 'city',
  filterable: true,
  filter: {
    type: 'set',
    options: async (search, { signal }) => {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(search)}`, { signal })
      const cities: string[] = await res.json()
      return cities.map((name) => ({ value: name })) // { value, label?, count? }[]
    },
  },
})
```

### Fetch it yourself: `@query-change`

If your data already lives in a store, keep `rows` yourself and listen to one event:

```vue
<script setup lang="ts">
import type { GridQuery } from '@eboye/vue-grid'

const rows = ref<Bet[]>([])
const loading = ref(false)
async function load(query: GridQuery) {
  loading.value = true
  try {
    rows.value = await store.searchBets(query)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <VGrid
    :rows="rows"
    :columns="columns"
    row-key="id"
    :loading="loading"
    sort-mode="controlled"
    filter-mode="controlled"
    @query-change="load"
  />
</template>
```

`query-change` fires once on mount and then on every real change. Identical queries are dropped.
Handle ordering of overlapping requests yourself, or use `dataSource`, which already does.

### Server-side matching

`matchesFilter(value, filter, { timeZone })` and `filterTree` are pure functions, so a Node backend
or a test can apply exactly the grid's rules to the same `FilterState`.

---

## 15. Pagination (server-style)

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { VGrid, VGridPagination, type SortState } from '@eboye/vue-grid'

const page = ref(1)
const pageSize = ref(25)
const sort = ref<SortState | null>(null)
const rows = ref<Order[]>([])
const total = ref(0)
const loading = ref(false)

watch(
  [page, pageSize, sort],
  async () => {
    loading.value = true
    const res = await api.orders({
      page: page.value,
      size: pageSize.value,
      sortBy: sort.value?.key,
      dir: sort.value?.dir,
    })
    rows.value = res.items
    total.value = res.total
    loading.value = false
  },
  { immediate: true },
)
</script>

<template>
  <VGrid v-model:sort="sort" :rows="rows" :columns="columns" row-key="id" :loading="loading" />
  <VGridPagination
    v-model:page="page"
    v-model:page-size="pageSize"
    :total="total"
    :page-sizes="[10, 25, 50, 100]"
    :siblings="1"
    summary="{from}–{to} of {total} orders"
  />
</template>
```

`VGridPagination` is independent of the grid — use it with anything. Pass `summary=""` to hide the
summary text.

Simpler: `<VGrid pagination>` renders the same pager under the grid. With `rows` it pages the
sorted and filtered rows, and with a `dataSource` it requests pages (§14):

```vue
<VGrid :rows="orders" :columns row-key="id" :pagination="{ pageSizes: [10, 25, 50] }" v-model:page-size="pageSize" />
```

---

## 16. Virtual scrolling

For thousands of rows, render only what's visible (needs `virtualScrollingFeature`; without it
`virtual` is ignored and every row renders):

```vue
<VGrid
  :rows="tenThousandRows"
  :columns="columns"
  row-key="id"
  :features="[virtualScrollingFeature]"
  :virtual="{ rowHeight: 40, overscan: 8 }"
  style="height: 600px"
/>
```

- Every row must have the same height (`rowHeight`, in px). Keep content to one line
  (e.g. `rendererOptions: { ellipsis: true }`).
- The grid needs a fixed height.
- Sub-rows and detail rows are disabled in virtual mode.

---

## 17. Loading and empty states

```vue
<VGrid :rows="rows" :columns="columns" row-key="id" :loading="loading" empty-text="No orders yet.">
  <!-- optional richer versions -->
  <template #empty>
    <p>No orders match your filters.</p>
    <button @click="clearFilters">Clear filters</button>
  </template>
  <template #loading>Fetching orders…</template>
</VGrid>
```

`loading` shows a progress bar and sets `aria-busy`. Rows that are already shown stay visible while
you refetch; the `#loading` slot (default "Loading…") only appears when there are no rows yet, in
place of the empty message.

---

## 18. Programmatic control (template ref)

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VGrid, type VGridExposed } from '@eboye/vue-grid'

const grid = ref<VGridExposed>()
</script>

<template>
  <button @click="grid?.expandAll()">Expand all</button>
  <button @click="grid?.collapseAll()">Collapse all</button>
  <button @click="grid?.scrollToTop()">Top</button>
  <button @click="grid?.scrollToRow(42)">Go to #42</button>
  <button @click="grid?.setColumnState({ order: [], hidden: [] })">Default layout</button>

  <VGrid ref="grid" :rows="rows" :columns="columns" row-key="id" :sub-rows="(r) => r.children" />
</template>
```

### Partial updates (enrichment, live data)

The grid re-renders only what changed, so you can update a few fields of a few rows — data
arriving later from another service, a live price feed — without rebuilding the table.

**Reactive rows**: assign the field; exactly that cell re-renders.

```ts
const rows = ref<Order[]>(await api.orders())
// later…
const order = rows.value.find((o) => o.id === 42)
if (order) order.status = 'Paid'
```

**Immutable rows** (recommended for large lists — no deep reactivity): keep the list in a
`shallowRef` and apply patches by key with `patchRows`. Patched rows become new objects, every other
row keeps its identity, so only the patched rows re-render.

```ts
import { patchRows } from '@eboye/vue-grid'

const rows = shallowRef<Order[]>(await api.orders())

// enrichment arrives later, for some rows and some fields
const cities = await geo.lookup(rows.value.map((o) => o.customerId)) // [{ id: 3, city: 'Niš' }, …]
rows.value = patchRows(rows.value, cities, 'id')

// a Map works too, and nested sub-rows can be patched in place
rows.value = patchRows(rows.value, new Map([[42, { status: 'Paid' }]]), 'id', { children: 'children' })
```

Mutating a field under a `shallowRef` (`rows.value[0].city = 'x'`) is **not** observed — assign the
array `patchRows` returns instead.

**Lazily loaded children** (`loadSubRows`) live in the grid's cache, so patch them through the grid:

```ts
const grid = ref<VGridExposed>()
grid.value?.patchLoadedRows([{ id: 'c2', city: 'Zrenjanin' }]) // returns how many rows changed
```

**Highlight changes.** Add `flash` to briefly tint cells whose value changed — handy for live data:

```vue
<VGrid :rows="rows" :columns="columns" row-key="id" flash />            <!-- subtle accent tint -->
<VGrid :rows="rows" :columns="columns" row-key="id" flash="direction" /> <!-- green up, red down -->
```

```ts
col({ key: 'name', flash: false })          // opt a column out
col({ key: 'price', flash: 'direction' })   // or in, with direction colours
```

Nothing flashes on the first render or when a re-fetched row brings equal values. It is a pure CSS
animation (`--vg-flash-color`, `--vg-flash-up`, `--vg-flash-down`, `--vg-flash-duration`); with
`prefers-reduced-motion` the tint is held briefly instead of fading.

---

## 19. Theming

All styles live in `@layer vue-grid` and read `--vg-*` CSS variables, so any unlayered CSS — yours
or Tailwind's — wins without `!important`.

### Variables

```css
/* app-wide */
:root {
  --vg-font-family: 'Inter', system-ui, sans-serif;
  --vg-color-accent: #2563eb;
  --vg-radius: 0.75rem;
}

/* one grid (put the class on <VGrid> or any ancestor) */
.orders-grid {
  --vg-color-header-bg: #f8fafc;
  --vg-color-row-hover: #eff6ff;
  --vg-color-row-selected: #dbeafe;
  --vg-cell-padding-x: 1rem;
  --vg-cell-padding-y: 0.5rem;
  --vg-row-border: 1px solid #e2e8f0;
  --vg-outer-border: none;
  --vg-subgrid-indent: 2rem;
}
```

The full token list is in the [README](../packages/vue-grid/README.md#theming).

### Dark mode

Colours use `light-dark()`. Follow the OS:

```css
html {
  color-scheme: light dark;
}
```

or force it (`color-scheme: dark` on `html` or on a wrapper). To set custom colours for both modes:

```css
.orders-grid {
  --vg-color-header-bg: light-dark(#f8fafc, #0f172a);
}
```

### Density

```vue
<VGrid density="compact" … />
<!-- 'compact' | 'cozy' (default) | 'comfortable' -->
```

### Tailwind (or any utility classes) per part

```vue
<VGrid
  :ui="{
    root: 'rounded-xl shadow-sm',
    header: 'bg-slate-50',
    headerCell: 'uppercase tracking-wide text-xs',
    row: 'text-sm', // inherited text styles only — see note below
    cell: 'tabular-nums',
    subgrid: 'bg-slate-50/50',
    detail: 'p-4',
    empty: 'text-slate-400',
  }"
  …
/>
```

Rows are `display: contents` (the cells sit directly on the grid), so a row has no box of its own:
backgrounds, borders and padding belong on `cell`; on `row`, only inherited styles (colour, font)
have an effect. For row hover/selected colours use the `--vg-color-row-*` tokens.

Stable class names are available for anything else: `.vg`, `.vg-header-cell`, `.vg-row`, `.vg-cell`,
`.vg-subgrid`, `.vg-pin-left`, `.vg-pin-right`, `.vg-menu`, …

---

## 20. Writing a cell renderer add-on

A renderer is a component plus a definition. The complete, publishable example is
[`packages/cell-renderer-template`](../packages/cell-renderer-template) (a star rating).

### 1 — The component

```vue
<!-- RatingCell.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '@eboye/vue-grid'
import type { RatingOptions } from './types'

const props = defineProps<CellRendererProps<unknown, number | null, RatingOptions>>()
const emit = defineEmits<CellRendererEmits>()

const stars = computed(() => Array.from({ length: props.options.max ?? 5 }, (_, i) => i + 1))
</script>

<template>
  <span class="rating" role="group" :aria-label="`${value ?? 0} of ${options.max}`">
    <button
      v-for="n in stars"
      :key="n"
      type="button"
      :disabled="options.readonly"
      :aria-label="`Rate ${n}`"
      @click="emit('action', 'rate', n)"
    >
      {{ n <= (value ?? 0) ? '★' : '☆' }}
    </button>
  </span>
</template>
```

Props every renderer gets: `value`, `row`, `rowKey`, `rowIndex`, `depth`, `column`, `options`
(defaults merged with the column's `rendererOptions`). Emitting `action(name, payload)` reaches the
app as `@cell-action`. `useGridContext()` returns `{ locale, currency, timeZone }` for formatting.

Renderers must not use `v-html`; render text through interpolation so values are escaped.

### 2 — The definition and typing

```ts
// index.ts
import { defineCellRenderer } from '@eboye/vue-grid'
import RatingCell from './RatingCell.vue'
import type { RatingOptions } from './types' // { max?: number; readonly?: boolean }

declare module '@eboye/vue-grid' {
  interface CellRendererRegistry {
    rating: RatingOptions // makes renderer: 'rating' autocomplete and type-checks its options
  }
}

export const ratingRenderer = defineCellRenderer<RatingOptions>({
  name: 'rating',
  component: RatingCell,
  defaults: { max: 5, readonly: false },
  align: 'start',
  sortValue: (value) => (value == null ? null : Number(value)), // for sort-mode="client"
  format: (value, options) => `${Number(value ?? 0)} of ${options.max ?? 5}`, // plain-text form
})
```

### 3 — Register and use it

```ts
// app-wide
app.use(createVueGrid({ renderers: [ratingRenderer] }))
```

```vue
<!-- or for one grid -->
<VGrid :renderers="[ratingRenderer]" … />
```

```ts
col({ key: 'rating', renderer: 'rating', rendererOptions: { max: 10 } }) // typed
```

```vue
<VGrid
  …
  @cell-action="({ name, payload, rowKey }) => name === 'rate' && saveRating(rowKey, payload as number)"
/>
```

### Lookup order and overrides

A column's renderer is resolved as: a definition or component passed directly in `renderer` → the
grid's `:renderers` → plugin renderers → `text` (the only built-in default). Registering a renderer
with a built-in's name (e.g. `name: 'currency'`) replaces it for that name.

For a one-off you can skip the registry and pass the component:

```ts
import FlagCell from './FlagCell.vue'
col({ key: 'country', renderer: FlagCell, rendererOptions: { size: 16 } })
```

### Styling an add-on

Ship plain CSS in `@layer vue-grid-addons` and use the grid's tokens so it follows the theme:

```css
@layer vue-grid-addons {
  .rating button {
    color: var(--vg-color-warning);
    padding: 0;
    background: none;
    border: 0;
  }
}
```

---

## 21. Using VGridMenu in your own components

The menu behind `actions-menu` and the context menus is exported.

### Declarative (anchored to a button)

```vue
<script setup lang="ts">
import { VGridMenu, type MenuItem } from '@eboye/vue-grid'

const items: MenuItem[] = [
  { name: 'export-csv', label: 'Export CSV' },
  { name: 'export-xlsx', label: 'Export Excel' },
]
</script>

<template>
  <button popovertarget="export-menu" :style="{ 'anchor-name': '--export-menu' }">Export ▾</button>
  <VGridMenu
    id="export-menu"
    anchor-name="--export-menu"
    label="Export"
    :items="items"
    @select="(item) => exportAs(item.name)"
  />
</template>
```

### Imperative (at an element or a point)

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VGridMenu } from '@eboye/vue-grid'

const menu = ref<InstanceType<typeof VGridMenu>>()

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  menu.value?.openAt({ x: e.clientX, y: e.clientY }, e.currentTarget as HTMLElement)
}
</script>

<template>
  <div @contextmenu="onContextMenu">Right-click me</div>
  <VGridMenu ref="menu" placement="point" :items="items" @select="run" />
</template>
```

`openAt(target, focusAfterClose?)` takes an element or `{ x, y }`; `close()` and `isOpen` are also
exposed. Events: `select(item)`, `open`, `close`.

---

## 22. Pure helpers

The grid's logic is exported as plain functions, handy for server-style code or tests:

```ts
import {
  getByPath, // getByPath(order, 'customer.city')
  getCellValue, // value of a column for a row (value fn → field → key)
  sortRows, // sortRows(rows, 'asc', (row) => row.total) — stable, nulls last
  patchRows, // patchRows(rows, [{ id: 3, city: 'Niš' }], 'id') — immutable, minimal partial updates
  compareValues, // number/date/boolean/natural-order string comparison
  nextSort, // asc → desc → null cycle
  normalizeColumnState, // reconcile saved state with columns
  visibleColumns,
  moveColumn,
  setColumnHidden,
  setColumnPinned,
  pageItems, // page buttons with ellipses: pageItems(5, 20, 1)
  localStorageAdapter, // localStorageAdapter('orders-grid')
} from '@eboye/vue-grid'

// client-side paging + sorting
const pageRows = computed(() =>
  sortRows(all, sort.value?.dir ?? 'asc', (r) => r.total).slice(
    (page.value - 1) * size.value,
    page.value * size.value,
  ),
)
```
