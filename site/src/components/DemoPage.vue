<script setup lang="ts">
import { defineAsyncComponent, ref, shallowRef, useId, useTemplateRef } from 'vue'
import { docsUrl, loadDemo, loadSource, type Page } from '../pages'
import CodeView from './CodeView.vue'

const props = defineProps<{ page: Page }>()

const Demo = defineAsyncComponent(() => loadDemo(props.page.files[0]!))

const file = ref(props.page.files[0]!)
const tabStop = ref(file.value)
const tabs = useTemplateRef<HTMLElement>('tabs')
const sourceId = useId()
const source = shallowRef<DemoSource>()

function moveTabFocus(event: KeyboardEvent, index: number) {
  const last = props.page.files.length - 1
  let next = index
  switch (event.key) {
    case 'ArrowLeft':
      next = index === 0 ? last : index - 1
      break
    case 'ArrowRight':
      next = index === last ? 0 : index + 1
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = last
      break
    default:
      return
  }
  event.preventDefault()
  tabs.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
}

function onTabListFocusOut(event: FocusEvent) {
  if (!(event.relatedTarget instanceof Node) || !tabs.value?.contains(event.relatedTarget)) {
    tabStop.value = file.value
  }
}

async function show(name: string) {
  if (file.value === name && source.value) return
  file.value = name
  tabStop.value = name
  source.value = undefined
  const loaded = await loadSource(name)
  if (file.value === name) source.value = loaded
}
show(file.value)
</script>

<template>
  <article class="demo-page">
    <header class="demo-intro">
      <p class="demo-section">{{ page.section }}</p>
      <h1 id="site-page-title">{{ page.title }}</h1>
      <p class="demo-summary">{{ page.summary }}</p>
      <ul v-if="page.try?.length" class="demo-try" aria-label="Try this">
        <li v-for="tip in page.try" :key="tip">{{ tip }}</li>
      </ul>
    </header>

    <section class="demo-card" aria-label="Live demo">
      <Demo />
    </section>

    <section class="demo-code" aria-label="Source">
      <div class="demo-code-bar">
        <div
          ref="tabs"
          class="demo-tabs"
          role="tablist"
          aria-label="Files"
          @focusout="onTabListFocusOut"
        >
          <button
            v-for="(name, index) in page.files"
            :id="`${sourceId}-tab-${index}`"
            :key="name"
            type="button"
            role="tab"
            :aria-controls="`${sourceId}-panel-${index}`"
            :aria-selected="file === name"
            :tabindex="tabStop === name ? 0 : -1"
            @click="show(name)"
            @focus="tabStop = name"
            @keydown="moveTabFocus($event, index)"
          >
            {{ name }}.vue
          </button>
        </div>
        <a v-if="page.docs" class="demo-docs" :href="docsUrl(page.docs)" rel="noopener"
          >Guide: {{ page.docs.replace(/^\d+\.\s*/, '') }} →</a
        >
      </div>
      <div
        v-for="(name, index) in page.files"
        :id="`${sourceId}-panel-${index}`"
        :key="name"
        role="tabpanel"
        :aria-labelledby="`${sourceId}-tab-${index}`"
        :hidden="file !== name"
      >
        <template v-if="file === name">
          <CodeView v-if="source" :source="source" :label="`${name}.vue`" />
          <p v-else class="demo-code-loading" role="status">Loading the source…</p>
        </template>
      </div>
    </section>
  </article>
</template>
