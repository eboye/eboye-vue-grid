<script setup lang="ts">
import { tipAttrs } from '../internal/tooltip'
import { computed } from 'vue'
import type { CellRendererEmits, CellRendererProps } from '../types'
import { safeHref } from './format'
import { safeTone, type LineInput, type LineSpec, type MultiLineOptions } from './options'
import ValueBadge from './parts/ValueBadge.vue'
import { useRouterLink } from './parts/routerLink'
import { useMessages } from '../internal/messages'

const props = defineProps<CellRendererProps<unknown, unknown, MultiLineOptions>>()
const m = useMessages()
const emit = defineEmits<CellRendererEmits>()
const RouterLink = useRouterLink()

const toSpec = (line: LineInput): LineSpec =>
  line !== null && typeof line === 'object' ? line : { text: line ?? '' }

const lines = computed(() => {
  const raw = props.options.lines ? props.options.lines(props.value, props.row) : props.value
  const list = Array.isArray(raw)
    ? (raw as LineInput[])
    : raw === null || raw === undefined || raw === ''
      ? []
      : [raw as LineInput]
  const bold = new Set(props.options.boldLines ?? [])
  return list.map((line, index) => {
    const spec = toSpec(line)
    const text = spec.text === null || spec.text === undefined ? '' : String(spec.text)
    const kind = spec.action
      ? 'button'
      : spec.to !== undefined && RouterLink
        ? 'router'
        : safeHref(spec.href ?? (typeof spec.to === 'string' ? spec.to : undefined))
          ? 'link'
          : 'text'
    return {
      ...spec,
      tone: safeTone(spec.tone),
      index,
      text,
      kind,
      href: safeHref(spec.href ?? (typeof spec.to === 'string' ? spec.to : undefined)),
      bold: spec.bold ?? bold.has(index),
    }
  })
})
const external = computed(() => props.options.target === '_blank')
</script>

<template>
  <span
    v-if="lines.length"
    :class="['vg-multi-line', { 'vg-multi-line-wrap': options.ellipsis === false }]"
  >
    <span
      v-for="line in lines"
      :key="line.index"
      :class="[
        'vg-line',
        {
          'vg-text-bold': line.bold,
          'vg-text-muted': line.muted,
          'vg-text-fill': line.tone && line.fill,
          [`vg-tone-${line.tone}`]: line.tone,
        },
      ]"
      v-bind="
        line.tooltip
          ? tipAttrs(line.tooltip, { describe: true })
          : tipAttrs(options.ellipsis === false ? undefined : String(line.text ?? ''), {
              overflow: true,
            })
      "
    >
      <ValueBadge v-if="line.badge" :badge="line.badge" />
      <svg
        v-if="line.trend"
        :class="['vg-change-icon', line.trend === 'up' ? 'vg-change-up' : 'vg-change-down']"
        viewBox="0 0 10 10"
        role="img"
        :aria-label="
          line.trend === 'up' ? (m.increased ?? 'Increased') : (m.decreased ?? 'Decreased')
        "
      >
        <path v-if="line.trend === 'up'" d="M5 1.5 9 7.5H1z" />
        <path v-else d="M5 8.5 1 2.5h8z" />
      </svg>
      <component
        :is="RouterLink"
        v-if="line.kind === 'router'"
        class="vg-link"
        :to="line.to"
        :target="options.target"
        :rel="external ? 'noopener noreferrer' : undefined"
        >{{ line.text }}</component
      >
      <a
        v-else-if="line.kind === 'link'"
        class="vg-link"
        :href="line.href"
        :target="options.target"
        :rel="external ? 'noopener noreferrer' : undefined"
        >{{ line.text }}</a
      >
      <button
        v-else-if="line.kind === 'button'"
        type="button"
        class="vg-link-button"
        @click="emit('action', line.action!, line.index)"
      >
        {{ line.text }}
      </button>
      <template v-else>{{ line.text }}</template>
    </span>
  </span>
  <span v-else-if="options.placeholder" class="vg-text vg-text-muted">{{
    options.placeholder
  }}</span>
</template>
