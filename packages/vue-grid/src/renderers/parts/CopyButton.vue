<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { copyText } from '../../internal/clipboard'
import { CheckIcon, CopyIcon } from './icons'

const props = withDefaults(defineProps<{ text: string; label?: string; title?: string }>(), {
  label: 'Copy',
})
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
    :aria-label="done ? 'Copied' : label"
    :title="title ?? text"
    @click.stop="copy"
  >
    <component :is="done ? CheckIcon : CopyIcon" />
  </button>
  <span class="vg-sr-only" aria-live="polite">{{ done ? 'Copied' : '' }}</span>
</template>
