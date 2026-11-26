<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, shallowRef, toRaw, useId } from 'vue'
import { anchorNameFor, trackAnchor, type AnchorTarget, type Placement } from '../internal/anchor'
import type { MenuAction, MenuItem } from '../types'
import { useMessages } from '../internal/messages'

/**
 * Accessible menu rendered with the Popover API (top layer: never clipped by the grid's overflow;
 * light-dismiss on outside click / Esc) and placed with CSS anchor positioning.
 *
 * Two ways to open it:
 * - declaratively: a trigger with `popovertarget="<id>"` and `style="anchor-name: <anchorName>"`
 *   (pass the same `anchor-name` prop) — see the `actions-menu` renderer;
 * - imperatively: `openAt(element | { x, y })` — used for context menus.
 */
const props = withDefaults(
  defineProps<{
    items: readonly MenuItem[]
    /** The menu's name for screen readers. Default: `messages.menu`, else `Menu`. */
    label?: string
    placement?: Placement
    /** Popover id (for `popovertarget`). Generated when omitted. */
    id?: string
    /** `anchor-name` set on an external trigger (declarative mode). */
    anchorName?: string
  }>(),
  { placement: 'bottom-end' },
)
const m = useMessages()

const emit = defineEmits<{
  select: [item: MenuAction]
  open: []
  close: []
}>()

const uid = useId()
const menuId = props.id ?? `vg-menu-${uid}`
const ownAnchor = anchorNameFor(uid)
const pointAnchor = `${ownAnchor}-pt`

const menu = shallowRef<HTMLElement>()
const point = ref<{ x: number; y: number } | null>(null)
const placement = ref<Placement>(props.placement)
const anchorName = ref(props.anchorName ?? ownAnchor)
const isOpen = ref(false)
let anchoredElement: HTMLElement | null = null
let fallbackTarget: AnchorTarget | null = null
let returnFocus: HTMLElement | null = null
let stopTracking = () => {}
onBeforeUnmount(() => stopTracking())

const isAction = (item: MenuItem): item is MenuAction => !('separator' in item)
const enabledItems = () =>
  Array.from(
    menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
  )

function releaseAnchor() {
  if (anchoredElement?.style.getPropertyValue('anchor-name') === ownAnchor) {
    anchoredElement.style.removeProperty('anchor-name')
  }
  anchoredElement = null
}

/** Opens the menu anchored to an element (keyboard / cell) or a viewport point (pointer). */
async function openAt(target: AnchorTarget, focusAfterClose?: HTMLElement | null) {
  if (isOpen.value) menu.value?.hidePopover?.()
  releaseAnchor()
  returnFocus = focusAfterClose ?? (document.activeElement as HTMLElement | null)
  fallbackTarget = target
  if (target instanceof HTMLElement) {
    point.value = null
    target.style.setProperty('anchor-name', ownAnchor)
    anchoredElement = target
    anchorName.value = ownAnchor
    placement.value = props.placement === 'point' ? 'bottom-start' : props.placement
  } else {
    point.value = { x: target.x, y: target.y }
    anchorName.value = pointAnchor
    placement.value = 'point'
  }
  await nextTick() // render the point anchor / new anchor name before showing
  menu.value?.showPopover?.()
}

function close() {
  menu.value?.hidePopover?.()
}

function onToggle(event: Event) {
  const open = (event as ToggleEvent).newState === 'open'
  isOpen.value = open
  if (open) {
    if (!fallbackTarget) {
      // Declarative mode: opened by a `popovertarget` trigger.
      const invoker = document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(menuId)}"]`)
      returnFocus = invoker
      fallbackTarget = invoker
      anchorName.value = props.anchorName ?? ownAnchor
      placement.value = props.placement
    }
    // Placed, followed and hidden by CSS; JS only where the browser can't (see trackAnchor).
    if (fallbackTarget && menu.value)
      stopTracking = trackAnchor(menu.value, fallbackTarget, placement.value)
    nextTick(() => enabledItems()[0]?.focus({ preventScroll: true }))
    emit('open')
  } else {
    const focusInside =
      !document.activeElement ||
      document.activeElement === document.body ||
      menu.value?.contains(document.activeElement)
    if (focusInside && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
    stopTracking()
    releaseAnchor()
    point.value = null
    fallbackTarget = null
    returnFocus = null
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent) {
  const list = enabledItems()
  const index = list.indexOf(document.activeElement as HTMLButtonElement)
  const move = (i: number) => list[(i + list.length) % list.length]?.focus({ preventScroll: true })
  switch (event.key) {
    case 'ArrowDown':
      move(index + 1)
      break
    case 'ArrowUp':
      move(index - 1)
      break
    case 'Home':
      move(0)
      break
    case 'End':
      move(list.length - 1)
      break
    case 'Tab':
      close()
      return
    default: {
      // Typeahead: jump to the next item starting with the typed character.
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
      const ch = event.key.toLowerCase()
      const order = [...list.slice(index + 1), ...list.slice(0, index + 1)]
      order
        .find((b) => b.textContent?.trim().toLowerCase().startsWith(ch))
        ?.focus({ preventScroll: true })
    }
  }
  event.preventDefault()
  event.stopPropagation()
}

/** Why an item can't be chosen (`disabled: 'reason'`): it stays focusable, with the reason shown. */
const reasonOf = (item: MenuAction) =>
  typeof item.disabled === 'string' && item.disabled ? item.disabled : undefined

function choose(item: MenuAction) {
  if (reasonOf(item)) return
  close()
  emit('select', item)
}

defineExpose({ id: menuId, openAt, close, isOpen })
</script>

<template>
  <span
    v-if="point"
    class="vg-menu-point"
    aria-hidden="true"
    :style="{ left: `${point.x}px`, top: `${point.y}px`, 'anchor-name': pointAnchor }"
  />
  <div
    :id="menuId"
    ref="menu"
    popover="auto"
    role="menu"
    :aria-label="label || m.menu || 'Menu'"
    class="vg-menu"
    :data-placement="placement"
    :style="{ 'position-anchor': anchorName }"
    @toggle="onToggle"
    @keydown="onKeydown"
    @click.stop
    @contextmenu.prevent
  >
    <template v-for="(item, i) in items" :key="isAction(item) ? item.name : `sep-${i}`">
      <div v-if="!isAction(item)" role="separator" class="vg-menu-separator" />
      <button
        v-else
        type="button"
        role="menuitem"
        tabindex="-1"
        :disabled="item.disabled === true"
        :aria-disabled="reasonOf(item) ? 'true' : undefined"
        :aria-labelledby="reasonOf(item) ? `${menuId}-l${i}` : undefined"
        :aria-describedby="reasonOf(item) ? `${menuId}-r${i}` : undefined"
        :class="[
          'vg-menu-item',
          item.tone && `vg-tone-${item.tone}`,
          { 'vg-menu-item-unavailable': reasonOf(item) },
        ]"
        @click="choose(item)"
      >
        <component
          :is="toRaw(item.icon)"
          v-if="item.icon"
          class="vg-menu-icon"
          aria-hidden="true"
        />
        <span :id="`${menuId}-l${i}`" class="vg-menu-label">{{ item.label }}</span>
        <span v-if="item.hint" class="vg-menu-hint">{{ item.hint }}</span>
        <span v-if="reasonOf(item)" :id="`${menuId}-r${i}`" class="vg-menu-reason">{{
          reasonOf(item)
        }}</span>
      </button>
    </template>
  </div>
</template>
