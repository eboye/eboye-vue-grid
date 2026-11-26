<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { trackAnchor } from '../../internal/anchor'
import { useMessages } from '../../internal/messages'
import type { HoverCardLine, HoverCardSpec } from '../options'
import CopyButton from './CopyButton.vue'

/**
 * A text cell's hover card (`hoverCard`): a small dialog in the top layer (`popover="manual"`),
 * anchored to its trigger with CSS anchor positioning. Mounted when it opens, so this component
 * loads with the first card. Unlike a tooltip it can hold buttons: opened from the keyboard (or by a
 * click) it takes focus. Esc closes it and sends focus back to the trigger; a press outside it and
 * its trigger, or focus leaving both, closes it too. Keys inside it stay out of the grid.
 */
const props = defineProps<{
  id: string
  anchor: string
  spec: HoverCardSpec
  /** The cell text: the card's name when it has no title. */
  label: string
  trigger: HTMLElement | undefined
  /** Move focus into the card (opened by click / Enter). */
  takeFocus: boolean
}>()
const emit = defineEmits<{ close: []; copied: [text: string]; failed: [text: string] }>()
const m = useMessages()

const el = shallowRef<HTMLElement>()
const lines = computed<HoverCardLine[]>(() =>
  props.spec.lines.map((line) => (typeof line === 'string' ? { text: line } : line)),
)
const copyLabel = (what: string) => `${m.value.copy ?? 'Copy'}: ${what}`
const allText = computed(() => lines.value.map((line) => line.copy || line.text).join('\n'))

let stopTracking = () => {}
// A `manual` popover, dismissed here rather than by the browser: a press on its own text must not
// close it (that press opens it for the keyboard), and the browser's close would arrive late.
const inside = (node: EventTarget | null) =>
  node instanceof Node && (!!el.value?.contains(node) || !!props.trigger?.contains(node))
const onPointerDown = (event: PointerEvent) => {
  if (!inside(event.target)) emit('close')
}
const onKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') close(true)
}
onMounted(() => {
  const popover = el.value
  if (!popover?.showPopover) return
  try {
    popover.showPopover()
  } catch {
    return emit('close')
  }
  if (props.trigger) stopTracking = trackAnchor(popover, props.trigger, 'bottom-start')
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown, true)
  if (props.takeFocus) focusIn()
})
// opened on hover, then clicked / Enter: focus moves in now
watch(
  () => props.takeFocus,
  (take) => take && focusIn(),
)
function focusIn() {
  void nextTick(() =>
    (el.value?.querySelector<HTMLElement>('button') ?? el.value)?.focus({ preventScroll: true }),
  )
}

/** Closes the card; Esc (`refocus`) sends focus back to its text when it was in the card. */
function close(refocus: boolean) {
  const active = document.activeElement
  if (refocus && (!active || active === document.body || el.value?.contains(active)))
    props.trigger?.focus({ preventScroll: true })
  emit('close')
}
// Tab past its last button (or Shift+Tab back to the page) closes it, like leaving a dialog
function onFocusOut(event: FocusEvent) {
  if (event.relatedTarget && !inside(event.relatedTarget)) emit('close')
}

onBeforeUnmount(() => {
  stopTracking()
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeyDown, true)
  try {
    if (el.value?.matches(':popover-open')) el.value.hidePopover()
  } catch {
    // already closing
  }
})
</script>

<template>
  <div
    :id="id"
    ref="el"
    popover="manual"
    role="dialog"
    tabindex="-1"
    :aria-label="spec.title || label"
    class="vg-menu vg-hovercard"
    data-placement="bottom-start"
    :style="{ 'position-anchor': anchor }"
    @focusout="onFocusOut"
    @keydown.stop
    @click.stop
  >
    <strong v-if="spec.title" class="vg-hovercard-title">{{ spec.title }}</strong>
    <ul class="vg-hovercard-lines">
      <li v-for="(line, i) in lines" :key="i" class="vg-hovercard-line">
        <span class="vg-hovercard-text">
          <span v-if="line.label" class="vg-hovercard-label">{{ line.label }}</span>
          {{ line.text }}
        </span>
        <CopyButton
          v-if="spec.copy === 'lines' && line.copy !== false && (line.copy || line.text)"
          :text="line.copy || line.text"
          :label="copyLabel(line.label || line.text)"
          @copied="emit('copied', $event)"
          @failed="emit('failed', $event)"
        />
      </li>
    </ul>
    <div v-if="spec.copy === 'all' && allText" class="vg-hovercard-actions">
      <CopyButton
        :text="allText"
        :label="copyLabel(spec.title || label)"
        @copied="emit('copied', $event)"
        @failed="emit('failed', $event)"
      />
    </div>
  </div>
</template>
