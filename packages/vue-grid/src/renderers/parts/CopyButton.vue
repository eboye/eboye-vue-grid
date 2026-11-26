<script setup lang="ts">
import { tipAttrs } from '../../internal/tooltip'
import { onBeforeUnmount, ref } from 'vue'
import { copyText } from '../../internal/clipboard'
import { useMessages } from '../../internal/messages'
import { CheckIcon, CopyIcon } from './icons'

const props = defineProps<{ text: string; label?: string; title?: string }>()
const m = useMessages()
const emit = defineEmits<{ copied: [text: string]; failed: [text: string] }>()

const done = ref(false)
let timer = 0

async function copy() {
  const ok = await copyText(props.text)
  if (!ok) return emit('failed', props.text)
  emit('copied', props.text)
  done.value = true
  window.clearTimeout(timer)
  timer = window.setTimeout(() => (done.value = false), 1500)
}

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <button
    type="button"
    :class="['vg-icon-button', 'vg-copy-button', { 'vg-copy-done': done }]"
    :aria-label="done ? (m.copied ?? 'Copied') : (label ?? m.copy ?? 'Copy')"
    v-bind="tipAttrs(title ?? text)"
    @click.stop="copy"
  >
    <component :is="done ? CheckIcon : CopyIcon" />
  </button>
  <span class="vg-sr-only" aria-live="polite">{{ done ? (m.copied ?? 'Copied') : '' }}</span>
</template>
