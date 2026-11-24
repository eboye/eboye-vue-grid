<script setup lang="ts">
import { defineAsyncComponent, ref, shallowRef } from 'vue'
import { docsUrl, loadDemo, loadSource, type Page } from '../pages'
import CodeView from './CodeView.vue'

const props = defineProps<{ page: Page }>()

const Demo = defineAsyncComponent(() => loadDemo(props.page.files[0]!))

const file = ref(props.page.files[0]!)
const source = shallowRef<DemoSource>()
async function show(name: string) {
  file.value = name
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
      <h1>{{ page.title }}</h1>
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
        <div class="demo-tabs" role="tablist" aria-label="Files">
          <button
            v-for="name in page.files"
            :key="name"
            type="button"
            role="tab"
            :aria-selected="file === name"
            @click="show(name)"
          >
            {{ name }}.vue
          </button>
        </div>
        <a v-if="page.docs" class="demo-docs" :href="docsUrl(page.docs)" rel="noopener"
          >Guide: {{ page.docs.replace(/^\d+\.\s*/, '') }} →</a
        >
      </div>
      <CodeView v-if="source" :source="source" :label="`${file}.vue`" />
      <p v-else class="demo-code-loading">Loading the source…</p>
    </section>
  </article>
</template>
