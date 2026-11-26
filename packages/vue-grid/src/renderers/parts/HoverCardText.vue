<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useId, type StyleValue } from 'vue'
import type { HoverCardSpec } from '../options'
import HoverCard from './HoverCard.vue'

/**
 * A text cell's text when it has a `hoverCard`: a button that looks like the text (dotted
 * underline) and opens the card on hover (after a delay), or on click / Enter with focus moving
 * into it. Loaded only by cells that have a card, so plain grids don't carry it.
 */
defineProps<{
  spec: HoverCardSpec
  text: string
  secondary?: string | null
  /** The full cell text: the card's name when it has no title. */
  label: string
  textClass: unknown
  textStyle: StyleValue
}>()
const emit = defineEmits<{ copied: [text: string]; failed: [text: string] }>()

const uid = useId()
const cardId = `vg-card-${uid}`
const anchor = `--vg-card-${uid.replace(/[^\w-]/g, '_')}`
const trigger = shallowRef<HTMLElement>()
/** Open, and how: on hover (focus stays) or by click / Enter (focus moves into it). */
const open = shallowRef<false | 'hover' | 'focus'>(false)
let openTimer = 0
let closeTimer = 0
onBeforeUnmount(() => (clearTimeout(openTimer), clearTimeout(closeTimer)))

function enter(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  clearTimeout(closeTimer)
  if (!open.value) openTimer = window.setTimeout(() => (open.value = 'hover'), 400)
}
function leave() {
  clearTimeout(openTimer)
  clearTimeout(closeTimer)
  if (open.value === 'hover')
    closeTimer = window.setTimeout(() => {
      if (open.value === 'hover') open.value = false
    }, 150)
}
// Click / Enter: opens it for the keyboard (also one opened by hover); again: closes it
function toggle() {
  clearTimeout(openTimer)
  open.value = open.value === 'focus' ? false : 'focus'
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    :class="[textClass, 'vg-hovercard-trigger']"
    :style="[textStyle, { 'anchor-name': anchor }]"
    aria-haspopup="dialog"
    :aria-expanded="!!open"
    :aria-controls="open ? cardId : undefined"
    @pointerenter="enter"
    @pointerleave="leave"
    @click.stop="toggle"
  >
    {{ text }}<span v-if="secondary" class="vg-text-secondary">{{ ' ' + secondary }}</span>
  </button>
  <HoverCard
    v-if="open"
    :id="cardId"
    :anchor="anchor"
    :spec="spec"
    :label="label"
    :trigger="trigger"
    :take-focus="open === 'focus'"
    @close="open = false"
    @pointerenter="enter"
    @pointerleave="leave"
    @copied="emit('copied', $event)"
    @failed="emit('failed', $event)"
  />
</template>
