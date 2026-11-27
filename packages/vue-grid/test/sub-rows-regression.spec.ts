import { flushPromises } from '@vue/test-utils'
import { effectScope } from 'vue'
import { expect, it, vi } from 'vitest'
import { useSubRows } from '../src/composables/useSubRows'

const parent = { id: 1 }

it('does not load children for a detail-only row when the hint is false', async () => {
  const scope = effectScope()
  const load = vi.fn(async () => [])
  try {
    const sub = scope.run(() =>
      useSubRows({
        getKey: (row: { id: number }) => row.id,
        subRows: () => undefined,
        loadSubRows: () => load,
        hasSubRows: () => () => false,
        onError: vi.fn(),
      }),
    )!
    sub.ensure(parent)
    await flushPromises()
    expect(load).not.toHaveBeenCalled()
    expect(sub.state(parent)).toBeUndefined()
  } finally {
    scope.stop()
  }
})

it('ignores lazy child completion after the grid scope is stopped', async () => {
  const scope = effectScope()
  let finish!: (rows: { id: number }[]) => void
  const pending = new Promise<{ id: number }[]>((resolve) => {
    finish = resolve
  })
  const load = vi.fn(() => pending)
  const onLoaded = vi.fn()
  const sub = scope.run(() =>
    useSubRows({
      getKey: (row: { id: number }) => row.id,
      subRows: () => undefined,
      loadSubRows: () => load,
      hasSubRows: () => undefined,
      onError: vi.fn(),
      onLoaded,
    }),
  )!
  sub.ensure(parent)
  await flushPromises()
  expect(load).toHaveBeenCalledWith(parent)
  scope.stop()
  finish([{ id: 2 }])
  await flushPromises()
  expect(onLoaded).not.toHaveBeenCalled()
  expect(sub.state(parent)).toBeUndefined()
})
