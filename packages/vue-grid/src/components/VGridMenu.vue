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
    /** A submenu (rendered by its parent menu): ← closes it. */
    nested?: boolean
  }>(),
  { placement: 'bottom-end' },
)
const m = useMessages()

const emit = defineEmits<{
  select: [item: MenuAction]
  open: []
  close: []
  /** A submenu was left with Tab: the whole menu closes. */
  dismiss: []
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
// this menu's own items, not a submenu's (which sits inside it)
const enabledItems = () =>
  Array.from(
    menu.value?.querySelectorAll<HTMLButtonElement>(':scope > [role="menuitem"]:not(:disabled)') ??
      [],
  )

// ── Submenus (`items` on an item) ───────────────────────────────────────────────────────────
const hasSub = (item: MenuAction) => !!item.items?.length
/** Which item's submenu is open (its index). */
const subIndex = ref<number | null>(null)
const subMenu = shallowRef<{ openAt: typeof openAt; close: () => void }>()
let subTimer = 0
onBeforeUnmount(() => clearTimeout(subTimer))
// a function ref: inside `v-for` a plain one would be an array
const setSubMenu = (c: unknown) => (subMenu.value = (c ?? undefined) as typeof subMenu.value)

async function openSub(index: number, item: HTMLElement) {
  clearTimeout(subTimer)
  if (subIndex.value === index) return
  subMenu.value?.close()
  subIndex.value = index
  await nextTick()
  // focus goes back to the item when the submenu closes (←, Esc)
  await subMenu.value?.openAt(item, item)
}
function closeSub() {
  clearTimeout(subTimer)
  subMenu.value?.close()
  subIndex.value = null
}
/** Hover: an item with a submenu opens it, another item closes the open one, after a pause. */
function onPointerOver(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  const button = (event.target as Element).closest<HTMLElement>('[role="menuitem"]')
  // inside the open submenu: keep it
  if (!button || button.parentElement !== menu.value) return clearTimeout(subTimer)
  const index = Number(button.dataset.index)
  const item = props.items[index]
  if (index === subIndex.value) return clearTimeout(subTimer)
  clearTimeout(subTimer)
  subTimer = window.setTimeout(() => {
    if (item && isAction(item) && hasSub(item) && !reasonOf(item) && item.disabled !== true)
      void openSub(index, button)
    else closeSub()
  }, 200)
}
function onSubSelect(item: MenuAction) {
  close()
  emit('select', item)
}
function onSubDismiss() {
  close()
  if (props.nested) emit('dismiss')
}

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
    clearTimeout(subTimer)
    subIndex.value = null
    emit('close')
  }
}

function onKeydown(event: KeyboardEvent) {
  const list = enabledItems()
  const index = list.indexOf(document.activeElement as HTMLButtonElement)
  const move = (i: number) => list[(i + list.length) % list.length]?.focus({ preventScroll: true })
  switch (event.key) {
    case ' ':
      event.stopPropagation()
      return
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
    case 'ArrowRight': {
      const button = list[index]
      const item = button && props.items[Number(button.dataset.index)]
      if (button && item && isAction(item) && hasSub(item) && !reasonOf(item))
        void openSub(Number(button.dataset.index), button)
      break
    }
    case 'ArrowLeft':
      if (!props.nested) return
      close() // focus goes back to the item that opened it
      break
    case 'Tab':
      close()
      if (props.nested) emit('dismiss')
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

function choose(item: MenuAction, index: number, event: MouseEvent) {
  if (reasonOf(item)) return
  // an item with a submenu opens it (click, Enter, Space) instead of being chosen
  if (hasSub(item)) return void openSub(index, event.currentTarget as HTMLElement)
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
    @pointerover="onPointerOver"
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
        :data-index="i"
        :disabled="item.disabled === true"
        :aria-haspopup="hasSub(item) ? 'menu' : undefined"
        :aria-expanded="hasSub(item) ? subIndex === i : undefined"
        :aria-disabled="reasonOf(item) ? 'true' : undefined"
        :aria-labelledby="reasonOf(item) ? `${menuId}-l${i}` : undefined"
        :aria-describedby="reasonOf(item) ? `${menuId}-r${i}` : undefined"
        :class="[
          'vg-menu-item',
          item.tone && `vg-tone-${item.tone}`,
          { 'vg-menu-item-unavailable': reasonOf(item) },
        ]"
        @click="choose(item, i, $event)"
      >
        <component
          :is="toRaw(item.icon)"
          v-if="item.icon"
          class="vg-menu-icon"
          aria-hidden="true"
        />
        <span :id="`${menuId}-l${i}`" class="vg-menu-label">{{ item.label }}</span>
        <span v-if="item.hint" class="vg-menu-hint">{{ item.hint }}</span>
        <svg v-if="hasSub(item)" class="vg-menu-chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="m6 3.5 4.5 4.5L6 12.5" />
        </svg>
        <span v-if="reasonOf(item)" :id="`${menuId}-r${i}`" class="vg-menu-reason">{{
          reasonOf(item)
        }}</span>
      </button>
      <!-- its submenu: a popover inside this one, so the browser stacks and dismisses them together -->
      <VGridMenu
        v-if="isAction(item) && item.items?.length && subIndex === i"
        :ref="setSubMenu"
        :items="item.items"
        :label="item.label"
        placement="right-start"
        nested
        @select="onSubSelect"
        @dismiss="onSubDismiss"
        @close="subIndex = null"
      />
    </template>
  </div>
</template>
