import type { RowKey } from '../types'

/** Sub-grid rows share a root. A separate grid in detail content owns its own elements. */
export function gridElements<E extends Element>(
  root: Element | null | undefined,
  selector: string,
): E[] {
  return Array.from(root?.querySelectorAll<E>(selector) ?? []).filter(
    (el) => el.closest('.vg') === root,
  )
}

export function gridElement<E extends Element>(
  root: Element | null | undefined,
  selector: string,
  within: ParentNode | null | undefined = root,
): E | null {
  for (const el of within?.querySelectorAll<E>(selector) ?? [])
    if (el.closest('.vg') === root) return el
  return null
}

/** A row key emitted in DOM attributes keeps its original number or string type. */
export const domRowKey = (text: string, type: string | null) =>
  type === 'number' ? Number(text) : text

export const rowKeyAttrs = (key: RowKey) =>
  `[data-row-key="${CSS.escape(String(key))}"][data-vg-row-key-type="${typeof key}"]`
