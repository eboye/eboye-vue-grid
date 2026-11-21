<script setup lang="ts">
// Shared markup for number / signed-number / currency: plain text, or a drill-down button.
defineProps<{ text: string; clickable: boolean; muted: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button v-if="clickable && text && !muted" type="button" class="vg-link-button vg-number" @click="$emit('click')">
    {{ text }}
  </button>
  <span v-else :class="['vg-number', { 'vg-text-muted': muted }]">{{ text }}</span>
</template>
