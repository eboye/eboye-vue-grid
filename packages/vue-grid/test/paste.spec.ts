import { describe, expect, it } from 'vitest'
import { parseClipboard, parseDate, parseNumber, pasteArea, pasteValue } from '../src/core/paste'

describe('parseClipboard', () => {
  it('tabs and line breaks, the trailing break dropped, CRLF too', () => {
    expect(parseClipboard('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(parseClipboard('one')).toEqual([['one']])
    expect(parseClipboard('a\t\tc')).toEqual([['a', '', 'c']])
  })
  it('quoted cells hold tabs, line breaks and quotes; a quote inside text is text', () => {
    expect(parseClipboard('"two\nlines"\t"say ""hi"""\n5" screen\tx')).toEqual([
      ['two\nlines', 'say "hi"'],
      ['5" screen', 'x'],
    ])
  })
})

describe('parseNumber', () => {
  it.each([
    ['1234.5', 'en-US', 1234.5],
    ['1,234.50', 'en-US', 1234.5],
    ['1.234,50', 'de', 1234.5],
    ['€ 1 234,5', 'fr', 1234.5],
    ['$1,234', 'en-US', 1234],
    ['1,234', 'de', 1.234],
    ['1.234', 'de', 1234],
    ['1.234', 'en-US', 1.234],
    ['12,5', 'en-US', 12.5],
    ['-12%', 'en-US', -12],
    ['(12.50)', 'en-US', -12.5],
    ['1,234,567.8', 'en-US', 1234567.8],
    ['1e3', 'en-US', 1000],
  ])('%s (%s) → %s', (text, locale, n) => expect(parseNumber(text, locale)).toBe(n))
  it.each(['abc', '1.2.3,4,5x', '', '--1'])('%s → null', (text) =>
    expect(parseNumber(text, 'en-US')).toBeNull(),
  )
})

describe('parseDate', () => {
  const ymd = (d: Date | null) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate()]
  it('ISO, and the locale’s order', () => {
    expect(ymd(parseDate('2026-05-23', 'en-US'))).toEqual([2026, 5, 23])
    expect(ymd(parseDate('05/23/2026', 'en-US'))).toEqual([2026, 5, 23])
    expect(ymd(parseDate('23.05.2026', 'de'))).toEqual([2026, 5, 23])
    expect(ymd(parseDate('23/05/2026', 'en-GB'))).toEqual([2026, 5, 23])
    expect(ymd(parseDate('23.5.26.', 'sr'))).toEqual([2026, 5, 23])
    expect(parseDate('31.02.2026', 'de')).toBeNull()
    expect(parseDate('soon', 'en-US')).toBeNull()
    const t = parseDate('05/23/2026 14:30', 'en-US')!
    expect([t.getHours(), t.getMinutes()]).toEqual([14, 30])
  })
})

describe('pasteValue', () => {
  const ctx = { locale: 'en-US', oldValue: null }
  it('numbers, blanks, and errors', () => {
    expect(pasteValue(' €12.50 ', 'number', ctx)).toBe(12.5)
    expect(pasteValue('', 'number', ctx)).toBeNull()
    expect(pasteValue('n/a', 'number', ctx)).toBeInstanceOf(Error)
  })
  it('dates keep the type the cell had', () => {
    expect(pasteValue('05/23/2026', 'date', { ...ctx, oldValue: '2026-01-01' })).toBe('2026-05-23')
    expect(pasteValue('05/23/2026', 'date', { ...ctx, oldValue: new Date() })).toBeInstanceOf(Date)
    expect(typeof pasteValue('05/23/2026', 'date', { ...ctx, oldValue: 0 })).toBe('number')
    const iso = pasteValue('2026-05-23', 'date', { ...ctx, oldValue: '2026-01-01T10:00:00Z' })
    expect(iso).toMatch(/^2026-05-2\dT/)
  })
  it('yes / no in English and in the grid’s words', () => {
    expect(pasteValue('Yes', 'checkbox', ctx)).toBe(true)
    expect(pasteValue('0', 'checkbox', ctx)).toBe(false)
    expect(pasteValue('Da', 'checkbox', { ...ctx, yes: 'Da', no: 'Ne' })).toBe(true)
    expect(pasteValue('maybe', 'checkbox', ctx)).toBeInstanceOf(Error)
  })
  it('a select takes a choice by value or label', () => {
    const options = [{ value: 'won', label: 'Won' }, { value: 'lost' }]
    expect(pasteValue('WON', 'select', { ...ctx, options })).toBe('won')
    expect(pasteValue('lost', 'select', { ...ctx, options })).toBe('lost')
    expect(pasteValue('void', 'select', { ...ctx, options })).toBeInstanceOf(Error)
  })
  it('text is kept as it is', () => {
    expect(pasteValue('  Ana  ', 'text', ctx)).toBe('  Ana  ')
  })
})

describe('pasteArea', () => {
  it('a block repeats over a range that is a whole number of blocks; else its own size', () => {
    expect(pasteArea({ rows: 1, cols: 1 }, { rows: 3, cols: 2 })).toEqual({ rows: 3, cols: 2 })
    expect(pasteArea({ rows: 2, cols: 1 }, { rows: 4, cols: 3 })).toEqual({ rows: 4, cols: 3 })
    expect(pasteArea({ rows: 2, cols: 2 }, { rows: 3, cols: 2 })).toEqual({ rows: 2, cols: 2 })
    expect(pasteArea({ rows: 2, cols: 2 }, null)).toEqual({ rows: 2, cols: 2 })
  })
})
