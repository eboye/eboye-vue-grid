// The same deterministic sample data as the playground, the stories and the browser tests.
export { loadFolder, makeBets, makeMarkets, rootFolders } from '../../playground/src/data'
export type { Bet, Folder, Market } from '../../playground/src/data'

/** Status → badge tone. */
export const statusTones = {
  Won: 'success',
  Lost: 'danger',
  Open: 'info',
  Void: 'neutral',
} as const
