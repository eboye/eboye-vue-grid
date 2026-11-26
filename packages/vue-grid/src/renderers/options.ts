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
  /** What the badge shows, e.g. `A`. */
  text: string
  /** Its colour (`success`, `danger`, …); default `neutral`. */
  tone?: Tone
  /** Accessible / hover text. */
  title?: string
}

/** One line of a hover card. */
export interface HoverCardLine {
  /** The line's text. */
  text: string
  /** Shown before the text, muted, e.g. `IBAN`. */
  label?: string
  /** What its copy button copies (default: `text`); `false`: no button on this line. */
  copy?: string | false
}

/** A text cell's `hoverCard`. */
export interface HoverCardSpec {
  /** Heading, and the card's accessible name (default: the cell text). */
  title?: string
  /** The lines, in order: text, or `{ text, label, copy }`. */
  lines: readonly (string | HoverCardLine)[]
  /** Copy buttons: one per line (`'lines'`), one for every line (`'all'`), or none (default). */
  copy?: 'lines' | 'all'
}

/** Icon shown before a value (e.g. an alert marker). */
export interface IconSpec {
  /** The icon component (any SVG component). */
  icon: Component
  /** Its colour (`success`, `danger`, …). */
  tone?: Tone
  /** Accessible label; without one the icon is decorative. */
  label?: string
}

/** Any vue-router location (`'/path'` or `{ name, params, query }`); kept loose so vue-router stays optional. */
export type RouteTarget = string | Record<string, unknown>

export type ButtonVariant = 'outline' | 'solid' | 'ghost'

export interface TextOptions {
  /** Single line with ellipsis (the full text as a tooltip while it is cut off). */
  ellipsis?: boolean
  /** Clamp to N lines (the full text as a tooltip while it is cut off). */
  lines?: number
  /** CSS max width of the text, e.g. `'16rem'`: longer text wraps or, with `ellipsis`, is cut. */
  maxWidth?: string
  /** Keep line breaks in the value (`white-space: pre-line`). */
  preserveNewlines?: boolean
  /**
   * The full text as a tooltip: `'always'` (or `true`), or `'overflow'` only while it is cut off
   * (the default with `ellipsis` / `lines`); `false` = none. A function returns its own text, which
   * is also read out as the cell text's description.
   */
  tooltip?: boolean | 'always' | 'overflow' | RowFn<string | readonly string[] | undefined>
  /**
   * A hover card instead of a tooltip: lines (and copy buttons) in a small popup that opens on
   * hover, or on click / Enter, which also moves focus into it. `(value, row) => ({ title, lines,
   * copy })`, or just the lines. Copy buttons emit `copy` with the copied text, like `copyable`.
   */
  hoverCard?: RowFn<HoverCardSpec | readonly (string | HoverCardLine)[] | null | undefined>
  /** Shown when the value is empty. */
  placeholder?: string
  /** Colour of the text (`success`, `danger`, `warning`, `info`, `neutral`, `accent`), or `(value, row) => tone`. */
  tone?: RowOption<Tone | undefined>
  /** `text` (default) colours the text; `fill` colours the badge-like background. */
  toneMode?: 'text' | 'fill'
  /** Bold text, for every row or `(value, row) => boolean`. */
  bold?: RowOption<boolean>
  /** Muted text after the value, e.g. a half-time score: `2:1 (1:0)`. */
  secondary?: RowFn<string | null | undefined>
  /** Badge before (default) or after the value. */
  badge?: RowFn<BadgeSpec | string | null | undefined>
  /** Where `badge` goes: `start` (default, before the value) or `end`. */
  badgePosition?: 'start' | 'end'
  /** Icon before the value, e.g. `{ icon: BellIcon, tone: 'warning', label: 'Notify' }`. */
  icon?: RowFn<IconSpec | null | undefined>
  /** Adds a copy-to-clipboard button, for every row or `(value, row) => boolean`; emits `copy` with the copied text. */
  copyable?: RowOption<boolean>
  /** What gets copied (default: the displayed text). */
  copyValue?: RowFn<string>
}

export interface ToggleTextOptions extends Pick<TextOptions, 'placeholder'> {
  /** When true, the text is a button that emits action `toggle`. */
  clickable?: boolean | RowFn<boolean>
  /** Shown as switched on (highlighted, `aria-pressed`), e.g. `(v, row) => row.starred`. */
  highlighted?: boolean | RowFn<boolean>
}

export interface NumberOptions {
  /** `Intl.NumberFormat` options, e.g. `{ maximumFractionDigits: 0 }` or `{ style: 'percent' }`. */
  format?: Intl.NumberFormatOptions
  /** Shown when the value is empty. */
  placeholder?: string
  /** Renders the number as a link-style button that emits `click` (drill-down). */
  clickable?: RowOption<boolean>
}

export interface SignedNumberOptions extends NumberOptions {
  /** Always show the sign (`+3`, `−2`). Default `true` for `signed-number`; `false` formats like `number`. */
  signed?: boolean
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
  /** `Intl.DateTimeFormat` options, e.g. `{ dateStyle: 'medium' }`. */
  format?: Intl.DateTimeFormatOptions
  /** Shown when the value is empty. */
  placeholder?: string
}

export interface DateTimeOptions extends DateOptions {
  /** Show milliseconds in the time (`12:30:05.123`). */
  milliseconds?: boolean
  /** Date and time on two lines (default true). */
  twoLines?: boolean
}

export interface BooleanOptions {
  /** Text for `true` (and its accessible name in icon mode). Default “Yes”. */
  trueLabel?: string
  /** Text for `false`. Default “No”. */
  falseLabel?: string
  /** Text for `null` / `undefined`. Default: nothing. */
  nullLabel?: string
  /** `text` (default): labels. `icon`: a check for true, nothing (or a cross) for false. */
  display?: 'text' | 'icon'
  /** In icon mode, show a cross for false (default: nothing). */
  falseIcon?: boolean
}

export interface StatusOptions {
  /** Badge colour: one tone, a value → tone map (`{ Paid: 'success', Open: 'info' }`), or `(value, row) => tone`. Default `neutral`. */
  tone?: ToneOption
  /** Label from a function, or a value → label map. */
  label?: RowFn<string> | Record<string, string>
  /** A coloured dot before the label. Default `true`; `false` hides it. */
  dot?: boolean
  /** `soft` (default, tinted), `solid` (filled) or `outline`. */
  variant?: 'soft' | 'solid' | 'outline'
  /** Shown when the value is empty. */
  placeholder?: string
  /** Badge becomes a button that emits `click`. */
  clickable?: RowOption<boolean>
}

export interface LinkOptions {
  /** The URL, from the value and row (default: the value). Only http(s), mailto and tel are linked; wins over `to`. */
  href?: RowFn<string | undefined>
  /** Router location; rendered with `<RouterLink>` when vue-router is installed, else as an href. */
  to?: RowFn<RouteTarget | null | undefined>
  /** Link text (default: the value). */
  label?: RowFn<string>
  /** `_blank` opens a new tab (with `rel="noopener noreferrer"`). */
  target?: '_self' | '_blank'
  /** Hover text of the link. */
  tooltip?: RowFn<string | undefined>
}

export interface IconOptions {
  /** Static icon component. */
  icon?: Component
  /** Picks the icon per row (wins over `icon`). Kept separate because functional components are functions too. */
  iconFor?: RowFn<Component | undefined>
  /** Show the icon for this row (default: always). A hidden icon keeps its space, so columns stay aligned. */
  show?: RowFn<boolean>
  /** Accessible name and tooltip. Without one the icon is decorative. */
  label?: string | RowFn<string>
  /** Icon colour, or `(value, row) => tone`. */
  tone?: Tone | RowFn<Tone | undefined>
}

export interface JsonOptions {
  /** Text of the button that opens the JSON in a dialog. Default “View”. */
  label?: string
  /** Heading of the dialog (default: the column header). */
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
  /** Text of the `collapsed` toggle. Default “More info”. */
  toggleLabel?: string
  /** Shown for null / empty values. Default: nothing. */
  emptyText?: string
}

export interface ActionsMenuOptions {
  /** Menu items (actions and `{ separator: true }`), or a function of the row. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see RowFn
  actions?: MenuItem[] | ((row: any) => MenuItem[])
  /** Accessible name of the `⋯` button and the menu. Default “Actions”. */
  label?: string
}

export interface ActionButtonOptions {
  /** Button text (default: the value), or `(value, row) => text`. */
  label?: string | RowFn<string>
  /** Action name emitted on click. Default `click`. */
  action?: string
  /** An icon component before the label. */
  icon?: Component
  /** Button colour, e.g. `danger` for a delete button. */
  tone?: Tone
  /** Disable the button for some rows: `(value, row) => boolean`. */
  disabled?: RowFn<boolean>
  /** Hide the button for some rows. */
  visible?: RowFn<boolean>
  /** `outline` (default), `solid` or `ghost`. */
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
  /** `_blank` opens linked lines in a new tab. */
  target?: '_self' | '_blank'
  /** Shown when the value is empty. */
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
  /** Shown when the value is empty. */
  placeholder?: string
}

export interface ChipOptions {
  /** Any CSS colour (e.g. from an API); text colour is picked for contrast. */
  color?: RowOption<string | null | undefined>
  /** Named tone instead of a raw colour. */
  tone?: ToneOption
  /** Chip text (default: the value, or its `label` / `name` / `text` field). A tone map is keyed by this label. */
  label?: RowFn<string>
  /** Hover text (default: the value's `description` field, if any). */
  tooltip?: RowFn<string | null | undefined>
  /** `square` (default), `circle` or `pill`. */
  shape?: 'square' | 'circle' | 'pill'
  /** Box size for square/circle. Default `1.75rem`. */
  size?: string
  /** Shown when the value is empty. */
  placeholder?: string
}

export interface CheckboxOptions {
  /** Default: the value is truthy. */
  checked?: RowFn<boolean>
  /** Disabled for every row, or `(value, row) => boolean`. */
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
  /** Shown when the value is empty. */
  placeholder?: string
  /** Accessible name of the button. Default “Edit”. */
  label?: string
  /** Disables the edit button, for every row or `(value, row) => boolean`. */
  disabled?: RowOption<boolean>
  /** Bold text. */
  bold?: boolean
}

export interface ImageOptions {
  /** Default: the value. */
  src?: RowFn<string | null | undefined>
  /** Prefixed to relative paths (e.g. a CDN). */
  baseUrl?: string
  /** Alternative text (default: none, a decorative image), or `(value, row) => text`. */
  alt?: RowOption<string>
  /** Default `2.5rem`. */
  size?: string
  /** `contain` (default) shows the whole image; `cover` fills the box and crops. */
  fit?: 'contain' | 'cover'
  /** `rounded` (default), `circle` (avatars) or `square`. */
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
  /** The buttons (`{ name, label, tone?, variant?, disabled?, icon?, hidden? }`), or a function of the row. A click emits the button's `name`. */
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
  /** Disabled for every row, or `(value, row) => boolean`. */
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
  /** Badge text (default: the value). */
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
  /** Text of one item, `(item, row) => string` (default: the item, objects as JSON). */
  itemLabel?: RowFn<string>
  /** Items shown before “+N more”. Default 1. */
  max?: number
  /** Shown when the value is empty. */
  placeholder?: string
}

/** Resolves an option that may be a constant or a `(value, row) => …` function. */
export function resolveOption<R>(
  opt: R | RowFn<R> | undefined,
  value: unknown,
  row: unknown,
): R | undefined {
  return typeof opt === 'function' ? (opt as RowFn<R>)(value, row) : opt
}

/** Resolves a {@link ToneOption}. */
export function resolveTone(
  opt: ToneOption | undefined,
  value: unknown,
  row: unknown,
): Tone | undefined {
  if (typeof opt === 'function') return opt(value, row)
  if (opt && typeof opt === 'object') return lookup(opt, value)
  return opt
}

/** Own-key lookup in an app-supplied map, so data like `"constructor"` doesn't hit `Object.prototype`. */
export function lookup<V>(map: Record<string, V>, key: unknown): V | undefined {
  const k = String(key)
  return Object.hasOwn(map, k) ? map[k] : undefined
}

/** A tone name is safe to put in a class (data-driven tones could otherwise add arbitrary classes). */
export function safeTone(tone: unknown): string | undefined {
  return typeof tone === 'string' && /^[a-z][a-z0-9-]*$/i.test(tone) ? tone : undefined
}
