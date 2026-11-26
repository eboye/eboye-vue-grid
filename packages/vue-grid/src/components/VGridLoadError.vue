<script setup lang="ts">
import type { Slot } from 'vue'
import { partOn, useMessages, useParts } from '../internal/messages'
import { RenderSlot } from '../internal/RenderSlot'

/**
 * A failed server request (server data feature): above rows that are still shown (`stale`, they
 * are from before), or in place of the rows. The grid's `#load-error` slot (`render`) replaces it.
 */
defineProps<{
  error: unknown
  retry: () => void
  /** Rows from before are still shown: a banner above them. */
  stale?: boolean
  render?: Slot
}>()
const m = useMessages()
const parts = useParts()
</script>

<template>
  <RenderSlot v-if="render" :fn="render" :scope="{ error, retry, stale: !!stale }" />
  <div v-else-if="stale" class="vg-load-error-banner" role="alert">
    <span
      >{{ m.loadError ?? "Couldn't load the rows." }}
      {{ m.staleRows ?? 'These are from before.' }}</span
    >
    <button v-if="partOn(parts, 'retry')" type="button" class="vg-link-button" @click="retry()">
      {{ m.retry ?? 'Retry' }}
    </button>
  </div>
  <span v-else class="vg-no-match vg-load-error" role="alert">
    {{ m.loadError ?? "Couldn't load the rows." }}
    <button v-if="partOn(parts, 'retry')" type="button" class="vg-link-button" @click="retry()">
      {{ m.retry ?? 'Retry' }}
    </button>
  </span>
</template>
