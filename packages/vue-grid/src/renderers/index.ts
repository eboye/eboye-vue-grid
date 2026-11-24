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
import { textRenderer } from './text'
import {
  booleanText,
  changeText,
  chipText,
  currencyText,
  dateText,
  dateTimeText,
  listText,
  numberText,
  statusText,
} from './plainText'
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
  SignedNumberOptions,
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
    'signed-number': SignedNumberOptions
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

export { textRenderer }
/** Text that toggles a highlight when clicked. Emits `toggle` (with `clickable`). */
export const toggleTextRenderer = /*#__PURE__*/ defineCellRenderer<ToggleTextOptions>({
  name: 'toggle-text',
  component: ToggleTextCell,
})
/** Locale-formatted numbers. With `clickable`, a link-style button that emits `click`. */
export const numberRenderer = /*#__PURE__*/ defineCellRenderer<NumberOptions>({
  name: 'number',
  filterType: 'number',
  component: NumberCell,
  align: 'end',
  sortValue: numericSort,
  format: numberText,
})
/** Numbers that always show their sign (+ / −). With `clickable`, emits `click`. */
export const signedNumberRenderer = /*#__PURE__*/ defineCellRenderer<SignedNumberOptions>({
  name: 'signed-number',
  filterType: 'number',
  component: NumberCell,
  defaults: { signed: true },
  align: 'end',
  sortValue: numericSort,
  format: numberText,
})
/** Money in a fixed or per-row currency (default: the grid's `currency`). With `clickable`, emits `click`. */
export const currencyRenderer = /*#__PURE__*/ defineCellRenderer<CurrencyOptions>({
  name: 'currency',
  filterType: 'number',
  component: CurrencyCell,
  align: 'end',
  sortValue: numericSort,
  format: currencyText,
})
/** A rise or fall: the value with an up / down arrow, green or red. */
export const changeRenderer = /*#__PURE__*/ defineCellRenderer<ChangeOptions>({
  name: 'change',
  filterType: 'number',
  component: ChangeCell,
  align: 'end',
  sortValue: numericSort,
  format: changeText,
})
/** A calendar day, in the grid's locale and time zone (date-only strings never shift a day). */
export const dateRenderer = /*#__PURE__*/ defineCellRenderer<DateOptions>({
  name: 'date',
  component: DateCell,
  sortValue: dateSort,
  filterType: 'date',
  format: dateText,
})
/** Date and time, on two lines by default. */
export const dateTimeRenderer = /*#__PURE__*/ defineCellRenderer<DateTimeOptions>({
  name: 'datetime',
  filterType: 'date',
  component: DateTimeCell,
  sortValue: dateSort,
  format: dateTimeText,
})
/** Yes / no as text labels or icons. */
export const booleanRenderer = /*#__PURE__*/ defineCellRenderer<BooleanOptions>({
  name: 'boolean',
  component: BooleanCell,
  filterType: 'boolean',
  format: booleanText,
})
/** A coloured status badge (tone from a map, a function or a constant). With `clickable`, emits `click`. */
export const statusRenderer = /*#__PURE__*/ defineCellRenderer<StatusOptions>({
  name: 'status',
  component: StatusCell,
  filterType: 'set',
  format: statusText,
})
/** A safe link (http(s), mailto, tel only), or a `<RouterLink>` with `to` when vue-router is installed. */
export const linkRenderer = /*#__PURE__*/ defineCellRenderer<LinkOptions>({
  name: 'link',
  component: LinkCell,
})
/** An icon component, fixed or picked per row. */
export const iconRenderer = /*#__PURE__*/ defineCellRenderer<IconOptions>({
  name: 'icon',
  component: IconCell,
  align: 'center',
})
/** A button that opens the value as escaped JSON in a dialog. */
export const jsonRenderer = /*#__PURE__*/ defineCellRenderer<JsonOptions>({
  name: 'json',
  component: JsonCell,
})
/** A collapsible tree of nested data. */
export const jsonTreeRenderer = /*#__PURE__*/ defineCellRenderer<JsonTreeOptions>({
  name: 'json-tree',
  component: JsonTreeCell,
})
/** A `⋯` button with a keyboard-friendly menu. Emits the chosen item's `name`. */
export const actionsMenuRenderer = /*#__PURE__*/ defineCellRenderer<ActionsMenuOptions>({
  name: 'actions-menu',
  component: ActionsMenuCell,
  align: 'center',
})
/** One button per row. Emits its `action` (default `click`). */
export const actionButtonRenderer = /*#__PURE__*/ defineCellRenderer<ActionButtonOptions>({
  name: 'action-button',
  component: ActionButtonCell,
})
/** Stacked lines, each with its own style, link, badge, trend or action. */
export const multiLineRenderer = /*#__PURE__*/ defineCellRenderer<MultiLineOptions>({
  name: 'multi-line',
  component: MultiLineCell,
})
/** A value with a copy-to-clipboard button. Emits `copy` / `copy-error`. */
export const copyRenderer = /*#__PURE__*/ defineCellRenderer<CopyOptions>({
  name: 'copy',
  component: CopyCell,
})
/** A chip in any colour (readable text picked by contrast), square, circle or pill. */
export const chipRenderer = /*#__PURE__*/ defineCellRenderer<ChipOptions>({
  name: 'chip',
  filterType: 'set',
  component: ChipCell,
  sortValue: (value) =>
    value !== null && typeof value === 'object'
      ? ((value as Record<string, unknown>).label ??
        (value as Record<string, unknown>).name ??
        null)
      : value,
  format: chipText,
})
const booleanSort = (value: unknown) =>
  value === null || value === undefined ? null : value ? 1 : 0
/** A controlled checkbox, with a tooltip when disabled. Emits `change` with the requested state. */
export const checkboxRenderer = /*#__PURE__*/ defineCellRenderer<CheckboxOptions>({
  name: 'checkbox',
  filterType: 'boolean',
  component: CheckboxCell,
  align: 'center',
  sortValue: booleanSort,
})
/** A controlled on / off switch. Emits `change` with the requested state. */
export const switchRenderer = /*#__PURE__*/ defineCellRenderer<SwitchOptions>({
  name: 'switch',
  filterType: 'boolean',
  component: SwitchCell,
  align: 'center',
  sortValue: booleanSort,
})
/** One selected row across the column (controlled). Emits `select`. */
export const radioRenderer = /*#__PURE__*/ defineCellRenderer<RadioOptions>({
  name: 'radio',
  filterType: 'boolean',
  component: RadioCell,
  align: 'center',
  sortValue: booleanSort,
})
/** A value with an edit button, for opening your own editor. Emits `edit`. */
export const editRenderer = /*#__PURE__*/ defineCellRenderer<EditOptions>({
  name: 'edit',
  component: EditCell,
})
/** A thumbnail, with a placeholder when empty or broken. */
export const imageRenderer = /*#__PURE__*/ defineCellRenderer<ImageOptions>({
  name: 'image',
  component: ImageCell,
  align: 'center',
})
/** Monospaced code, with JSON pretty-printing and highlighting. */
export const codeRenderer = /*#__PURE__*/ defineCellRenderer<CodeOptions>({
  name: 'code',
  component: CodeCell,
})
/** Several buttons, fixed or per row. Emits the clicked button's `name`. */
export const buttonGroupRenderer = /*#__PURE__*/ defineCellRenderer<ButtonGroupOptions>({
  name: 'button-group',
  component: ButtonGroupCell,
})
/** A star / flag style on-off button (controlled). Emits `toggle`. */
export const iconToggleRenderer = /*#__PURE__*/ defineCellRenderer<IconToggleOptions>({
  name: 'icon-toggle',
  filterType: 'boolean',
  component: IconToggleCell,
  align: 'center',
  sortValue: booleanSort,
})
/** A status badge plus an info button with an anchored popover of label / value rows. */
export const detailsRenderer = /*#__PURE__*/ defineCellRenderer<DetailsOptions>({
  name: 'details',
  component: DetailsCell,
})
/** The first items of a list, with a “+N more” toggle. Emits `expand`. */
export const listRenderer = /*#__PURE__*/ defineCellRenderer<ListOptions>({
  name: 'list',
  component: ListCell,
  sortValue: (value) => (Array.isArray(value) ? value.length : null),
  format: listText,
})

/**
 * Every built-in renderer, for apps that want them all by name:
 * `app.use(createVueGrid({ renderers: allRenderers }))`. Importing it bundles all of them — import
 * single renderers (`currencyRenderer`, …) instead to keep the bundle small.
 */
export const allRenderers: CellRendererDefinition[] = [
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
