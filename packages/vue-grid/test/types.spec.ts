import { describe, expect, it } from 'vitest'
import { createColumnHelper } from '../src/core/helpers'
import { currencyRenderer, statusRenderer } from '../src/renderers'

interface Order {
  id: number
  total: number
  status: string
}

// Compile-time checks (run by `vue-tsc`): a renderer definition on a column types its options.
const col = createColumnHelper<Order>()

describe('typed renderer definitions on columns', () => {
  it('accepts valid options and rejects invalid ones', () => {
    const columns = [
      col({ key: 'total', renderer: currencyRenderer, rendererOptions: { currency: 'EUR', clickable: true } }),
      col({ key: 'status', renderer: statusRenderer, rendererOptions: { tone: { Paid: 'success' }, variant: 'outline' } }),
      // @ts-expect-error — `currency` must be a string or a function, not a number
      col({ key: 'total', renderer: currencyRenderer, rendererOptions: { currency: 42 } }),
      // @ts-expect-error — unknown option for the status renderer
      col({ key: 'status', renderer: statusRenderer, rendererOptions: { notAnOption: true } }),
      // registered names keep working
      col({ key: 'total', renderer: 'currency', rendererOptions: { currency: 'USD' } }),
    ]
    expect(columns).toHaveLength(5)
  })
})
