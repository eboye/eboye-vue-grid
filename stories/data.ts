import { createColumnHelper } from '@nocopypaste/vue-grid'
import type { Bet, Market } from '../playground/src/data'

// Same deterministic sample data as the playground and the browser tests.
export { loadFolder, makeBets, makeMarkets, rootFolders } from '../playground/src/data'
export type { Bet, Folder, Market } from '../playground/src/data'

export const statusTones = {
  Won: 'success',
  Lost: 'danger',
  Open: 'info',
  Void: 'neutral',
} as const

const bet = createColumnHelper<Bet>()

/** A representative column set used by most grid stories. */
export function betColumns(opts: { sortable?: boolean } = {}) {
  const sortable = opts.sortable ?? false
  return [
    bet({ key: 'id', header: '#', renderer: 'number', width: 'min-content', sortable }),
    bet({
      key: 'player',
      header: 'Player',
      field: 'player.name',
      minWidth: '9rem',
      width: '1.2fr',
      sortable,
    }),
    bet({ key: 'city', header: 'City', field: 'player.city', sortable }),
    bet({
      key: 'status',
      header: 'Status',
      renderer: 'status',
      rendererOptions: { tone: statusTones },
      sortable,
    }),
    bet({ key: 'stake', header: 'Stake', renderer: 'currency', sortable }),
    bet({ key: 'change', header: 'Δ odds', renderer: 'change', sortable }),
    bet({ key: 'placedAt', header: 'Placed', renderer: 'date', sortable }),
  ]
}

const market = createColumnHelper<Market>()

export const marketColumns = [
  market({ key: 'name', header: 'Market', width: 'minmax(14rem, 2fr)', sortable: true }),
  market({ key: 'selections', header: 'Selections', renderer: 'number', sortable: true }),
  market({ key: 'turnover', header: 'Turnover', renderer: 'currency', sortable: true }),
  market({
    key: 'status',
    header: 'Status',
    renderer: 'status',
    rendererOptions: { tone: { Active: 'success', Suspended: 'warning', Closed: 'neutral' } },
  }),
]
