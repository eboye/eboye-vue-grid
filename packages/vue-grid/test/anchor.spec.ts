import { expect, it } from 'vitest'
import { addAnchorName } from '../src/internal/anchor'

it('keeps other inline anchors when popovers release their names out of order', () => {
  const element = document.createElement('div')
  element.style.setProperty('anchor-name', '--filter, --app', 'important')
  const releaseTooltip = addAnchorName(element, '--tooltip')
  const releaseMenu = addAnchorName(element, '--menu')
  expect(element.style.getPropertyValue('anchor-name')).toBe('--filter, --app, --tooltip, --menu')

  releaseTooltip()
  expect(element.style.getPropertyValue('anchor-name')).toBe('--filter, --app, --menu')
  releaseMenu()
  expect(element.style.getPropertyValue('anchor-name')).toBe('--filter, --app')
  expect(element.style.getPropertyPriority('anchor-name')).toBe('important')
})

it('keeps a replacement inline anchor when a popover releases its name', () => {
  const element = document.createElement('div')
  element.style.setProperty('anchor-name', '--previous-filter')
  const releaseMenu = addAnchorName(element, '--menu')
  element.style.setProperty('anchor-name', '--new-filter')

  releaseMenu()
  expect(element.style.getPropertyValue('anchor-name')).toBe('--new-filter')
})
