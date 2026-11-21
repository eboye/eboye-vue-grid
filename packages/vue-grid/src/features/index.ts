import type { GridFeature } from '../types'
import { filteringFeature } from './filtering'
import { paginationFeature } from './pagination'
import { serverDataFeature } from './serverData'
import { sortingFeature } from './sorting'

export { filteringFeature, paginationFeature, serverDataFeature, sortingFeature }

/** Every built-in feature, for apps that want them all: `createVueGrid({ features: allFeatures })`. */
export const allFeatures: readonly GridFeature[] = [sortingFeature, filteringFeature, serverDataFeature, paginationFeature]
