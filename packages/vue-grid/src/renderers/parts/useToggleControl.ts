import { computed } from 'vue'
import type { CellRendererProps } from '../../types'
import { resolveOption, type CheckboxOptions } from '../options'

/**
 * Shared state for the editable checkbox / switch / radio renderers. They are controlled: the cell shows
 * `checked` from the data and only emits the requested change — the app updates its rows.
 */
export function useToggleControl(props: CellRendererProps<unknown, unknown, CheckboxOptions>) {
  const checked = computed(() =>
    props.options.checked ? !!props.options.checked(props.value, props.row) : !!props.value,
  )
  const disabled = computed(() => !!resolveOption(props.options.disabled, props.value, props.row))
  const reason = computed(() => (disabled.value ? props.options.disabledReason?.(props.value, props.row) || undefined : undefined))
  const label = computed(() => resolveOption(props.options.label, props.value, props.row) ?? props.column.header ?? props.column.key)
  return { checked, disabled, reason, label }
}
