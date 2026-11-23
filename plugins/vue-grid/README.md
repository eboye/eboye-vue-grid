# vue-grid — Claude Code plugin

Makes Claude Code build `<VGrid>` data grids with [`@nocopypaste/vue-grid`](../../packages/vue-grid)
correctly the first time.

```
/plugin install vue-grid --marketplace https://github.com/eboye/eboye-vue-grid
```

It adds:

- **The `vue-grid` skill**: loaded when you ask for a table / data grid in a Vue app (or when a
  VGrid option "does nothing"). It walks through: load the grid's rules → map the request to
  features and renderers → look up exact option names → write typed columns → validate the
  config → verify in a browser (including phone width and touch when asked) → report.
- **The `vue-grid` MCP server** ([`@nocopypaste/vue-grid-mcp`](../../packages/vue-grid-mcp), via `npx`):
  `vue_grid_guide`, `vue_grid_api`, `vue_grid_renderer`, `vue_grid_search_docs` and
  `vue_grid_validate`. It answers from the `@nocopypaste/vue-grid` installed in your project, so the API
  it shows matches the version you use.

Needs Node 20+ (for `npx`). Without the plugin, any agent can read
`node_modules/@nocopypaste/vue-grid/AGENTS.md`, and any MCP client can run
`npx -y @nocopypaste/vue-grid-mcp`.
