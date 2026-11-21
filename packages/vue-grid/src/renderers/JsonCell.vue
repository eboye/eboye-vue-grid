<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { CellRendererProps } from '../types'
import { stringifyJson } from './format'
import { resolveOption, type JsonOptions } from './options'

const props = defineProps<CellRendererProps<any, unknown, JsonOptions>>()

const dialog = shallowRef<HTMLDialogElement>()
const hasValue = computed(() => props.value !== null && props.value !== undefined && props.value !== '')
// Rendered as a text node inside <pre>: never interpreted as HTML.
const pretty = computed(() => (hasValue.value ? stringifyJson(props.value) : ''))
const title = computed(() => resolveOption(props.options.dialogTitle, props.value, props.row) ?? props.column.header ?? 'JSON')

function open() {
  dialog.value?.showModal()
}
</script>

<template>
  <span v-if="hasValue" class="vg-json">
    <button type="button" class="vg-link-button" @click.stop="open">{{ options.label ?? 'View' }}</button>
    <dialog ref="dialog" class="vg-dialog" closedby="any" @click.stop @keydown.stop>
      <header class="vg-dialog-header">
        <strong>{{ title }}</strong>
        <form method="dialog"><button class="vg-icon-button" aria-label="Close">✕</button></form>
      </header>
      <pre class="vg-json-pre">{{ pretty }}</pre>
    </dialog>
  </span>
</template>
