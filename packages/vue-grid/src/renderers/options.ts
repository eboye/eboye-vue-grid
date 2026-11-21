import type { Component } from 'vue'
import type { MenuItem, MenuTone } from '../types'

export type Tone = MenuTone

// `any` so option callbacks can annotate their own value/row types: (v: string, row: Order) => ...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowFn<R> = (value: any, row: any) => R

export interface TextOptions {
  /** Single line with ellipsis (full text in a tooltip). */
  ellipsis?: boolean
  /** Clamp to N lines. */
  lines?: number
  maxWidth?: string
  /** `true` = value as tooltip; a function computes it. */
  tooltip?: boolean | RowFn<string | undefined>
  placeholder?: string
  tone?: Tone | RowFn<Tone | undefined>
}

export interface ToggleTextOptions extends Pick<TextOptions, 'placeholder'> {
  /** When true, the text is a button that emits action `toggle`. */
  clickable?: boolean | RowFn<boolean>
  highlighted?: boolean | RowFn<boolean>
}

export interface NumberOptions {
  format?: Intl.NumberFormatOptions
  placeholder?: string
}

export interface CurrencyOptions extends NumberOptions {
  /** ISO 4217 code, or derived from the row. Defaults to the grid context currency. */
  currency?: string | RowFn<string | undefined>
}

export interface ChangeOptions extends NumberOptions {
  /** Defaults to the sign of a numeric value. */
  direction?: RowFn<'up' | 'down' | 'equal' | undefined>
  /** Format as currency (`true` = context currency). */
  currency?: boolean | string
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
}

export interface StatusOptions {
  tone?: Tone | Record<string, Tone> | RowFn<Tone | undefined>
  label?: RowFn<string>
  dot?: boolean
}

export interface LinkOptions {
  href?: RowFn<string | undefined>
  label?: RowFn<string>
  target?: '_self' | '_blank'
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
}

/** Resolves an option that may be a constant or a `(value, row) => …` function. */
export function resolveOption<R>(opt: R | RowFn<R> | undefined, value: unknown, row: unknown): R | undefined {
  return typeof opt === 'function' ? (opt as RowFn<R>)(value, row) : opt
}
