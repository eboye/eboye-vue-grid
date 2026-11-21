import { config } from '@vue/test-utils'
import { createVueGrid } from '../src/registry/plugin'
import { allRenderers } from '../src/renderers'

// Renderers are opt-in (tree-shaking); most specs use them by name, so register them all once —
// like an app doing `app.use(createVueGrid({ renderers: allRenderers }))`.
// The opt-in behaviour itself is covered in VGrid.spec.ts ("renderers are opt-in").
config.global.plugins = [createVueGrid({ renderers: allRenderers })]
