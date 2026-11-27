import VGridGroupRow from '../components/VGridGroupRow.vue'
import type { ColumnGroupsFeature } from '../types'

/**
 * Grouped column headers: give columns a `group` or a `groupPath`. Adjacent visible columns with
 * the same group and ancestors share a sticky header cell. Reordering, hiding, and pin boundaries
 * affect the spans.
 */
export const columnGroupsFeature: ColumnGroupsFeature = {
  feature: 'columnGroups',
  GroupRow: VGridGroupRow,
}
