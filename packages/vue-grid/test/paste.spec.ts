import { describe, expect, it } from 'vitest'
import {
  fillSeries,
  fillValue,
  parseClipboard,
  parseDate,
  parseNumber,
  pasteArea,
  pasteValue,
} from '../src/core/paste'

describe('parseClipboard', () => {
  it('tabs and line breaks, the trailing break dropped, CRLF too', () => {
    expect(parseClipboard('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(parseClipboard('one')).toEqual([['one']])
    expect(parseClipboard('a\t\tc')).toEqual([['a', '', 'c']])
  })
  it('keeps an explicitly quoted empty cell at the end', () => {
    expect(parseClipboard('""')).toEqual([['']])
    expect(parseClipboard('first\n""')).toEqual([['first'], ['']])
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
  it('rejects impossible ISO dates and preserves years below 100', () => {
    expect(parseDate('2026-02-30', 'en-US')).toBeNull()
    expect(parseDate('2026-02-30T12:00', 'en-US')).toBeNull()
    expect(ymd(parseDate('0050-01-01', 'en-US'))).toEqual([50, 1, 1])
    expect(pasteValue('0050-01-01', 'date', { locale: 'en-US', oldValue: '2026-01-01' })).toBe(
      '0050-01-01',
    )
  })
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

  it('rejects clock-field rollover in localized dates', () => {
    expect(parseDate('05/23/2026 12:99', 'en-US')).toBeNull()
    expect(parseDate('05/23/2026 12:00:99', 'en-US')).toBeNull()
    expect(parseDate('05/23/2026 24:00', 'en-US')).toBeNull()
    expect(ymd(parseDate('05/23/0099', 'en-US'))).toEqual([99, 5, 23])
  })
})

describe('pasteValue', () => {
  const ctx = { locale: 'en-US', oldValue: null }
  it('numbers, blanks, and errors', () => {
    expect(pasteValue(' €12.50 ', 'number', ctx)).toBe(12.5)
    expect(pasteValue('', 'number', ctx)).toBeNull()
    expect(pasteValue('n/a', 'number', ctx)).toBeInstanceOf(Error)
  })
  it('scales explicit localized percentage text for a percentage target', () => {
    expect(pasteValue('15%', 'number', { ...ctx, percent: true })).toBe(0.15)
    expect(pasteValue('15%', 'number', ctx)).toBe(15)
    expect(pasteValue('15', 'number', { ...ctx, percent: true })).toBe(15)
    const locale = 'ar-EG'
    const text = new Intl.NumberFormat(locale, { style: 'percent' }).format(-0.15)
    expect(pasteValue(text, 'number', { ...ctx, locale, percent: true })).toBe(-0.15)
  })
  it('interprets offset-free datetimes in the supplied zone and keeps explicit offsets', () => {
    const timeZone = 'America/New_York'
    const zoned = { ...ctx, locale: 'en-GB', timeZone }
    expect(pasteValue('23/05/2026 08:00:00', 'datetime', zoned)).toBe('2026-05-23T12:00:00.000Z')
    expect(pasteValue('05/23/2026 8:00:00 AM', 'datetime', { ...ctx, timeZone })).toBe(
      '2026-05-23T12:00:00.000Z',
    )
    expect(pasteValue('2026-05-23T08:00:00+02:00', 'datetime', zoned)).toBe(
      '2026-05-23T06:00:00.000Z',
    )
    expect(pasteValue('2026-11-01T01:30', 'datetime', zoned)).toBe('2026-11-01T05:30:00.000Z')
    expect(pasteValue('2026-03-08T02:30', 'datetime', zoned)).toBeInstanceOf(Error)
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

describe('fillSeries', () => {
  it('numbers a steady step apart go on; anything else repeats', () => {
    expect(fillSeries([1, 2], 3)).toEqual([3, 4, 5])
    expect(fillSeries([10, 20, 30], 2)).toEqual([40, 50])
    expect(fillSeries([0.1, 0.2], 2)).toEqual([0.3, 0.4]) // no float noise
    expect(fillSeries([1234567890123, 1234567890124], 3)).toEqual([
      1234567890125, 1234567890126, 1234567890127,
    ])
    expect(fillSeries([5, 3], 2)).toEqual([1, -1])
    expect(fillSeries([7], 3)).toEqual([7, 7, 7]) // one number: copied
    expect(fillSeries([1, 2, 4], 4)).toEqual([1, 2, 4, 1]) // no steady step: repeated
    expect(fillSeries(['a', 'b'], 3)).toEqual(['a', 'b', 'a'])
    expect(fillSeries([true], 2)).toEqual([true, true])
  })
  it('dates go on by their step in days, in the type they had', () => {
    expect(fillSeries(['2026-05-30'], 3)).toEqual(['2026-05-31', '2026-06-01', '2026-06-02'])
    expect(fillSeries(['2026-01-01', '2026-01-08'], 2)).toEqual(['2026-01-15', '2026-01-22'])
    expect(fillSeries(['0099-12-30', '0099-12-31'], 2)).toEqual(['0100-01-01', '0100-01-02'])
    expect(fillSeries(['2026-02-30'], 1)).toEqual(['2026-02-30'])
    const [d] = fillSeries([new Date(2026, 2, 28)], 1) as Date[]
    expect([d!.getMonth(), d!.getDate()]).toEqual([2, 29])
    // across the spring DST change (Europe, 29 March) the calendar step holds
    const dt = fillSeries(['2026-03-28T10:00:00.000Z', '2026-03-29T10:00:00.000Z'], 1)[0]
    expect(typeof dt).toBe('string')
    expect(dt).toMatch(/^2026-03-30T/)
  })
})

describe('fillValue', () => {
  const ctx = { locale: 'en-US', oldValue: null }
  it('a value that fits the column is kept; else read like pasted text', () => {
    expect(fillValue(12.5, 'number', ctx)).toBe(12.5)
    expect(fillValue('1,234.5', 'number', ctx)).toBe(1234.5)
    expect(fillValue('n/a', 'number', ctx)).toBeInstanceOf(Error)
    expect(fillValue(false, 'checkbox', ctx)).toBe(false)
    expect(fillValue('yes', 'checkbox', ctx)).toBe(true)
    expect(fillValue('won', 'select', { ...ctx, options: [{ value: 'won' }] })).toBe('won')
    expect(fillValue(5, 'text', ctx)).toBe('5')
    expect(fillValue(new Date(2026, 4, 23), 'date', { ...ctx, oldValue: '2026-01-01' })).toBe(
      '2026-05-23',
    )
  })
})
