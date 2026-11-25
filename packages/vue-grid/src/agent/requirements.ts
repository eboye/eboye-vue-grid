/**
 * Which feature each grid prop and column option needs (without it the option does nothing). The
 * one fact about the API the types don't carry: the agent API reference (`api.json`), the JSON
 * Schema and `validateGridConfig()` all read it from here.
 */
export type FeatureId =
  | 'sorting'
  | 'filtering'
  | 'serverData'
  | 'pagination'
  | 'selection'
  | 'subGrids'
  | 'menus'
  | 'columnReorder'
  | 'columnPinning'
  | 'virtualScrolling'
  | 'columnVisibility'
  | 'keyboardNavigation'
  | 'columnResizing'
  | 'columnGroups'
  | 'rowPinning'
  | 'aggregation'
  | 'rowGrouping'
  | 'export'
  | 'statusBar'
  | 'serverGrouping'
  | 'editing'
  | 'rangeSelection'

/** Grid props (and `v-model`s) that need a feature. */
export const propFeatures: Readonly<Record<string, FeatureId>> = {
  dataSource: 'serverData',
  pagination: 'pagination',
  page: 'pagination',
  pageSize: 'pagination',
  selectable: 'selection',
  selected: 'selection',
  pruneSelection: 'selection',
  selectAllMatching: 'selection',
  selectionMode: 'selection',
  pinnedMaxShare: 'columnPinning',
  isRowSelectable: 'selection',
  subRows: 'subGrids',
  loadSubRows: 'subGrids',
  hasSubRows: 'subGrids',
  virtual: 'virtualScrolling',
  contextMenu: 'menus',
  headerMenu: 'menus',
  filters: 'filtering',
  filterMode: 'filtering',
  filterRow: 'filtering',
  filterStorage: 'filtering',
  noMatchText: 'filtering',
  pinnedRows: 'rowPinning',
  pinnedTopRows: 'rowPinning',
  pinnedBottomRows: 'rowPinning',
  totals: 'aggregation',
  totalsLabel: 'aggregation',
  aggregates: 'aggregation',
  groupBy: 'rowGrouping',
  groupsExpanded: 'rowGrouping',
  selectedGroups: 'serverGrouping',
  multiSort: 'sorting',
  sorts: 'sorting',
  statusBar: 'statusBar',
  saveCell: 'editing',
  undoLimit: 'editing',
  rangeSelection: 'rangeSelection',
  range: 'rangeSelection',
}

/** Column options that need a feature. */
export const columnFeatures: Readonly<Record<string, FeatureId>> = {
  sortable: 'sorting',
  sortValue: 'sorting',
  sortFn: 'sorting',
  filterable: 'filtering',
  filter: 'filtering',
  filterValue: 'filtering',
  filterFn: 'filtering',
  filterComponent: 'filtering',
  searchable: 'filtering',
  pinned: 'columnPinning',
  pinnable: 'columnPinning',
  hidden: 'columnVisibility',
  hideable: 'columnVisibility',
  reorderable: 'columnReorder',
  resizable: 'columnResizing',
  maxWidth: 'columnResizing',
  group: 'columnGroups',
  aggregate: 'aggregation',
  groupable: 'rowGrouping',
  groupValue: 'rowGrouping',
  exportValue: 'export',
  exportable: 'export',
  editable: 'editing',
  editor: 'editing',
  editorOptions: 'editing',
  validate: 'editing',
}

/**
 * Options whose default is "on" and that only opt *out*: setting them without the feature changes
 * nothing worth a warning (`pinnable: false` on a grid without pinning is fine).
 */
export const optOuts: ReadonlySet<string> = new Set([
  'pinnable',
  'hideable',
  'reorderable',
  'resizable',
  'searchable',
  'headerMenu',
  'exportable',
  'pinnedMaxShare',
])

/** The export name of a feature: `sorting` → `sortingFeature`. */
export const featureExport = (id: FeatureId) => `${id}Feature`
