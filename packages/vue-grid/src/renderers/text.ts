import { defineCellRenderer } from '../registry/registry'
import type { TextOptions } from './options'
import TextCell from './TextCell.vue'

/** The default renderer — the only one `<VGrid>` bundles; every other renderer is opt-in. */
export const textRenderer = /*#__PURE__*/ defineCellRenderer<TextOptions>({ name: 'text', component: TextCell })
