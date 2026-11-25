<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type Component,
} from 'vue'
import { editorOf, type EditMove } from '../composables/useEditing'
import { getCellValue } from '../core/value'
import {
  anchorNameFor,
  placeWithoutAnchorSupport,
  supportsAnchorPositioning,
} from '../internal/anchor'
import { useInternalGrid, type ResolvedColumn } from '../internal/context'
import type { RowKey } from '../types'

/** The editor inside a cell being edited (editing feature). */
const props = defineProps<{ row: unknown; rowKey: RowKey; column: ResolvedColumn }>()

const grid = useInternalGrid()
const editing = grid.editing!
const m = grid.messages
const def = props.column.def
const kind = editorOf(def, props.column.definition)
const state = computed(() =>
  editing.isEditing(props.rowKey, def.key) ? editing.state.value : null,
)
const label = computed(
  () => m.value.editCell?.(def.header ?? def.key) ?? `Edit ${def.header ?? def.key}`,
)
const options = computed(() => def.editorOptions ?? {})
const choices = kind === 'select' ? editing.choices(def) : []

const pad = (n: number) => String(n).padStart(2, '0')
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function toDate(v: unknown): Date | null {
  if (v === null || v === undefined || v === '') return null
  const d = v instanceof Date ? v : new Date(v as string | number)
  return Number.isNaN(d.getTime()) ? null : d
}
/** A value as the input shows it. */
function toText(v: unknown): string {
  if (kind === 'date') {
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
    const d = toDate(v)
    return d ? localDate(d) : ''
  }
  if (kind === 'datetime') {
    const d = toDate(v)
    return d ? `${localDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}` : ''
  }
  if (kind === 'select') return String(choices.findIndex((c) => Object.is(c.value, v)))
  return v === null || v === undefined ? '' : String(v)
}

const old = getCellValue(props.row, def)
const start = state.value?.draft ? state.value.draft.value : old
const initial = state.value?.initial
/** The text for typed characters: a select picks the first choice they start. */
function typedText(typed: string, fallback: string) {
  if (kind !== 'select') return typed
  const i = choices.findIndex((c) =>
    (c.label ?? String(c.value)).toLowerCase().startsWith(typed.toLowerCase()),
  )
  return i >= 0 ? String(i) : fallback
}
const startText = toText(start)
const text = ref(initial === undefined ? startText : typedText(initial, startText))
const custom = ref<unknown>(start)

/** The input's text as a value of the cell's type; an `Error` when it can't be one. */
function parse(): unknown {
  if (kind === 'custom') return custom.value
  const t = text.value
  switch (kind) {
    case 'number': {
      const s = t.trim()
      if (!s) return null
      const n = Number(s.includes('.') ? s : s.replace(',', '.'))
      if (!Number.isFinite(n)) return new Error(m.value.editNotANumber ?? 'Enter a number.')
      const { min, max } = options.value
      if ((min !== undefined && n < min) || (max !== undefined && n > max))
        return new Error(
          m.value.editOutOfRange?.(min, max) ??
            (min !== undefined && max !== undefined
              ? `Enter a number from ${min} to ${max}.`
              : min !== undefined
                ? `Enter a number of at least ${min}.`
                : `Enter a number of at most ${max}.`),
        )
      return n
    }
    case 'date': {
      if (!t) return null
      const [y, mo, d] = t.split('-').map(Number) as [number, number, number]
      if (old instanceof Date) return new Date(y, mo - 1, d)
      if (typeof old === 'number') return new Date(y, mo - 1, d).getTime()
      // an ISO date-time: the new day, the same time of day (as the input showed it, local)
      const was = typeof old === 'string' && old.length > 10 ? toDate(old) : null
      if (was) {
        was.setFullYear(y, mo - 1, d)
        return was.toISOString()
      }
      return t
    }
    case 'datetime': {
      if (!t) return null
      const d = new Date(t)
      if (old instanceof Date) return d
      if (typeof old === 'number') return d.getTime()
      return d.toISOString()
    }
    case 'select':
      return choices[Number(t)]?.value ?? null
    default:
      return t
  }
}

const mine = () => editing.isEditing(props.rowKey, def.key)
const commit = (move: EditMove | 'blur', value = parse()) => {
  if (mine()) void editing.commit(value, move)
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    if (mine()) editing.cancel()
  } else if (event.key === 'Enter' && !event.altKey) {
    event.preventDefault()
    event.stopPropagation()
    commit(0)
  } else if (event.key === 'Tab') {
    event.preventDefault()
    event.stopPropagation()
    commit(event.shiftKey ? -1 : 1)
  }
}

const wrap = ref<HTMLElement>()
function onFocusOut(event: FocusEvent) {
  const to = event.relatedTarget as Node | null
  if (to && wrap.value?.contains(to)) return
  if (state.value && !state.value.saving) commit('blur')
}

// ── Error bubble (top layer, so the cell can't clip it) ──────────────────────────────────
const id = useId()
const anchor = anchorNameFor(id)
/** The bubble hangs below the cell (not the input, which sits inside its padding). */
const cellOf = () => wrap.value?.closest<HTMLElement>('.vg-cell') ?? wrap.value
const bubble = ref<HTMLElement>()
const error = computed(() => state.value?.error)
function showError() {
  const el = bubble.value
  if (!el || !error.value) return
  try {
    if (!el.matches(':popover-open')) el.showPopover()
  } catch {
    return // no popover support: the message stays in the input's description
  }
  const host = cellOf()
  if (!supportsAnchorPositioning() && host) placeWithoutAnchorSupport(el, host, 'bottom-start')
}
function focusControl(select: boolean) {
  const el = wrap.value?.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]')
  el?.focus({ preventScroll: true })
  if (select && el instanceof HTMLInputElement && el.type !== 'date') el.select?.()
}
watch(error, async (e) => {
  await nextTick()
  if (e) {
    showError()
    focusControl(false)
  }
})

// Keys that reached the cell rather than the input (the editor was still opening)
watch(
  () => state.value?.initial,
  (typed) => {
    if (typed !== undefined && kind !== 'custom') text.value = typedText(typed, text.value)
  },
)
watch(
  () => state.value?.queued,
  (q) => {
    if (q !== undefined) commit(q)
  },
)

onMounted(() => {
  cellOf()?.style.setProperty('anchor-name', anchor)
  editing.register(parse)
  focusControl(initial === undefined)
  showError()
  // Enter / Tab pressed while the editor was loading
  const queued = state.value?.queued
  if (queued !== undefined) commit(queued)
})
onBeforeUnmount(() => {
  cellOf()?.style.removeProperty('anchor-name')
  editing.register(null)
})

const disabled = computed(() => !!state.value?.saving)
const errorId = `${id}-error`
const customEditor = kind === 'custom' ? (def.editor as Component) : undefined
</script>

<template>
  <div
    ref="wrap"
    :class="['vg-editor', `vg-editor-${kind}`, { 'vg-editor-invalid': error }]"
    :aria-busy="disabled || undefined"
    @keydown="onKeyDown"
    @focusout="onFocusOut"
    @click.stop
    @dblclick.stop
  >
    <component
      :is="customEditor"
      v-if="customEditor"
      v-model="custom"
      :row="row"
      :column="def"
      :options="options"
      :error="error"
      :disabled="disabled"
      :label="label"
      :initial="initial"
      @commit="(v?: unknown) => commit(0, v === undefined ? custom : v)"
      @cancel="mine() && editing.cancel()"
    />
    <!--
      No focus ring of its own: the cell's editing outline shows where focus is. Inline, so an
      app's global :focus-visible style (unlayered, it beats the grid's layer) doesn't add a
      second outline inside the cell.
    -->
    <select
      v-else-if="kind === 'select'"
      v-model="text"
      class="vg-editor-control"
      style="outline: none"
      :aria-label="label"
      :aria-invalid="!!error || undefined"
      :aria-describedby="error ? errorId : undefined"
      :disabled="disabled"
    >
      <option v-if="text === '-1'" value="-1" />
      <option v-for="(c, i) in choices" :key="i" :value="String(i)">
        {{ c.label ?? String(c.value) }}
      </option>
    </select>
    <input
      v-else
      v-model="text"
      class="vg-editor-control"
      style="outline: none"
      :type="
        kind === 'number'
          ? 'text'
          : kind === 'date'
            ? 'date'
            : kind === 'datetime'
              ? 'datetime-local'
              : 'text'
      "
      :inputmode="kind === 'number' ? 'decimal' : undefined"
      :placeholder="options.placeholder"
      :maxlength="options.maxLength"
      :aria-label="label"
      :aria-invalid="!!error || undefined"
      :aria-describedby="error ? errorId : undefined"
      :disabled="disabled"
      autocomplete="off"
    />
    <span v-if="disabled" class="vg-sr-only" role="status">{{ m.editSaving ?? 'Saving…' }}</span>
    <div
      v-if="error"
      :id="errorId"
      ref="bubble"
      popover="manual"
      class="vg-edit-error"
      role="alert"
      :style="{ 'position-anchor': anchor }"
    >
      {{ error }}
    </div>
  </div>
</template>
