<script setup lang="ts">
import { ref } from 'vue'
import { copyText } from '../copy'
import HeroDemo from '../demos/HeroDemo.vue'
import { pages, REPO } from '../pages'

const install = 'npm install @nocopypaste/vue-grid'
const copied = ref(false)
async function copy() {
  copied.value = await copyText(install)
  setTimeout(() => (copied.value = false), 1500)
}

const points = [
  {
    title: 'A real CSS grid',
    text: 'Columns are grid tracks (fr, minmax, min-content) and nested rows sit in subgrid, so every level lines up with no measuring.',
  },
  {
    title: 'Pay for what you use',
    text: 'A plain grid is 15.0 kB gzipped. Sorting, filtering, grouping, export and the rest are opt-in imports that tree-shake away.',
  },
  {
    title: 'Keyboard and screen readers',
    text: 'The ARIA grid pattern: one tab stop, arrow keys, Space to select, menus from the keyboard. Every example passes an axe WCAG 2.1 AA check in CI.',
  },
  {
    title: 'Phones and touch',
    text: 'Swipe to scroll, hold a header to drag it or a cell for its menu; pinned columns let go on narrow screens. Tested in Chromium, Firefox and WebKit.',
  },
  {
    title: 'Typed end to end',
    text: 'Columns, renderer options and events are typed from your row type; renderer names and their options autocomplete.',
  },
  {
    title: 'Built for coding agents',
    text: 'AGENTS.md, llms.txt, a generated API reference, a JSON Schema and an MCP server, so an assistant writes a correct grid the first time.',
  },
]
</script>

<template>
  <div class="home">
    <section class="hero">
      <h1>A Vue 3 data grid built on CSS Grid</h1>
      <p class="hero-lead">
        Sorting, filtering, grouping, server data, sub-grids, virtual scrolling, export and 29 cell
        renderers. Each feature is opt-in and tree-shakeable, and it is accessible and touch-ready
        by default. Every example on this site runs live and shows its code.
      </p>
      <div class="hero-actions">
        <code class="hero-install">
          <span class="hero-install-text"><span aria-hidden="true">$ </span>{{ install }}</span>
          <button type="button" class="hero-copy" @click="copy">
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </code>
        <a class="button" href="#/renderers">Browse the examples</a>
        <a class="button button-ghost" :href="`${REPO}#readme`" rel="noopener">Read the docs</a>
      </div>
    </section>

    <section class="demo-card hero-demo" aria-label="Live demo">
      <HeroDemo />
    </section>

    <section class="points" aria-label="Highlights">
      <div v-for="p in points" :key="p.title" class="point">
        <h2>{{ p.title }}</h2>
        <p>{{ p.text }}</p>
      </div>
    </section>

    <section aria-labelledby="examples-title">
      <h2 id="examples-title" class="home-subtitle">Examples</h2>
      <div class="cards">
        <a v-for="p in pages" :key="p.id" class="card" :href="`#/${p.id}`">
          <span class="card-section">{{ p.section }}</span>
          <strong>{{ p.title }}</strong>
          <span>{{ p.summary }}</span>
        </a>
      </div>
    </section>
  </div>
</template>
