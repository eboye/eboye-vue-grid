import { defineCellRenderer } from '../registry/registry'
import type { CellRendererDefinition } from '../types'
import ActionButtonCell from './ActionButtonCell.vue'
import ActionsMenuCell from './ActionsMenuCell.vue'
import BooleanCell from './BooleanCell.vue'
import ChangeCell from './ChangeCell.vue'
import CurrencyCell from './CurrencyCell.vue'
import DateCell from './DateCell.vue'
import DateTimeCell from './DateTimeCell.vue'
import IconCell from './IconCell.vue'
import JsonCell from './JsonCell.vue'
import JsonTreeCell from './JsonTreeCell.vue'
import LinkCell from './LinkCell.vue'
import NumberCell from './NumberCell.vue'
import StatusCell from './StatusCell.vue'
import TextCell from './TextCell.vue'
import ToggleTextCell from './ToggleTextCell.vue'
import { toDate, toNumber } from './format'
import type {
  ActionButtonOptions,
  ActionsMenuOptions,
  BooleanOptions,
  ChangeOptions,
  CurrencyOptions,
  DateOptions,
  DateTimeOptions,
  IconOptions,
  JsonOptions,
  JsonTreeOptions,
  LinkOptions,
  NumberOptions,
  StatusOptions,
  TextOptions,
  ToggleTextOptions,
} from './options'

declare module '../types' {
  interface CellRendererRegistry {
    text: TextOptions
    'toggle-text': ToggleTextOptions
    number: NumberOptions
    'signed-number': NumberOptions
    currency: CurrencyOptions
    change: ChangeOptions
    date: DateOptions
    datetime: DateTimeOptions
    boolean: BooleanOptions
    status: StatusOptions
    link: LinkOptions
    icon: IconOptions
    json: JsonOptions
    'json-tree': JsonTreeOptions
    'actions-menu': ActionsMenuOptions
    'action-button': ActionButtonOptions
  }
}

const numericSort = (value: unknown) => toNumber(value)
const dateSort = (value: unknown) => toDate(value)?.getTime() ?? null

export const textRenderer = defineCellRenderer<TextOptions>({ name: 'text', component: TextCell })
export const toggleTextRenderer = defineCellRenderer<ToggleTextOptions>({ name: 'toggle-text', component: ToggleTextCell })
export const numberRenderer = defineCellRenderer<NumberOptions>({
  name: 'number',
  component: NumberCell,
  align: 'end',
  sortValue: numericSort,
})
export const signedNumberRenderer = defineCellRenderer<NumberOptions & { signed?: boolean }>({
  name: 'signed-number',
  component: NumberCell,
  defaults: { signed: true },
  align: 'end',
  sortValue: numericSort,
})
export const currencyRenderer = defineCellRenderer<CurrencyOptions>({
  name: 'currency',
  component: CurrencyCell,
  align: 'end',
  sortValue: numericSort,
})
export const changeRenderer = defineCellRenderer<ChangeOptions>({
  name: 'change',
  component: ChangeCell,
  align: 'end',
  sortValue: numericSort,
})
export const dateRenderer = defineCellRenderer<DateOptions>({ name: 'date', component: DateCell, sortValue: dateSort })
export const dateTimeRenderer = defineCellRenderer<DateTimeOptions>({
  name: 'datetime',
  component: DateTimeCell,
  sortValue: dateSort,
})
export const booleanRenderer = defineCellRenderer<BooleanOptions>({ name: 'boolean', component: BooleanCell })
export const statusRenderer = defineCellRenderer<StatusOptions>({ name: 'status', component: StatusCell })
export const linkRenderer = defineCellRenderer<LinkOptions>({ name: 'link', component: LinkCell })
export const iconRenderer = defineCellRenderer<IconOptions>({ name: 'icon', component: IconCell, align: 'center' })
export const jsonRenderer = defineCellRenderer<JsonOptions>({ name: 'json', component: JsonCell })
export const jsonTreeRenderer = defineCellRenderer<JsonTreeOptions>({ name: 'json-tree', component: JsonTreeCell })
export const actionsMenuRenderer = defineCellRenderer<ActionsMenuOptions>({
  name: 'actions-menu',
  component: ActionsMenuCell,
  align: 'center',
})
export const actionButtonRenderer = defineCellRenderer<ActionButtonOptions>({
  name: 'action-button',
  component: ActionButtonCell,
})

/** Every built-in renderer; always registered in `<VGrid>` (plugin/local renderers can override by name). */
export const builtinRenderers: CellRendererDefinition[] = [
  textRenderer,
  toggleTextRenderer,
  numberRenderer,
  signedNumberRenderer,
  currencyRenderer,
  changeRenderer,
  dateRenderer,
  dateTimeRenderer,
  booleanRenderer,
  statusRenderer,
  linkRenderer,
  iconRenderer,
  jsonRenderer,
  jsonTreeRenderer,
  actionsMenuRenderer,
  actionButtonRenderer,
]

export {
  ActionButtonCell,
  ActionsMenuCell,
  BooleanCell,
  ChangeCell,
  CurrencyCell,
  DateCell,
  DateTimeCell,
  IconCell,
  JsonCell,
  JsonTreeCell,
  LinkCell,
  NumberCell,
  StatusCell,
  TextCell,
  ToggleTextCell,
}
export * from './format'
export * from './options'
