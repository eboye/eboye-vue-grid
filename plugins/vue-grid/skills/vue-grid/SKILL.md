---
name: vue-grid
description: Use when building, changing or debugging a data table / data grid with @nocopypaste/vue-grid (`<VGrid>`) in a Vue 3 app — columns, cell renderers, sorting, filtering, server data, pagination, selection, sub-grids, detail rows, virtual scrolling, pinned columns or rows, totals, row grouping, CSV export / copy to clipboard, inline cell editing, spreadsheet-like cell-range selection, menus, theming — or when a VGrid option "does nothing". Gives the rules that prevent silent failures, the exact API via the vue-grid MCP tools, and a validate-then-verify workflow.
---

# Building with @nocopypaste/vue-grid

`<VGrid>` keeps everything opt-in: a feature or renderer you forget to register is not an error —
the option just **does nothing**. Most broken grids come from that, from guessing option names,
or from a grid without a bounded height. This workflow prevents all three.

## 1. Load the rules (once per task)

- With the `vue-grid` MCP server (this plugin starts it): call **`vue_grid_guide`**.
- Without it: read `node_modules/@nocopypaste/vue-grid/AGENTS.md` (the same text, matching the
  installed version). Not installed yet: `npm i @nocopypaste/vue-grid`, and import
  `@nocopypaste/vue-grid/style.css` once in `main.ts`.

Keep its **Rules** section in mind for every edit.

## 2. Map the request to features and renderers

Use the guide's "Which feature for what" and "Renderers (pick by data)" tables. For each thing
the user asked for, note the feature export (`sortingFeature`, …), the props / column options,
and the renderer export (`currencyRenderer`, …).

## 3. Look up exact names — never guess

- **`vue_grid_api`** `{ section, name }` — props, v-models, events, slots, methods, column options
  (`section: "column"`), features, types. Each entry says which feature it needs.
- **`vue_grid_renderer`** `{ name }` — every `rendererOptions` key of a renderer, with types.
- **`vue_grid_search_docs`** `{ query }` — how-to sections (server data, lazy sub-rows, theming…).

Without MCP: `node_modules/@nocopypaste/vue-grid/agent/api.md` (generated reference) and `README.md`.
A working example of each feature, complete component source included:
<https://eboye.github.io/eboye-vue-grid/> (the code under each demo).

## 4. Write the code

- `const col = createColumnHelper<Row>()` and `col({ … })` for typed columns.
- Import renderer definitions and pass them (`renderer: currencyRenderer`), not strings.
- List every needed feature in `:features="[…]"` (or app-wide in `createVueGrid({ features })`).
- `row-key`, a bounded height, `sort-mode="client"` when the grid should sort rows itself;
  `multi-sort` + `v-model:sorts` to sort by several columns (Shift-click).
- Inline editing (`editingFeature`, `editable` columns): handle `@cell-edit` and store `e.value`
  (`setCellValue`), or use `:save-cell` for async saves; the grid never writes the value itself.
  Undo / redo (Ctrl/⌘+Z, Ctrl+Y) come through the same `@cell-edit` (`e.source`): store them too.
- Editable renderers are controlled: handle `@cell-action` and update the data.
- Reorderable rows: `row-reorder` + `rowReorderFeature`; handle `@row-move` with
  `moveRow(rows, e)` (controlled, like editing).
- Many columns: `virtual-columns` + `columnVirtualizationFeature` (with `virtual` for rows);
  give columns widths. Not a sliced `columns` array.
- Test hooks (`data-test`) on rows and cells: `attributesFeature` with `:row-attrs` /
  `:cell-attrs` (`({ rowIndex, columnKey }) => ({ 'data-test': … })`), not wrapper elements.
- Selecting / copying a block of cells: `range-selection` + `rangeSelectionFeature` (`v-model:range`),
  not row selection; Ctrl/⌘+C copies it, the status bar adds it up. With `editingFeature`,
  Ctrl/⌘+V pastes into `editable` cells, and the fill handle / Ctrl/⌘+D fill them: each change is
  a `cell-edit` to store, like typing. Ctrl/⌘+F / Ctrl/⌘+H open find and replace (`openFind()`);
  replacements come through `@cell-edit` too (`source: 'replace'`), as do Delete (`'clear'`)
  and Ctrl/⌘+X (`'cut'`).
- Another language: import a pack (`import { de } from '@nocopypaste/vue-grid/locales/de'`; also
  `fr`, `es`, `it`, `pt-BR`, `nl`, `pl`, `ja`, `sr`, `sr-Latn`) as `messages`, plus `locale` for number and date formats. Other
  languages: your own `messages` (`GridMessages`, `locales/en` is the template).

## 5. Validate the config

Call **`vue_grid_validate`** with the grid's config as data:

```json
{
  "rowKey": "id",
  "features": ["sortingFeature", "filteringFeature"],
  "renderers": [],
  "sortMode": "client",
  "filterRow": true,
  "columns": [
    { "key": "total", "renderer": "currencyRenderer", "sortable": true, "aggregate": "sum" }
  ]
}
```

Renderers / functions may be written as their export names or source strings. Fix every
`error`, act on each `warning` (they're options that silently do nothing), then validate again.
Without MCP: `npx @nocopypaste/vue-grid-mcp validate grid.json`, or
`validateGridConfig()` from `@nocopypaste/vue-grid/agent` in a script.

## 6. Verify in a browser

Type-checks and validation don't show layout or interaction. Run the app (or a Storybook story)
and check:

- the dev console has no `[vue-grid]` warnings (missing feature, unknown renderer, duplicate key);
- the header sticks and rows scroll inside the grid;
- each requested feature responds: sort a column, open a filter, expand a row, select, page;
- for mobile requests: at ~375 px wide the page doesn't scroll sideways (the grid scrolls
  inside itself), and touch works — swipe scrolls, hold a header to drag it, hold a cell or
  header (release) for its menu.

Accessibility is built in: the ARIA grid / table roles, keyboard navigation (with
`keyboardNavigationFeature`), the row count announced after filtering, Windows high contrast and
reduced motion. Don't add your own live region for result counts or your own high-contrast styles
for selection.

## 7. Report

Say which features and renderers you used, what the validator reported, and what you checked in
the browser (or that you couldn't).
