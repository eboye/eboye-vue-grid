<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { CellRangeState, RangeColumn } from '../composables/useCellRange'
import { useMessages } from '../internal/messages'
import { FORMAT_CONTEXT_KEY } from '../registry/plugin'
import { formatNumber } from '../renderers/format'

/**
 * The find bar (range selection feature, own chunk): searches the cells as they show, moves
 * between the matches, and with the editing feature replaces them. Opened by Ctrl/⌘+F / Ctrl/⌘+H
 * in the grid or `grid.openFind()`; Enter / Shift+Enter go to the next / previous match, Esc closes.
 */
const props = defineProps<{ range: CellRangeState }>()
const find = props.range.find
const m = useMessages()
const format = inject(FORMAT_CONTEXT_KEY, undefined)
const n = (v: number) => (format ? formatNumber(v, format.value) : String(v))

const query = ref(find.text.value)
const replacement = ref('')
const matchCase = ref(false)
const wholeCell = ref(false)
const inSelection = ref(!!find.scope.value)
/** The last thing replaced: shown instead of the count until the search changes. */
const report = ref('')
const searchBox = ref<HTMLInputElement>()
const bar = ref<HTMLElement>()

interface Match {
  row: unknown
  col: RangeColumn<unknown>
  id: string
  text: string
}

/** Every matching cell, row by row, as the cells show. */
const matches = computed<Match[]>(() => {
  const q = query.value
  if (!q) return []
  const fold = (s: string) => (matchCase.value ? s : s.toLocaleLowerCase())
  const needle = fold(q)
  const { rows, columns } = find.area(inSelection.value)
  const out: Match[] = []
  for (const row of rows)
    for (const col of columns) {
      const text = find.cellText(row, col)
      const hay = fold(text)
      if (wholeCell.value ? hay === needle : hay.includes(needle))
        out.push({ row, col, id: find.cellId(find.rowKey(row), col.key), text })
    }
  return out
})
const index = shallowRef(0)

// the grid highlights what the bar found
watch(matches, (list) => (find.hits.value = new Set(list.map((x) => x.id))), { immediate: true })
// a new search starts at the first match; a replace keeps the place (the list moves on)
watch([query, matchCase, wholeCell, inSelection], () => {
  index.value = 0
  report.value = ''
})
watch(
  [matches, index],
  ([list, i]) => {
    if (!list.length) {
      find.current.value = null
      return
    }
    if (i >= list.length) index.value = 0
    const x = list[Math.min(i, list.length - 1)]!
    void find.show(x.row, x.col)
  },
  { immediate: true },
)

function go(step: 1 | -1) {
  const count = matches.value.length
  if (!count) return
  report.value = ''
  index.value = (index.value + step + count) % count
}

/** A cell's text with the search replaced (every occurrence; the whole text with Whole cell). */
function replaced(text: string): string {
  if (wholeCell.value) return replacement.value
  const escaped = query.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, matchCase.value ? 'g' : 'gi'), () => replacement.value)
}

const busy = ref(false)
async function replace(all: boolean) {
  const list = all ? matches.value : matches.value.slice(index.value, index.value + 1)
  if (!list.length || busy.value) return
  // the buttons are off while it saves (and Replace all stays off with nothing left to match):
  // the browser drops the focus of a disabled button, so it's put back afterwards
  const had = document.activeElement
  const inBar = !!had && !!bar.value?.contains(had)
  busy.value = true
  try {
    const result = await find.write(
      list.map((x) => ({ row: x.row, column: x.col, text: replaced(x.text) })),
    )
    if (!result) return
    const count = result.edits.length
    const skipped = result.skipped.length + result.failed.length
    if (!all) {
      // on to the next match: usually the same place in the list, now that this cell no longer
      // matches; still there (skipped, or its new text matches too): one further
      await nextTick()
      if (matches.value[index.value]?.id === list[0]!.id) go(1)
    }
    report.value =
      m.value.replacedCount?.(count, skipped) ??
      `${n(count)} replaced${skipped ? `, ${n(skipped)} left as they were` : ''}`
  } finally {
    busy.value = false
    if (inBar) void keepFocus(had as HTMLElement)
  }
}

/** Focus back where it was, or in the search box if that went off; Esc and the keys keep working. */
async function keepFocus(had: HTMLElement) {
  await nextTick()
  const root = bar.value
  if (!root) return
  // a button that stays off loses focus, now or (WebKit) a little later: to the search box
  if (!had.isConnected || (had as HTMLButtonElement).disabled) searchBox.value?.focus()
  else if (!root.contains(document.activeElement)) had.focus()
}

const status = computed(() => {
  if (report.value) return report.value
  if (!query.value) return ''
  const count = matches.value.length
  if (!count) return m.value.noMatches ?? 'No matches'
  const at = Math.min(index.value, count - 1) + 1
  return m.value.findCount?.(n(at), n(count), count) ?? `${n(at)} of ${n(count)}`
})

function onKeyDown(event: KeyboardEvent) {
  const ctrl = event.ctrlKey || event.metaKey
  if (event.key === 'Escape') {
    event.preventDefault()
    find.close()
  } else if (event.key === 'Enter' && (event.target as HTMLElement).dataset.role === 'find') {
    event.preventDefault()
    go(event.shiftKey ? -1 : 1)
  } else if (event.key === 'Enter' && (event.target as HTMLElement).dataset.role === 'replace') {
    event.preventDefault()
    void replace(ctrl)
  } else if (ctrl && !event.altKey && (event.key === 'f' || event.key === 'h')) {
    // again: back to the search box (Ctrl/⌘+H also shows the replace row)
    event.preventDefault()
    if (event.key === 'h' && find.canReplace()) find.replace.value = true
    searchBox.value?.focus()
    searchBox.value?.select()
  }
}

// keys typed while this chunk loaded were kept for the search box
onMounted(() => {
  if (find.text.value && !query.value) query.value = find.text.value
})
onUnmounted(() => (find.mounted.value = false))

// focus the search box on opening and on Ctrl/⌘+F again
watch(
  find.focus,
  async () => {
    await nextTick()
    const box = searchBox.value
    if (!box) return
    box.focus()
    // from here on keys reach the box itself; what the grid kept for it goes in first
    find.mounted.value = true
    const given = find.text.value // typed while it opened, or `openFind({ text })`
    find.text.value = ''
    if (given) {
      // set straight on the box too, so keys typed right now land after it
      query.value = given
      box.value = given
      box.setSelectionRange(given.length, given.length) // typed text: carry on after it
    } else box.select() // else select what's there, to type over it
  },
  { immediate: true },
)
</script>

<template>
  <div ref="bar" class="vg-find" role="search" :aria-label="m.find ?? 'Find'" @keydown="onKeyDown">
    <div class="vg-find-row">
      <input
        ref="searchBox"
        v-model="query"
        class="vg-input vg-find-input"
        data-role="find"
        type="search"
        :aria-label="m.find ?? 'Find'"
        :placeholder="m.find ?? 'Find'"
        autocomplete="off"
        spellcheck="false"
      />
      <span class="vg-find-status" role="status" aria-live="polite">{{ status }}</span>
      <button
        type="button"
        class="vg-icon-button"
        :aria-label="m.findPrevious ?? 'Previous match'"
        :title="m.findPrevious ?? 'Previous match'"
        :disabled="!matches.length"
        @click="go(-1)"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.75" />
        </svg>
      </button>
      <button
        type="button"
        class="vg-icon-button"
        :aria-label="m.findNext ?? 'Next match'"
        :title="m.findNext ?? 'Next match'"
        :disabled="!matches.length"
        @click="go(1)"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.75" />
        </svg>
      </button>
      <button
        type="button"
        class="vg-icon-button"
        :aria-label="m.close ?? 'Close'"
        :title="m.close ?? 'Close'"
        @click="find.close()"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.75" />
        </svg>
      </button>
    </div>
    <div v-if="find.replace.value" class="vg-find-row">
      <input
        v-model="replacement"
        class="vg-input vg-find-input"
        data-role="replace"
        type="text"
        :aria-label="m.replaceWith ?? 'Replace with'"
        :placeholder="m.replaceWith ?? 'Replace with'"
        autocomplete="off"
        spellcheck="false"
      />
      <button
        type="button"
        class="vg-button"
        :disabled="!matches.length || busy"
        @click="replace(false)"
      >
        {{ m.replace ?? 'Replace' }}
      </button>
      <button
        type="button"
        class="vg-button"
        :disabled="!matches.length || busy"
        @click="replace(true)"
      >
        {{ m.replaceAll ?? 'Replace all' }}
      </button>
    </div>
    <div class="vg-find-row vg-find-options">
      <label><input v-model="matchCase" type="checkbox" /> {{ m.matchCase ?? 'Match case' }}</label>
      <label><input v-model="wholeCell" type="checkbox" /> {{ m.wholeCell ?? 'Whole cell' }}</label>
      <label v-if="find.scope.value">
        <input v-model="inSelection" type="checkbox" /> {{ m.inSelection ?? 'In selection' }}
      </label>
      <button
        v-if="find.canReplace() && !find.replace.value"
        type="button"
        class="vg-link-button"
        @click="find.replace.value = true"
      >
        {{ m.showReplace ?? 'Replace…' }}
      </button>
    </div>
  </div>
</template>
