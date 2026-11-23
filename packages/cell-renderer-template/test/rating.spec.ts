import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createColumnHelper, createVueGrid, VGrid as VGridComponent } from '@nocopypaste/vue-grid'
import { RatingCell, ratingRenderer } from '../src'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VGrid = VGridComponent as any

interface Product {
  id: number
  name: string
  stars: number
}

const base = { row: {}, rowKey: 1, rowIndex: 0, depth: 0, column: { key: 'stars' } }

describe('RatingCell', () => {
  it('renders filled stars and emits a rate action', async () => {
    const w = mount(RatingCell, { props: { ...base, value: 3, options: { max: 5 } } })
    const stars = w.findAll('button.vg-rating-star')
    expect(stars).toHaveLength(5)
    expect(w.findAll('.vg-rating-star-on')).toHaveLength(3)
    await stars[4]!.trigger('click')
    expect(w.emitted('action')?.[0]).toEqual(['rate', 5])
  })

  it('readonly mode renders an image with a label and no buttons', () => {
    const w = mount(RatingCell, { props: { ...base, value: 2, options: { max: 4, readonly: true } } })
    expect(w.find('button').exists()).toBe(false)
    expect(w.find('[role="img"]').attributes('aria-label')).toMatch(/2 of 4/)
  })

  it('works inside VGrid via the plugin, with typed column options', async () => {
    const col = createColumnHelper<Product>()
    const columns = [
      col({ key: 'name' }),
      col({ key: 'stars', renderer: 'rating', rendererOptions: { max: 3 } }),
      // @ts-expect-error -- `max` must be a number: proves the module augmentation types options.
      col({ key: 'bad', renderer: 'rating', rendererOptions: { max: 'three' } }),
    ]
    const w = mount(VGrid, {
      props: { rows: [{ id: 1, name: 'Desk', stars: 2 }], columns: columns.slice(0, 2), rowKey: 'id' },
      global: { plugins: [createVueGrid({ renderers: [ratingRenderer] })] },
    })
    expect(w.findAll('[data-col-key="stars"] button.vg-rating-star')).toHaveLength(3)
    await w.findAll('[data-col-key="stars"] button.vg-rating-star')[2]!.trigger('click')
    expect(w.emitted('cell-action')?.[0]?.[0]).toMatchObject({ name: 'rate', payload: 3, rowKey: 1 })
  })
})
