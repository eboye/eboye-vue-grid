import { createApp } from 'vue'
import { allFeatures, allRenderers, createVueGrid } from '@nocopypaste/vue-grid'
import { ratingRenderer } from '@nocopypaste/vue-grid-renderer-template'
import '@nocopypaste/vue-grid/style.css'
import '@nocopypaste/vue-grid-renderer-template/style.css'
import './playground.css'
import App from './App.vue'

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
