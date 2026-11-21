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
import ButtonGroupCell from './ButtonGroupCell.vue'
import CheckboxCell from './CheckboxCell.vue'
import ChipCell from './ChipCell.vue'
import CodeCell from './CodeCell.vue'
import CopyCell from './CopyCell.vue'
import DetailsCell from './DetailsCell.vue'
import EditCell from './EditCell.vue'
import IconToggleCell from './IconToggleCell.vue'
import ImageCell from './ImageCell.vue'
import ListCell from './ListCell.vue'
import MultiLineCell from './MultiLineCell.vue'
import RadioCell from './RadioCell.vue'
import SwitchCell from './SwitchCell.vue'
import { toDate, toNumber } from './format'
import type {
  ActionButtonOptions,
  ActionsMenuOptions,
  BooleanOptions,
  ButtonGroupOptions,
  ChangeOptions,
  CheckboxOptions,
  ChipOptions,
  CodeOptions,
  CopyOptions,
  CurrencyOptions,
  DateOptions,
  DateTimeOptions,
  DetailsOptions,
  EditOptions,
  IconOptions,
  IconToggleOptions,
  ImageOptions,
  JsonOptions,
  JsonTreeOptions,
  LinkOptions,
  ListOptions,
  MultiLineOptions,
  NumberOptions,
  RadioOptions,
  StatusOptions,
  SwitchOptions,
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
    'multi-line': MultiLineOptions
    copy: CopyOptions
    chip: ChipOptions
    checkbox: CheckboxOptions
    switch: SwitchOptions
    radio: RadioOptions
    edit: EditOptions
    image: ImageOptions
    code: CodeOptions
    'button-group': ButtonGroupOptions
    'icon-toggle': IconToggleOptions
    details: DetailsOptions
    list: ListOptions
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
export const multiLineRenderer = defineCellRenderer<MultiLineOptions>({ name: 'multi-line', component: MultiLineCell })
export const copyRenderer = defineCellRenderer<CopyOptions>({ name: 'copy', component: CopyCell })
export const chipRenderer = defineCellRenderer<ChipOptions>({
  name: 'chip',
  component: ChipCell,
  sortValue: (value) =>
    value !== null && typeof value === 'object'
      ? ((value as Record<string, unknown>).label ?? (value as Record<string, unknown>).name ?? null)
      : value,
})
const booleanSort = (value: unknown) => (value === null || value === undefined ? null : value ? 1 : 0)
export const checkboxRenderer = defineCellRenderer<CheckboxOptions>({
  name: 'checkbox',
  component: CheckboxCell,
  align: 'center',
  sortValue: booleanSort,
})
export const switchRenderer = defineCellRenderer<SwitchOptions>({
  name: 'switch',
  component: SwitchCell,
  align: 'center',
  sortValue: booleanSort,
})
export const radioRenderer = defineCellRenderer<RadioOptions>({
  name: 'radio',
  component: RadioCell,
  align: 'center',
  sortValue: booleanSort,
})
export const editRenderer = defineCellRenderer<EditOptions>({ name: 'edit', component: EditCell })
export const imageRenderer = defineCellRenderer<ImageOptions>({ name: 'image', component: ImageCell, align: 'center' })
export const codeRenderer = defineCellRenderer<CodeOptions>({ name: 'code', component: CodeCell })
export const buttonGroupRenderer = defineCellRenderer<ButtonGroupOptions>({ name: 'button-group', component: ButtonGroupCell })
export const iconToggleRenderer = defineCellRenderer<IconToggleOptions>({
  name: 'icon-toggle',
  component: IconToggleCell,
  align: 'center',
  sortValue: booleanSort,
})
export const detailsRenderer = defineCellRenderer<DetailsOptions>({ name: 'details', component: DetailsCell })
export const listRenderer = defineCellRenderer<ListOptions>({
  name: 'list',
  component: ListCell,
  sortValue: (value) => (Array.isArray(value) ? value.length : null),
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
  multiLineRenderer,
  copyRenderer,
  chipRenderer,
  checkboxRenderer,
  switchRenderer,
  radioRenderer,
  editRenderer,
  imageRenderer,
  codeRenderer,
  buttonGroupRenderer,
  iconToggleRenderer,
  detailsRenderer,
  listRenderer,
]

export {
  ActionButtonCell,
  ActionsMenuCell,
  BooleanCell,
  ButtonGroupCell,
  ChangeCell,
  CheckboxCell,
  ChipCell,
  CodeCell,
  CopyCell,
  CurrencyCell,
  DateCell,
  DateTimeCell,
  DetailsCell,
  EditCell,
  IconCell,
  IconToggleCell,
  ImageCell,
  JsonCell,
  JsonTreeCell,
  LinkCell,
  ListCell,
  MultiLineCell,
  NumberCell,
  RadioCell,
  StatusCell,
  SwitchCell,
  TextCell,
  ToggleTextCell,
}
export * from './format'
export * from './options'
