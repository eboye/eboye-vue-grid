<script setup lang="ts">
const props = defineProps<{
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  label: string
  type?: 'checkbox' | 'radio'
}>()
const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <label class="vg-checkbox" @click.stop>
    <input
      :type="props.type ?? 'checkbox'"
      :checked="props.checked"
      :indeterminate="props.indeterminate"
      :disabled="props.disabled"
      :aria-label="props.label"
      tabindex="-1"
      @change="emit('toggle')"
    />
  </label>
</template>
