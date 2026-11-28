# Grid integration plan

Validate Vue Grid in server-paged tables, hierarchical views, and expandable detail panels.
The application owns data fetching, access rules, saved preferences, and exports. Keep the grid
integration selectable per screen so it can be evaluated independently.

## Phase 1 — Tree expansion and row visibility

- [x] Honor `rowExpandable` when opening a tree branch. Keep the rendered rows and accessible row count in sync in both normal and virtual grids.
- [x] Support independent tree and detail expansion by stable row key with `v-model:detail-expanded`. Preserve shared expansion by default. Test keyboard controls, lazy children, and all expansion combinations.
- [x] Validate adapting flat parent-child records to nested rows. Keep stable keys and sibling order across refreshes, and verify that selection panels reopen when an ancestor is expanded again.
- [x] Expose reactive `getVisibleRows()` and verify counts derived from visible leaf rows. Account for collapsed branches, filtering with no matches, and virtualization.
- [x] Integrate the visible-row API into a hierarchical table that can switch between tree and grouped views. Preserve custom labels, detail expansion, scroll position, and focus across refreshes and partial updates.

## Phase 2 — Shared table integration

- [x] Adapt flat column definitions, custom cells and headers, sort keys, pins, and visibility. Support reactive column updates and per-table controls for resizing, reordering, and focus.
- [x] Reuse existing column preferences and reset behavior. Verify stale and newly added keys and preserve the grid instance during server sorting and paging.
- [x] Match fitted header and row heights in a flat table. Preserve header selectors and reuse loading, empty, error, and paging states.
- [x] Support nested column headers, stable selectors, and custom group labels. Verify sticky stacking, accessible row indices, pin boundaries, and keyboard navigation.
- [x] Validate fixed and flexible widths across container changes, hiding, reordering, and resizing. Verify that edited widths and hidden columns survive reload.
- [x] Validate custom column and group header controls in a fitted table. Verify keyboard access, sorting, and overlay placement and focus in Chromium, Firefox, and WebKit.
- [x] Support opt-in initial content autosizing. Fit after real rows render, honor width bounds, and preserve saved widths and manual resizing.

## Phase 3 — Representative workflows

- [x] Validate a flat server-paged table with realistic fixtures in Chromium, Firefox, and WebKit. Cover keyboard sorting and clearing, page changes, fitted heights, saved column order and visibility, reset, CSV download, loading, retry, and empty results.
- [x] Validate a server-paged detail table with stable expansion keys, focus return, and overlays that cross the grid boundary in Chromium, Firefox, and WebKit.
- [x] Validate a short final page with content-sized rows. Confirm that expanded content fits and the following row's action stays usable in Chromium, Firefox, and WebKit. The example renders at most three data rows per page and uses ordinary rendering.
- [x] Validate tree and grouped views through live refreshes, collapsed ancestors, restored expansion, and visible leaf counts in Chromium, Firefox, and WebKit.
- [x] Measure first render, scrolling, and incremental updates on a 50-row page, a 2,000-task tree and grouped table, and a 10,000-row virtual table. Record the [baseline and reproduction steps](../../performance.md).
