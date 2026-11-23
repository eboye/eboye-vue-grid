import { defineCellRenderer } from '../registry/registry'
import type { TextOptions } from './options'
import TextCell from './TextCell.vue'

/** Text, the default renderer (the only one `<VGrid>` bundles): ellipsis, line clamp, tone, badge, icon, secondary text, copy button. */
export const textRenderer = /*#__PURE__*/ defineCellRenderer<TextOptions>({ name: 'text', component: TextCell })
