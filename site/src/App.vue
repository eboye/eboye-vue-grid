<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import DemoPage from './components/DemoPage.vue'
import HomePage from './components/HomePage.vue'
import { NPM, pages, REPO } from './pages'

// Hash routing (`#/grouping`): works on GitHub Pages without a server rewrite.
const route = ref(readRoute())
function readRoute() {
  return location.hash.replace(/^#\/?/, '')
}
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
// Match the mobile navigation breakpoint in site.css.
const mobileNav = window.matchMedia('(width < 56rem)')
const menuButton = useTemplateRef<HTMLButtonElement>('menuButton')
const nav = useTemplateRef<HTMLElement>('nav')
const main = useTemplateRef<HTMLElement>('main')

async function toggleMenu() {
  if (menuOpen.value) {
    closeMenu()
    return
  }
  menuOpen.value = true
  await nextTick()
  nav.value?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')?.focus()
}

function closeMenu() {
  menuOpen.value = false
  menuButton.value?.focus()
}

function onNavClick(event: MouseEvent) {
  if (
    !menuOpen.value ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  )
    return
  const link = event.currentTarget as HTMLAnchorElement
  // Activating the current link does not emit hashchange.
  if (link.hash === location.hash) closeMenu()
}

async function onHashChange() {
  route.value = readRoute()
  menuOpen.value = false
  await nextTick()
  main.value?.focus({ preventScroll: true })
  window.scrollTo({ top: 0 })
}

function onKeydown(event: KeyboardEvent) {
  if (menuOpen.value && event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
  }
}

function onNavBreakpoint() {
  if (!mobileNav.matches) menuOpen.value = false
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('keydown', onKeydown)
  mobileNav.addEventListener('change', onNavBreakpoint)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.removeEventListener('keydown', onKeydown)
  mobileNav.removeEventListener('change', onNavBreakpoint)
})

const version = __GRID_VERSION__
</script>

<template>
  <header class="site-header">
    <button
      ref="menuButton"
      class="site-menu-button"
      type="button"
      :aria-expanded="menuOpen"
      aria-controls="site-nav"
      @click="toggleMenu"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" />
      </svg>
      <span class="sr-only">Menu</span>
    </button>
    <a class="site-logo" href="#/" @click="onNavClick">
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
    <nav id="site-nav" ref="nav" class="site-nav" :class="{ open: menuOpen }" aria-label="Examples">
      <a href="#/" :aria-current="!page ? 'page' : undefined" @click="onNavClick">Overview</a>
      <template v-for="[section, items] in sections" :key="section">
        <h2>{{ section }}</h2>
        <a
          v-for="p in items"
          :key="p.id"
          :href="`#/${p.id}`"
          :aria-current="page?.id === p.id ? 'page' : undefined"
          @click="onNavClick"
          >{{ p.title }}</a
        >
      </template>
    </nav>
    <main
      ref="main"
      class="site-main"
      tabindex="-1"
      aria-labelledby="site-page-title"
      :inert="menuOpen"
    >
      <DemoPage v-if="page" :key="page.id" :page="page" />
      <HomePage v-else />
    </main>
  </div>
</template>
