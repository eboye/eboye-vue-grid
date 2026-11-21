import { useDataSource } from '../composables/useDataSource'
import type { ServerDataFeature } from '../types'

/**
 * Server data: the `dataSource` prop. The grid sends sort, filters and page to your function,
 * cancels superseded requests, and shows loading, error and retry states.
 */
export const serverDataFeature: ServerDataFeature = { feature: 'serverData', useDataSource }
