<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import BasicDemo from './demos/BasicDemo.vue'
import DetailDemo from './demos/DetailDemo.vue'
import PaginationDemo from './demos/PaginationDemo.vue'
import PinnedDemo from './demos/PinnedDemo.vue'
import SubgridDemo from './demos/SubgridDemo.vue'
import ThemeDemo from './demos/ThemeDemo.vue'
import VirtualDemo from './demos/VirtualDemo.vue'

const dark = ref(new URLSearchParams(location.search).get('theme') === 'dark')
watchEffect(() => {
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light'
})

const sections = [
  ['basic', 'Renderers'],
  ['pinned', 'Pinned & columns'],
  ['subgrid', 'Sub-grid'],
  ['lazy', 'Lazy'],
  ['detail', 'Detail'],
  ['virtual', 'Virtual'],
  ['pagination', 'Pagination'],
  ['theme', 'Theming'],
]
</script>

<template>
  <header class="pg-header">
    <h1>vue-grid</h1>
    <nav class="pg-nav">
      <a v-for="[id, label] in sections" :key="id" :href="`#${id}`">{{ label }}</a>
    </nav>
    <span class="pg-spacer" />
    <label><input v-model="dark" type="checkbox" data-testid="dark-toggle" /> Dark</label>
  </header>
  <main>
    <BasicDemo />
    <PinnedDemo />
    <SubgridDemo />
    <DetailDemo />
    <VirtualDemo />
    <PaginationDemo />
    <ThemeDemo />
  </main>
</template>
