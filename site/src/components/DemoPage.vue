<script setup lang="ts">
import { ref, shallowRef, useId, useTemplateRef, type Component } from 'vue'
import { docsUrl, loadDemo, loadSource, type Page } from '../pages'
import CodeView from './CodeView.vue'

const props = defineProps<{ page: Page }>()

const demo = shallowRef<Component>()
const demoUnavailable = ref(false)
void loadDemo(props.page.files[0]!).then(
  (component) => (demo.value = component),
  () => (demoUnavailable.value = true),
)

const file = ref(props.page.files[0]!)
const tabStop = ref(file.value)
const tabs = useTemplateRef<HTMLElement>('tabs')
const sourceId = useId()
const source = shallowRef<DemoSource>()
const sourceUnavailable = ref(false)
let sourceRequest = 0

function reloadPage() {
  window.location.reload()
}

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
  sourceUnavailable.value = false
  const request = ++sourceRequest
  try {
    const loaded = await loadSource(name)
    if (request === sourceRequest) source.value = loaded
  } catch {
    if (request === sourceRequest) sourceUnavailable.value = true
  }
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
      <component :is="demo" v-if="demo" />
      <div v-else class="demo-code-loading">
        <p role="status">
          {{ demoUnavailable ? 'Could not load the demo.' : 'Loading the demo…' }}
        </p>
        <button v-if="demoUnavailable" type="button" @click="reloadPage">Reload page</button>
      </div>
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
          <div v-else-if="sourceUnavailable" class="demo-code-loading">
            <p role="status">Could not load the source.</p>
            <button type="button" @click="reloadPage">Reload page</button>
          </div>
          <p v-else class="demo-code-loading" role="status">Loading the source…</p>
        </template>
      </div>
    </section>
  </article>
</template>
