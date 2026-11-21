<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import type { ActionsMenuOptions, MenuAction } from './options'

const props = defineProps<CellRendererProps<unknown, unknown, ActionsMenuOptions>>()
const emit = defineEmits<CellRendererEmits>()

const id = useId()
const trigger = shallowRef<HTMLButtonElement>()
const menu = shallowRef<HTMLElement>()
const open = ref(false)
const position = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

const actions = computed<MenuAction[]>(() => {
  const a = props.options.actions
  return (typeof a === 'function' ? a(props.row) : a) ?? []
})

const items = () => Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])

function place() {
  const btn = trigger.value?.getBoundingClientRect()
  const pop = menu.value?.getBoundingClientRect()
  if (!btn || !pop) return
  const gap = 4
  const below = btn.bottom + gap + pop.height <= window.innerHeight
  const top = below ? btn.bottom + gap : Math.max(gap, btn.top - gap - pop.height)
  const left = Math.min(Math.max(gap, btn.right - pop.width), window.innerWidth - pop.width - gap)
  position.value = { top: `${top}px`, left: `${left}px` }
}

function onScrollOrResize(event: Event) {
  // Scrolling inside a long menu is fine; scrolling the page/grid would detach it from its button.
  if (event.target instanceof Node && menu.value?.contains(event.target)) return
  menu.value?.hidePopover?.()
}

// The menu uses the Popover API: it renders in the top layer, so the grid's overflow never clips
// it, and light-dismiss (outside click, Esc) comes for free.
function onToggle(event: Event) {
  open.value = (event as ToggleEvent).newState === 'open'
  if (open.value) {
    place()
    nextTick(() => items()[0]?.focus({ preventScroll: true }))
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  } else {
    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('resize', onScrollOrResize)
    if (menu.value?.contains(document.activeElement)) trigger.value?.focus()
  }
}

function onMenuKeydown(event: KeyboardEvent) {
  const list = items()
  const index = list.indexOf(document.activeElement as HTMLButtonElement)
  const move = (i: number) => list[(i + list.length) % list.length]?.focus({ preventScroll: true })
  if (event.key === 'ArrowDown') move(index + 1)
  else if (event.key === 'ArrowUp') move(index - 1)
  else if (event.key === 'Home') move(0)
  else if (event.key === 'End') move(list.length - 1)
  else if (event.key === 'Tab') menu.value?.hidePopover?.()
  else return
  event.preventDefault()
}

function choose(action: MenuAction) {
  menu.value?.hidePopover?.()
  emit('action', action.name, action)
}

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})
</script>

<template>
  <span v-if="actions.length" class="vg-actions-menu">
    <button
      ref="trigger"
      type="button"
      class="vg-icon-button"
      :aria-label="options.label ?? 'Actions'"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-controls="id"
      :popovertarget="id"
      @click.stop
    >
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" /></svg>
    </button>
    <div
      :id="id"
      ref="menu"
      popover="auto"
      role="menu"
      class="vg-menu"
      :style="position"
      @toggle="onToggle"
      @keydown="onMenuKeydown"
      @click.stop
    >
      <button
        v-for="action in actions"
        :key="action.name"
        type="button"
        role="menuitem"
        tabindex="-1"
        :disabled="action.disabled"
        :class="['vg-menu-item', action.tone && `vg-tone-${action.tone}`]"
        @click="choose(action)"
      >
        {{ action.label }}
      </button>
    </div>
  </span>
</template>
