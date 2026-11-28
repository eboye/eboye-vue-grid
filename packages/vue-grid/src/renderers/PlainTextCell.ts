import { h, type FunctionalComponent } from 'vue'
import { tipAttrs } from '../internal/tooltip'
import { stringifyJson } from './format'

/** Default text with no renderer options. Only the cell's value and overflow mode matter. */
export const PlainTextCell: FunctionalComponent<{ value: unknown; ellipsis: boolean }> = ({
  value,
  ellipsis,
}) => {
  const text =
    value == null ? '' : typeof value === 'object' ? stringifyJson(value, 0) : String(value)
  return h(
    'span',
    {
      class: ellipsis ? 'vg-text vg-text-ellipsis' : 'vg-text',
      ...(ellipsis ? tipAttrs(text, { overflow: true }) : undefined),
    },
    text,
  )
}

PlainTextCell.props = ['value', 'ellipsis']
