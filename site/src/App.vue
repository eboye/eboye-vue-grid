<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import DemoPage from './components/DemoPage.vue'
import HomePage from './components/HomePage.vue'
import { NPM, pages, REPO } from './pages'

// Hash routing (`#/grouping`): works on GitHub Pages without a server rewrite.
const route = ref(readRoute())
function readRoute() {
  return location.hash.replace(/^#\/?/, '')
}
function onHashChange() {
  route.value = readRoute()
  menuOpen.value = false
  window.scrollTo({ top: 0 })
}
window.addEventListener('hashchange', onHashChange)
onBeforeUnmount(() => window.removeEventListener('hashchange', onHashChange))

const page = computed(() => pages.find((p) => p.id === route.value))
watch(page, (p) => (document.title = p ? `${p.title} · vue-grid showcase` : 'vue-grid showcase'), {
  immediate: true,
})

const sections = computed(() => {
  const map = new Map<string, typeof pages>()
  for (const p of pages) map.set(p.section, [...(map.get(p.section) ?? []), p])
  return [...map]
})

// Theme: the system's until the visitor picks one (kept in localStorage).
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')
const stored = document.documentElement.dataset.theme
const dark = ref(stored ? stored === 'dark' : systemDark.matches)
function toggleTheme() {
  dark.value = !dark.value
  const theme = dark.value ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('vg-site-theme', theme)
  } catch {
    // Storage blocked: the choice lasts for this visit.
  }
}

const menuOpen = ref(false)
const version = __GRID_VERSION__
</script>

<template>
  <header class="site-header">
    <button
      class="site-menu-button"
      type="button"
      :aria-expanded="menuOpen"
      aria-controls="site-nav"
      @click="menuOpen = !menuOpen"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" />
      </svg>
      <span class="sr-only">Menu</span>
    </button>
    <a class="site-logo" href="#/">
      <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="var(--site-accent)" />
        <path d="M8 11h16M8 16h16M8 21h16M14 8v16" stroke="white" stroke-width="2.2" />
      </svg>
      vue-grid
    </a>
    <span class="site-version">v{{ version }}</span>
    <span class="site-spacer" />
    <a class="site-link" :href="NPM" rel="noopener">npm</a>
    <a class="site-link" :href="REPO" rel="noopener">GitHub</a>
    <button
      class="site-icon-button"
      type="button"
      :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'"
      :aria-pressed="dark"
      data-testid="theme-toggle"
      @click="toggleTheme"
    >
      <svg v-if="dark" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path
          d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" fill="currentColor" />
      </svg>
    </button>
  </header>

  <div class="site-layout">
    <nav id="site-nav" class="site-nav" :class="{ open: menuOpen }" aria-label="Examples">
      <a href="#/" :aria-current="!page ? 'page' : undefined">Overview</a>
      <template v-for="[section, items] in sections" :key="section">
        <h2>{{ section }}</h2>
        <a
          v-for="p in items"
          :key="p.id"
          :href="`#/${p.id}`"
          :aria-current="page?.id === p.id ? 'page' : undefined"
          >{{ p.title }}</a
        >
      </template>
    </nav>
    <main class="site-main">
      <DemoPage v-if="page" :key="page.id" :page="page" />
      <HomePage v-else />
    </main>
  </div>
</template>
