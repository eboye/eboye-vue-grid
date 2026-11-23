# @eboye/vue-grid-mcp

An [MCP](https://modelcontextprotocol.io) server that gives coding agents the exact API of
[`@eboye/vue-grid`](../vue-grid) — so they register the right features, use real option names
and check their grid config instead of guessing. No dependencies besides the grid itself.

When it runs inside a project that has `@eboye/vue-grid` installed, it answers from that copy, so
the docs match the version you use.

## Add it

Claude Code (or use the [plugin](../../plugins/vue-grid), which adds this server and a skill):

```sh
claude mcp add vue-grid -- npx -y @eboye/vue-grid-mcp
```

Any MCP client (Cursor, VS Code, Windsurf, Claude Desktop…):

```json
{ "mcpServers": { "vue-grid": { "command": "npx", "args": ["-y", "@eboye/vue-grid-mcp"] } } }
```

## Tools

| Tool | What it returns |
|---|---|
| `vue_grid_guide` | `AGENTS.md`: the rules that prevent silent failures, which feature / renderer for what, recipes, pitfalls. Call it first. |
| `vue_grid_api` `{ section?, name? }` | The generated API reference: props, v-models, events, slots, methods, `column` options, features, renderers, types — an index, a section, or one entry (with the feature it needs). |
| `vue_grid_renderer` `{ name? }` | A renderer's options with types and a column example, or all renderers in one list. |
| `vue_grid_search_docs` `{ query, limit? }` | The best matching sections of the guide, API reference and README. |
| `vue_grid_validate` `{ config }` | Diagnostics for a grid config (props, `columns`, `features`, `renderers`): unknown names with did-you-mean, options whose feature is missing, unknown / unregistered renderers and options, wrong types, combinations that do nothing — each with a fix. |

Resources: `vue-grid://AGENTS.md`, `vue-grid://api.md`, `vue-grid://README.md`,
`vue-grid://api.json`, `vue-grid://grid-config.schema.json`.

## CLI

```sh
npx @eboye/vue-grid-mcp validate grid.json   # diagnostics; exit 1 on errors ("-" reads stdin)
npx @eboye/vue-grid-mcp guide                # print AGENTS.md
```

`grid.json` is the grid as data, e.g.:

```json
{ "rowKey": "id", "features": ["sortingFeature"], "sortMode": "client",
  "columns": [{ "key": "total", "renderer": "currencyRenderer", "sortable": true }] }
```

## Protocol

stdio, JSON-RPC 2.0, MCP `2025-06-18` (also `2025-03-26`, `2024-11-05`): `initialize`, `ping`,
`tools/list`, `tools/call`, `resources/list`, `resources/read`. All tools are read-only.
