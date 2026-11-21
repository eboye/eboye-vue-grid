import type { Component } from 'vue'
import type { MenuItem, MenuTone } from '../types'

export type Tone = MenuTone

// `any` so option callbacks can annotate their own value/row types: (v: string, row: Order) => ...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowFn<R> = (value: any, row: any) => R

/** A constant, or a function of `(value, row)`. */
export type RowOption<R> = R | RowFn<R>

/** A tone, a value → tone map, or a function. */
export type ToneOption = Tone | Record<string, Tone> | RowFn<Tone | undefined>

/** Small badge shown before or after a value (e.g. a class letter or an “A” flag). */
export interface BadgeSpec {
  text: string
  tone?: Tone
  /** Accessible / hover text. */
  title?: string
}

/** Icon shown before a value (e.g. an alert marker). */
export interface IconSpec {
  icon: Component
  tone?: Tone
  /** Accessible label; without one the icon is decorative. */
  label?: string
}

/** Any vue-router location (`'/path'` or `{ name, params, query }`); kept loose so vue-router stays optional. */
export type RouteTarget = string | Record<string, unknown>

export type ButtonVariant = 'outline' | 'solid' | 'ghost'

export interface TextOptions {
  /** Single line with ellipsis (full text in a tooltip). */
  ellipsis?: boolean
  /** Clamp to N lines. */
  lines?: number
  maxWidth?: string
  /** Keep line breaks in the value (`white-space: pre-line`). */
  preserveNewlines?: boolean
  /** `true` = value as tooltip; a function computes it. */
  tooltip?: boolean | RowFn<string | undefined>
  placeholder?: string
  tone?: RowOption<Tone | undefined>
  /** `text` (default) colours the text; `fill` colours the badge-like background. */
  toneMode?: 'text' | 'fill'
  bold?: RowOption<boolean>
  /** Muted text after the value, e.g. a half-time score: `2:1 (1:0)`. */
  secondary?: RowFn<string | null | undefined>
  /** Badge before (default) or after the value. */
  badge?: RowFn<BadgeSpec | string | null | undefined>
  badgePosition?: 'start' | 'end'
  /** Icon before the value, e.g. `{ icon: BellIcon, tone: 'warning', label: 'Notify' }`. */
  icon?: RowFn<IconSpec | null | undefined>
  /** Adds a copy-to-clipboard button; emits `copy` with the copied text. */
  copyable?: boolean
  /** What gets copied (default: the displayed text). */
  copyValue?: RowFn<string>
}

export interface ToggleTextOptions extends Pick<TextOptions, 'placeholder'> {
  /** When true, the text is a button that emits action `toggle`. */
  clickable?: boolean | RowFn<boolean>
  highlighted?: boolean | RowFn<boolean>
}

export interface NumberOptions {
  format?: Intl.NumberFormatOptions
  placeholder?: string
  /** Renders the number as a link-style button that emits `click` (drill-down). */
  clickable?: RowOption<boolean>
}

export interface CurrencyOptions extends NumberOptions {
  /** ISO 4217 code, or derived from the row. Defaults to the grid context currency. */
  currency?: string | RowFn<string | undefined>
}

export interface ChangeOptions extends NumberOptions {
  /** Defaults to the sign of a numeric value, or `true` / `false` (also as strings) → up / down. */
  direction?: RowFn<'up' | 'down' | 'equal' | undefined>
  /** Format as currency (`true` = context currency). */
  currency?: boolean | string
  /** Only the arrow (the value becomes its accessible label). */
  iconOnly?: boolean
}

export interface DateOptions {
  format?: Intl.DateTimeFormatOptions
  placeholder?: string
}

export interface DateTimeOptions extends DateOptions {
  milliseconds?: boolean
  /** Date and time on two lines (default true). */
  twoLines?: boolean
}

export interface BooleanOptions {
  trueLabel?: string
  falseLabel?: string
  nullLabel?: string
  /** `text` (default): labels. `icon`: a check for true, nothing (or a cross) for false. */
  display?: 'text' | 'icon'
  /** In icon mode, show a cross for false (default: nothing). */
  falseIcon?: boolean
}

export interface StatusOptions {
  tone?: ToneOption
  /** Label from a function, or a value → label map. */
  label?: RowFn<string> | Record<string, string>
  dot?: boolean
  /** `soft` (default, tinted), `solid` (filled) or `outline`. */
  variant?: 'soft' | 'solid' | 'outline'
  /** Shown when the value is empty. */
  placeholder?: string
  /** Badge becomes a button that emits `click`. */
  clickable?: RowOption<boolean>
}

export interface LinkOptions {
  href?: RowFn<string | undefined>
  /** Router location; rendered with `<RouterLink>` when vue-router is installed, else as an href. */
  to?: RowFn<RouteTarget | null | undefined>
  label?: RowFn<string>
  target?: '_self' | '_blank'
  tooltip?: RowFn<string | undefined>
}

export interface IconOptions {
  /** Static icon component. */
  icon?: Component
  /** Picks the icon per row (wins over `icon`). Kept separate because functional components are functions too. */
  iconFor?: RowFn<Component | undefined>
  show?: RowFn<boolean>
  label?: string | RowFn<string>
  tone?: Tone | RowFn<Tone | undefined>
}

export interface JsonOptions {
  label?: string
  dialogTitle?: string | RowFn<string>
}

export interface JsonTreeOptions {
  /** Nodes deeper than this start collapsed. Default 1. */
  collapseAt?: number
  /** Deeper nodes are summarised (“3 items”) instead of expanded. Default unlimited. */
  maxDepth?: number
  /** String values that contain JSON are shown as nested trees. */
  parseNested?: boolean
  /** Starts hidden behind a toggle button (labelled `toggleLabel`, default “More info”). */
  collapsed?: boolean
  toggleLabel?: string
  /** Shown for null / empty values. Default: nothing. */
  emptyText?: string
}

export interface ActionsMenuOptions {
  /** Menu items (actions and `{ separator: true }`), or a function of the row. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see RowFn
  actions?: MenuItem[] | ((row: any) => MenuItem[])
  label?: string
}

export interface ActionButtonOptions {
  label?: string | RowFn<string>
  /** Action name emitted on click. Default `click`. */
  action?: string
  icon?: Component
  tone?: Tone
  disabled?: RowFn<boolean>
  /** Hide the button for some rows. */
  visible?: RowFn<boolean>
  variant?: ButtonVariant
  /** Only the icon; the label becomes its accessible name and tooltip. */
  iconOnly?: boolean
}

// ── New renderers ─────────────────────────────────────────────────────────────────────────

/** One line of a `multi-line` cell. A plain value is a text line. */
export interface LineSpec {
  text: unknown
  href?: string
  /** Router location (see `link`). */
  to?: RouteTarget
  tone?: Tone
  /** Tone as a filled badge instead of coloured text. */
  fill?: boolean
  bold?: boolean
  muted?: boolean
  tooltip?: string
  /** Up / down arrow before the text. */
  trend?: 'up' | 'down'
  /** Line is a button emitting this action name (payload: the line index). */
  action?: string
  badge?: BadgeSpec | string
}

export type LineInput = LineSpec | string | number | null | undefined

export interface MultiLineOptions {
  /** Builds the lines; default: the value itself when it's an array. */
  lines?: RowFn<LineInput[] | null | undefined>
  /** Indexes of lines to show in bold. */
  boldLines?: number[]
  /** Each line on one row with ellipsis (default true). */
  ellipsis?: boolean
  target?: '_self' | '_blank'
  placeholder?: string
}

export interface CopyOptions {
  /** What gets copied (default: the displayed text). */
  copyValue?: RowFn<string>
  /** Only the copy button; the value becomes its tooltip. */
  iconOnly?: boolean
  /** Accessible name of the button. Default “Copy”. */
  label?: string
  /** Shown before the value in the tooltip, e.g. “Serial number”. */
  title?: string
  placeholder?: string
}

export interface ChipOptions {
  /** Any CSS colour (e.g. from an API); text colour is picked for contrast. */
  color?: RowOption<string | null | undefined>
  /** Named tone instead of a raw colour. */
  tone?: ToneOption
  label?: RowFn<string>
  tooltip?: RowFn<string | null | undefined>
  shape?: 'square' | 'circle' | 'pill'
  /** Box size for square/circle. Default `1.75rem`. */
  size?: string
  placeholder?: string
}

export interface CheckboxOptions {
  /** Default: the value is truthy. */
  checked?: RowFn<boolean>
  disabled?: RowOption<boolean>
  /** Tooltip explaining why it's disabled. */
  disabledReason?: RowFn<string | null | undefined>
  /** Accessible name. Default: the column header. */
  label?: RowOption<string>
}

export type SwitchOptions = CheckboxOptions

export interface RadioOptions extends CheckboxOptions {
  /** Radio group name. Default: the column key. */
  name?: string
}

export interface EditOptions {
  /** Text shown next to the edit button (default: the value). */
  format?: RowFn<string>
  placeholder?: string
  /** Accessible name of the button. Default “Edit”. */
  label?: string
  disabled?: RowOption<boolean>
  bold?: boolean
}

export interface ImageOptions {
  /** Default: the value. */
  src?: RowFn<string | null | undefined>
  /** Prefixed to relative paths (e.g. a CDN). */
  baseUrl?: string
  alt?: RowOption<string>
  /** Default `2.5rem`. */
  size?: string
  fit?: 'contain' | 'cover'
  shape?: 'rounded' | 'circle' | 'square'
}

export interface CodeOptions {
  /** `auto` (default): JSON for objects and JSON strings, plain text otherwise. */
  language?: 'auto' | 'json' | 'text'
  /** Clamp to N lines (full text in a tooltip). */
  lines?: number
  /** JSON indent. Default 2. */
  indent?: number
  /** Colour JSON tokens. Default true. */
  highlight?: boolean
}

export interface ButtonSpec {
  /** Emitted as the action name. */
  name: string
  label: string
  tone?: Tone
  variant?: ButtonVariant
  disabled?: boolean
  icon?: Component
  hidden?: boolean
}

export interface ButtonGroupOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see RowFn
  buttons?: ButtonSpec[] | ((row: any) => ButtonSpec[])
}

export interface IconToggleOptions {
  /** Default: the value is truthy. */
  active?: RowFn<boolean>
  /** Default: an outlined star. */
  icon?: Component
  /** Default: a filled star (or `icon`). */
  activeIcon?: Component
  /** Accessible name. Default “Toggle”. */
  label?: RowOption<string>
  /** Tone when active. Default `warning`. */
  activeTone?: Tone
  disabled?: RowOption<boolean>
}

export interface DetailItem {
  label: string
  value?: string
  tone?: Tone
  /** Muted line under the label. */
  detail?: string
  tooltip?: string
}

export interface DetailsOptions {
  /** Summary badge tone, like `status`. */
  tone?: ToneOption
  label?: RowFn<string>
  /** Popover rows. Empty → no info button. */
  items?: RowFn<DetailItem[] | null | undefined>
  /** Popover heading. Default: the column header. */
  title?: RowOption<string>
  /** Accessible name of the info button. Default “Details”. */
  triggerLabel?: string
}

export interface ListOptions {
  /** Default: the value when it's an array. */
  items?: RowFn<unknown[] | null | undefined>
  itemLabel?: RowFn<string>
  /** Items shown before “+N more”. Default 1. */
  max?: number
  placeholder?: string
}

/** Resolves an option that may be a constant or a `(value, row) => …` function. */
export function resolveOption<R>(opt: R | RowFn<R> | undefined, value: unknown, row: unknown): R | undefined {
  return typeof opt === 'function' ? (opt as RowFn<R>)(value, row) : opt
}

/** Resolves a {@link ToneOption}. */
export function resolveTone(opt: ToneOption | undefined, value: unknown, row: unknown): Tone | undefined {
  if (typeof opt === 'function') return opt(value, row)
  if (opt && typeof opt === 'object') return opt[String(value)]
  return opt
}
