import type { FunctionalComponent, Slot } from 'vue'

/** Renders a slot function owned by another component (the `<VGrid>` user's slots). */
export const RenderSlot: FunctionalComponent<{
  fn: Slot | undefined
  scope?: Record<string, unknown>
}> = (props) => props.fn?.(props.scope ?? {})

RenderSlot.props = ['fn', 'scope']
