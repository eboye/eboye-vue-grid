import type { Component } from 'vue'

export interface Page {
  /** URL hash: `#/<id>`. */
  id: string
  title: string
  /** Sidebar section. */
  section: string
  /** One or two sentences under the title. */
  summary: string
  /** Things to try in the demo. */
  try?: string[]
  /** Heading of the matching `docs/examples.md` section, for the docs link. */
  docs?: string
  /** Demo files in `src/demos`, without `.vue`; the first one is the demo, the rest are shown too. */
  files: string[]
}

export const pages: Page[] = [
  {
    id: 'renderers',
    title: 'Cell renderers',
    section: 'Data',
    summary:
      '29 built-in renderers with typed options: numbers, money, changes, dates, badges, chips, links, JSON, copy buttons, switches, menus. Plus add-ons like the star rating.',
    try: [
      'Hover the copy column and press its button.',
      'Flip a Notify switch, rate a row, or open the ⋯ menu: the log shows the action.',
      'Press View in the Meta column.',
    ],
    docs: '4. Every built-in renderer',
    files: ['RenderersDemo'],
  },
  {
    id: 'filtering',
    title: 'Sorting and filtering',
    section: 'Data',
    summary:
      'Sorting by one column or several (Shift-click), typed column filters in header popovers, a filter row with shorthand (> 100, 50..200), a value list with counts, and an accent-insensitive quick search.',
    try: [
      'Type > 300 in the Stake filter cell.',
      'Open the funnel on City and tick a few values.',
      'Search “nis”: it matches Niš.',
      'Click a header to sort by it alone; click again to reverse.',
      'Shift-click Placed: it becomes sort key 3. Shift-click again to reverse it, a third time to drop it.',
    ],
    docs: '13. Filtering',
    files: ['FilteringDemo'],
  },
  {
    id: 'server',
    title: 'Server data',
    section: 'Data',
    summary:
      'Give the grid an async dataSource: it asks for every sort, filter, search and page change, cancels superseded requests, and shows loading and errors with a Retry.',
    try: [
      'Click a header twice quickly: the first request is aborted.',
      'Press “Fail next request”, then sort: the rows stay, a notice says they’re out of date, Retry loads them.',
    ],
    docs: '14. Server data',
    files: ['ServerDataDemo'],
  },
  {
    id: 'pagination',
    title: 'Pagination',
    section: 'Data',
    summary:
      'The pagination prop pages the sorted and filtered rows (or asks the dataSource for pages). The pager is also a standalone component.',
    try: ['Change the page size.', 'Sort or filter: the grid jumps back to page 1.'],
    docs: '15. Pagination (server-style)',
    files: ['PaginationDemo'],
  },
  {
    id: 'live',
    title: 'Live updates',
    section: 'Data',
    summary:
      'patchRows replaces only the rows that changed, so only their cells re-render; flash briefly tints a changed value green when it rises and red when it falls.',
    try: ['Watch the stakes move.', 'Pause the feed, then sort by Stake.'],
    docs: 'Partial updates (enrichment, live data)',
    files: ['LiveDemo'],
  },
  {
    id: 'selection',
    title: 'Selection and batch actions',
    section: 'Rows',
    summary:
      'A checkbox column with select-all, shift-click ranges, a toolbar slot for batch actions, and pruning of keys whose rows are gone.',
    try: [
      'Tick a row, then shift-click another: the rows between are selected.',
      'Delete the selection.',
      'Void bets cannot be selected.',
    ],
    docs: '8. Selection',
    files: ['SelectionDemo'],
  },
  {
    id: 'editing',
    title: 'Inline editing',
    section: 'Rows',
    summary:
      'Edit cells in place: text, numbers, dates, a select and checkboxes, chosen from the column’s renderer. Validation keeps a bad value in the editor; an async save shows its progress and keeps the editor open if the server refuses.',
    try: [
      'Double-click a player, type a new name, press Enter.',
      'Click a cell and just start typing; Tab moves on to the next editable cell, Esc cancels.',
      'Set a stake over 10,000: the server refuses and the editor stays open with the reason.',
      'Double-click KYC: it flips at once. Void bets keep their status.',
      'Press Ctrl+Z (⌘Z) on the grid to undo the last change, Ctrl+Y to redo it, or use the buttons.',
    ],
    docs: '28. Inline editing',
    files: ['EditingDemo'],
  },
  {
    id: 'range',
    title: 'Cell ranges: copy, paste, find',
    section: 'Rows',
    summary:
      'Select a block of cells as in a spreadsheet: drag, Shift+click or Shift+arrows. Ctrl+C copies it as rows and columns that paste into Excel or Sheets, Ctrl+V pastes a block from them into the editable cells, and the status bar adds it up. Row selection still works alongside.',
    try: [
      'Drag from a Stake cell down a few rows: the status bar shows the count, sum and average.',
      'Shift+click another cell to stretch the block, then press Ctrl+C (⌘C) and paste it into a spreadsheet.',
      'Click a cell and use Shift+arrow keys; Ctrl+A (⌘A) takes every cell, Esc clears.',
      'Copy cells from Excel or Sheets (or from the grid), click a Player cell and press Ctrl+V (⌘V): numbers, dates and statuses are read as such, and the # and Δ odds columns are left alone.',
      'Select ten Stake cells and paste a single number: it fills all of them. Ctrl+Z (⌘Z) undoes the whole paste.',
      'Drag the small square on a selection’s corner down a few rows: values repeat, two numbers go on in their step, dates day by day. Ctrl+D (⌘D) fills a selection down from its top row.',
      'Click a cell and press Ctrl+F (⌘F) to find, Ctrl+H (⌘H) to replace: Enter goes to the next match, even in rows not drawn yet; Replace all is one Ctrl+Z.',
      'Select a few cells and press Delete to clear them, or Ctrl+X (⌘X) and Ctrl+V (⌘V) elsewhere to move them; Ctrl+Z (⌘Z) undoes either.',
      'Turn on 2,000 rows and drag past the bottom edge, or Shift+click far below: rows that aren’t drawn still count.',
    ],
    docs: '29. Cell-range selection',
    files: ['RangeDemo'],
  },
  {
    id: 'spreadsheet',
    title: 'Spreadsheet mode',
    section: 'Rows',
    summary:
      'Inline editing, cell ranges, undo, the fill handle, find and replace, totals and the status bar together: a small budget you edit like a sheet, with a Total column worked out from the months and an Excel download.',
    try: [
      'Click a month cell and type a number, then Enter: the row Total and the column total follow.',
      'Copy a block from Excel or Sheets and press Ctrl+V (⌘V) on a cell: the figures land as numbers.',
      'Select Jan for a few lines and drag the small corner square across to Jun: the figures repeat.',
      'Press Ctrl+H (⌘H), replace “Sales” with “Revenue” in every cell, then press Ctrl+Z (⌘Z) once to put it back.',
      'Select a block and press Delete, or Ctrl+X (⌘X) then Ctrl+V (⌘V) to move it; the status bar adds up whatever is selected.',
      'Add a line, fill in its months, then download the sheet for Excel.',
    ],
    docs: '29. Cell-range selection',
    files: ['SpreadsheetDemo'],
  },
  {
    id: 'grouping',
    title: 'Row grouping',
    section: 'Rows',
    summary:
      'Group by one or more columns into collapsible rows with the value, the count and each column’s aggregate. Groups follow filters and sorting.',
    try: [
      'Group by Status, then add City.',
      'Right-click the Placed header: Group by (it groups by month).',
      'Tick a group’s checkbox to select its rows.',
    ],
    docs: '24. Row grouping',
    files: ['GroupingDemo'],
  },
  {
    id: 'server-grouping',
    title: 'Grouping on the server',
    section: 'Rows',
    summary:
      'With server data, the groups come from the server, with their counts and sums across all the data. Each group loads its contents when it opens, and a group can be selected without loading its rows.',
    try: [
      'Open a status, then a city: watch the requests below.',
      'Tick a group: it is selected by query; the rows inside show ticked and locked.',
      'Right-click a header to group by another column.',
    ],
    docs: 'Groups from the server',
    files: ['ServerGroupingDemo'],
  },
  {
    id: 'totals',
    title: 'Totals and pinned rows',
    section: 'Rows',
    summary:
      'A sticky totals row from each column’s aggregate, and rows pinned above or below the body. Both share the grid’s columns.',
    try: ['Right-click a row and pin it to the top.', 'Filter the City column: the totals follow.'],
    docs: '23. Pinned rows and totals',
    files: ['TotalsDemo'],
  },
  {
    id: 'subgrids',
    title: 'Sub-grids',
    section: 'Rows',
    summary:
      'Nested rows in real CSS subgrid, so children line up with their parents. Children can come with the data or load on first expand.',
    try: [
      'Tick Football: its markets are selected with it.',
      'Expand “Broken” in the second grid: it fails once, then Retry.',
    ],
    docs: '9. Sub-grids (nested rows)',
    files: ['SubGridsDemo'],
  },
  {
    id: 'detail',
    title: 'Detail rows',
    section: 'Rows',
    summary: 'A detail slot under any row: a form, a chart, or another grid with its own columns.',
    try: ['Expand a bet to see its legs.'],
    docs: '10. Detail rows',
    files: ['DetailDemo'],
  },
  {
    id: 'virtual',
    title: 'Virtual scrolling',
    section: 'Rows',
    summary:
      'Only the rows in view render. 100,000 rows sort, scroll and jump instantly, in the same CSS grid layout. With virtual-columns, only the columns in view render too.',
    try: [
      'Scroll fast.',
      'Jump to a row.',
      'Sort by Stake.',
      'Tick “60 more columns” and scroll sideways: the # column stays pinned and only the cells in view are in the DOM.',
      'Click a cell, then press End and Home: the keys reach columns that weren’t rendered yet.',
    ],
    docs: '16. Virtual scrolling',
    files: ['VirtualDemo'],
  },
  {
    id: 'columns',
    title: 'Column layout',
    section: 'Columns',
    summary:
      'Pinned columns, drag-to-reorder, resizing, hiding, grouped headers, and a layout saved in localStorage.',
    try: [
      'Scroll sideways: # and Player stay left, Open stays right.',
      'Drag a header to move it; drag its right edge to resize.',
      'Reload the page: the layout is kept.',
      'On a phone, the pinned columns scroll with the rest.',
    ],
    docs: '11. Column state: order, visibility, pinning, persistence',
    files: ['ColumnsDemo'],
  },
  {
    id: 'menus',
    title: 'Context menus',
    section: 'Columns',
    summary:
      'A built-in header menu (sort, filter, pin, move, hide) you can extend, and your own menu for body cells. They open on right-click, the ContextMenu key or a long press.',
    try: ['Right-click a cell.', 'Right-click a header.', 'Open a row’s ⋯ menu.'],
    docs: '12. Context menus',
    files: ['MenusDemo'],
  },
  {
    id: 'export',
    title: 'Export and copy',
    section: 'Output',
    summary:
      'Download the filtered, sorted rows as CSV or as an Excel file with real numbers and dates, print them with the header on every page, or copy rows as tab-separated text that pastes into a spreadsheet as cells.',
    try: [
      'Select a few rows and press Ctrl/⌘+C, then paste into a spreadsheet.',
      'Filter, then Download CSV or Excel: only the matching rows are exported.',
      'Press Print: every matching row, the header on each page.',
    ],
    docs: '25. Export and copy',
    files: ['ExportDemo'],
  },
  {
    id: 'status-bar',
    title: 'Status bar',
    section: 'Output',
    summary:
      'Row, selection and filter counts under the grid, and like a spreadsheet, the sum and average of chosen columns over the selected rows.',
    try: [
      'Shift-click a range of rows: the sums follow.',
      'Filter the City column: “N of 300 rows”, then Clear.',
      'Search for a player.',
    ],
    docs: '26. Status bar',
    files: ['StatusBarDemo'],
  },
  {
    id: 'configuration',
    title: 'Text and parts',
    section: 'Look',
    summary:
      'Every built-in text can be replaced: a ready-made language pack (German, French, Spanish, Serbian), your own translation or wording. Every part a feature adds can be turned off or replaced with your own: app-wide or per grid.',
    try: [
      'Switch the language, then right-click a header: menus, filters, pager, status bar and money all follow.',
      'Untick “Header drag”: headers no longer drag (the header menu still moves columns).',
      'Untick “Filter funnels”: the filter row still filters.',
    ],
    docs: '27. Text and parts',
    files: ['ConfigDemo'],
  },
  {
    id: 'theming',
    title: 'Theming',
    section: 'Look',
    summary:
      'Plain CSS variables in a cascade layer: set a few tokens and the grid follows, light and dark, with no !important.',
    try: [
      'Pick an accent colour and a radius.',
      'Change the density.',
      'Toggle dark mode at the top.',
    ],
    docs: '19. Theming',
    files: ['ThemingDemo'],
  },
  {
    id: 'custom',
    title: 'Your own cells',
    section: 'Look',
    summary:
      'A slot for a one-off cell, or a renderer component you pass to a column and reuse across grids.',
    try: ['Sort by Progress: a renderer can define how its values sort.'],
    docs: '20. Writing a cell renderer add-on',
    files: ['CustomDemo', 'ProgressCell'],
  },
]

const demos = import.meta.glob<Component>(['./demos/*.vue', '!./demos/HeroDemo.vue'], {
  import: 'default',
})
const sources = import.meta.glob<DemoSource>('./demos/*.vue', {
  query: '?source&raw',
  import: 'default',
})

/** A demo's component, loaded on demand. */
export const loadDemo = (file: string) => demos[`./demos/${file}.vue`]!()

/** A demo file's highlighted source, loaded on demand. */
export const loadSource = (file: string) => sources[`./demos/${file}.vue`]!()

/** GitHub's anchor for a markdown heading. */
export function docsUrl(heading: string) {
  const slug = heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')
  return `${REPO}/blob/main/docs/examples.md#${slug}`
}

export const REPO = 'https://github.com/eboye/eboye-vue-grid'
export const NPM = 'https://www.npmjs.com/package/@nocopypaste/vue-grid'
