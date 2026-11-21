import { createApp } from 'vue'
import { allRenderers, createVueGrid } from '@eboye/vue-grid'
import { ratingRenderer } from '@eboye/vue-grid-renderer-template'
import '@eboye/vue-grid/style.css'
import '@eboye/vue-grid-renderer-template/style.css'
import './playground.css'
import App from './App.vue'

createApp(App)
  .use(createVueGrid({ renderers: [...allRenderers, ratingRenderer], locale: 'en-US', currency: 'EUR', timeZone: 'UTC' }))
  .mount('#app')
