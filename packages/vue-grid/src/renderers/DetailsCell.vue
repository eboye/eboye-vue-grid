<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useId } from 'vue'
import { anchorNameFor, trackAnchor } from '../internal/anchor'
import type { CellRendererProps } from '../types'
import { resolveOption, resolveTone, safeTone, type DetailsOptions } from './options'
import { CrossIcon, InfoIcon } from './parts/icons'
import { useMessages } from '../internal/messages'

const props = defineProps<CellRendererProps<unknown, unknown, DetailsOptions>>()
const m = useMessages()

const uid = useId()
const panelId = `vg-details-${uid}`
const anchor = anchorNameFor(`details-${uid}`)
const trigger = shallowRef<HTMLButtonElement>()
const panel = shallowRef<HTMLElement>()

const label = computed(() =>
  props.options.label
    ? props.options.label(props.value, props.row)
    : props.value == null
      ? ''
      : String(props.value),
)
const tone = computed(() => resolveTone(props.options.tone, props.value, props.row) ?? 'neutral')
const items = computed(() => props.options.items?.(props.value, props.row) ?? [])
const title = computed(
  () => resolveOption(props.options.title, props.value, props.row) ?? props.column.header ?? '',
)
const triggerLabel = computed(
  () =>
    `${props.options.triggerLabel ?? m.value.details ?? 'Details'}${title.value ? `: ${title.value}` : ''}`,
)

let stopTracking = () => {}
onBeforeUnmount(() => stopTracking())

function onToggle(event: Event) {
  stopTracking()
  // Placed, followed and hidden by CSS anchor positioning; JS only where unsupported.
  if ((event as ToggleEvent).newState === 'open' && panel.value && trigger.value) {
    stopTracking = trackAnchor(panel.value, trigger.value, 'bottom-start')
  }
}
</script>

<template>
  <span v-if="label || items.length" class="vg-details">
    <span v-if="label" :class="['vg-status-badge', 'vg-status-soft', `vg-tone-${tone}`]">{{
      label
    }}</span>
    <template v-if="items.length">
      <button
        ref="trigger"
        type="button"
        class="vg-icon-button"
        :aria-label="triggerLabel"
        :title="triggerLabel"
        aria-haspopup="dialog"
        :aria-controls="panelId"
        :popovertarget="panelId"
        :style="{ 'anchor-name': anchor }"
        @click.stop
      >
        <InfoIcon />
      </button>
      <div
        :id="panelId"
        ref="panel"
        popover="auto"
        role="dialog"
        :aria-label="title || triggerLabel"
        class="vg-menu vg-details-panel"
        data-placement="bottom-start"
        :style="{ 'position-anchor': anchor }"
        @toggle="onToggle"
        @click.stop
      >
        <header class="vg-details-header">
          <strong>{{ title }}</strong>
          <button
            type="button"
            class="vg-icon-button"
            :aria-label="m.close ?? 'Close'"
            :popovertarget="panelId"
            popovertargetaction="hide"
          >
            <CrossIcon />
          </button>
        </header>
        <ul class="vg-details-list">
          <li v-for="(item, i) in items" :key="i" class="vg-details-item" :title="item.tooltip">
            <span class="vg-details-label">
              {{ item.label }}
              <span v-if="item.detail" class="vg-details-detail">{{ item.detail }}</span>
            </span>
            <span
              v-if="item.value"
              :class="[
                'vg-status-badge',
                'vg-status-soft',
                `vg-tone-${safeTone(item.tone) ?? 'neutral'}`,
              ]"
              >{{ item.value }}</span
            >
          </li>
        </ul>
      </div>
    </template>
  </span>
</template>
