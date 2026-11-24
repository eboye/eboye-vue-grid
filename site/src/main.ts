import { createApp } from 'vue'
import { allFeatures, allRenderers, createVueGrid } from '@nocopypaste/vue-grid'
import { ratingRenderer } from '@nocopypaste/vue-grid-renderer-template'
import '@nocopypaste/vue-grid/style.css'
import '@nocopypaste/vue-grid-renderer-template/style.css'
import './site.css'
import App from './App.vue'

// Every renderer and feature, app-wide: a real app imports only the ones it uses.
createApp(App)
  .use(
    createVueGrid({
      renderers: [...allRenderers, ratingRenderer],
      features: allFeatures,
      locale: 'en-US',
      currency: 'EUR',
      timeZone: 'UTC',
    }),
  )
  .mount('#app')
