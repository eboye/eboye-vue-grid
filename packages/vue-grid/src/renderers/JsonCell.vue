<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import type { CellRendererProps } from '../types'
import { stringifyJson } from './format'
import { resolveOption, type JsonOptions } from './options'
import { useMessages } from '../internal/messages'

const props = defineProps<CellRendererProps<unknown, unknown, JsonOptions>>()
const m = useMessages()

const dialog = shallowRef<HTMLDialogElement>()
const titleId = useId()
const hasValue = computed(
  () => props.value !== null && props.value !== undefined && props.value !== '',
)
// Rendered as a text node inside <pre>: never interpreted as HTML.
const pretty = computed(() => (hasValue.value ? stringifyJson(props.value) : ''))
const title = computed(
  () =>
    resolveOption(props.options.dialogTitle, props.value, props.row) ??
    props.column.header ??
    'JSON',
)

function open() {
  dialog.value?.showModal()
}

// Light dismiss comes from `closedby="any"`; this is the fallback for browsers without it:
// a click whose target is the <dialog> itself landed on the backdrop.
const needsLightDismissFallback =
  typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)
function onDialogClick(event: MouseEvent) {
  if (needsLightDismissFallback && event.target === dialog.value) dialog.value?.close()
}
</script>

<template>
  <span v-if="hasValue" class="vg-json">
    <button type="button" class="vg-link-button" @click.stop="open">
      {{ options.label ?? m.view ?? 'View' }}
    </button>
    <dialog
      ref="dialog"
      class="vg-dialog"
      closedby="any"
      :aria-labelledby="titleId"
      @click.stop="onDialogClick"
      @keydown.stop
    >
      <header class="vg-dialog-header">
        <strong :id="titleId">{{ title || 'JSON' }}</strong>
        <form method="dialog">
          <button class="vg-icon-button" :aria-label="m.close ?? 'Close'">✕</button>
        </form>
      </header>
      <pre class="vg-json-pre">{{ pretty }}</pre>
    </dialog>
  </span>
</template>
