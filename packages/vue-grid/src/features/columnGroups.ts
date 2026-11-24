import VGridGroupRow from '../components/VGridGroupRow.vue'
import type { ColumnGroupsFeature } from '../types'

/**
 * Grouped column headers: give columns a `group` and adjacent visible columns of the same group get
 * one header cell spanning them, in a sticky row above the column headers. Groups follow
 * reordering, hiding and pinning (a pin boundary splits a group). Without it, `group` is ignored.
 */
export const columnGroupsFeature: ColumnGroupsFeature = {
  feature: 'columnGroups',
  GroupRow: VGridGroupRow,
}
