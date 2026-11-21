import { describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, inject } from 'vue'
import { createRendererRegistry, defineCellRenderer } from '../src/registry/registry'
import { createVueGrid, GRID_CONFIG_KEY } from '../src/registry/plugin'

const A = defineComponent({ render: () => h('span', 'a') })
const B = defineComponent({ render: () => h('span', 'b') })

describe('registry', () => {
  it('later layers override earlier ones; unknown names are undefined', () => {
    const one = defineCellRenderer({ name: 'x', component: A })
    const two = defineCellRenderer({ name: 'x', component: B, defaults: { n: 1 } })
    const reg = createRendererRegistry([one], undefined, [two])
    expect(reg.get('x')?.component).toBe(B)
    expect(reg.get('nope')).toBeUndefined()
  })

  it('plugin provides config to the app', () => {
    let seen: unknown
    const Probe = defineComponent({
      setup() {
        seen = inject(GRID_CONFIG_KEY)
        return () => null
      },
    })
    const app = createApp(Probe)
    app.use(createVueGrid({ locale: 'sr-RS', currency: 'RSD' }))
    app.mount(document.createElement('div'))
    expect(seen).toMatchObject({ locale: 'sr-RS', currency: 'RSD' })
    app.unmount()
  })
})
