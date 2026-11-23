import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { allFeatures, allRenderers, createVueGrid } from '@nocopypaste/vue-grid'
import { ratingRenderer } from '@nocopypaste/vue-grid-renderer-template'
import '@nocopypaste/vue-grid/style.css'
import '@nocopypaste/vue-grid-renderer-template/style.css'
import './preview.css'

// Same app-wide setup a consumer would do in main.ts: defaults + the add-on renderer.
setup((app) => {
  app.use(
    createVueGrid({
      renderers: [...allRenderers, ratingRenderer],
      features: allFeatures, // every story can sort, filter and page; Grid/Features shows opting in
      locale: 'en-US',
      currency: 'EUR',
      timeZone: 'UTC',
    }),
  )
})

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    controls: { expanded: true, sort: 'requiredFirst' },
    options: {
      storySort: {
        order: ['Introduction', 'Grid', 'Renderers', 'Recipes', 'Theming', 'Components', 'Add-ons'],
      },
    },
  },
  globalTypes: {
    scheme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Scheme',
        icon: 'mirror',
        items: [
          { value: 'light dark', title: 'Follow OS' },
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { scheme: 'light' },
  decorators: [
    (story, context) => {
      // The grid's colours use light-dark(), so the scheme is just `color-scheme`.
      document.documentElement.style.colorScheme = String(context.globals.scheme ?? 'light')
      return { components: { story }, template: '<story />' }
    },
  ],
}

export default preview
