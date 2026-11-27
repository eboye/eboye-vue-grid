/** A date-only ISO value as UTC midnight, rejecting calendar rollover. */
export function parseIsoDay(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

/** Calendar date without the Date constructor's 1900 offset for years 0–99. */
export function localDay(year: number, month: number, day: number): Date {
  const date = new Date(0)
  date.setFullYear(year, month, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function utcDay(year: number, month: number, day: number): number {
  const date = new Date(0)
  return date.setUTCFullYear(year, month, day)
}

export function localDayKey(date: Date): string {
  const year = date.getFullYear()
  const prefix = year < 0 ? '-' : ''
  const pad = (value: number, length = 2) => String(value).padStart(length, '0')
  return `${prefix}${pad(Math.abs(year), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Gregorian wall-clock fields, including the era (1 BC corresponds to ISO year 0000). */
export function wallFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'gregory',
    hourCycle: 'h23',
    era: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })
}

/** A zoned instant's wall-clock fields expressed as a UTC timestamp. */
export function wallTime(date: Date, formatter: Intl.DateTimeFormat): number {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]))
  const year = Number(parts.year)
  return (
    utcDay(parts.era === 'BC' ? 1 - year : year, Number(parts.month) - 1, Number(parts.day)) +
    ((Number(parts.hour) * 60 + Number(parts.minute)) * 60 + Number(parts.second)) * 1000 +
    date.getUTCMilliseconds()
  )
}

/** Resolve a wall time in a zone. Pick the earlier instant on overlaps and reject nonexistent times. */
export function fromWallTime(wall: number, formatter: Intl.DateTimeFormat): Date | null {
  let earliest = Infinity
  // Sample either side of any nearby offset transition, then check each candidate's wall time.
  for (const shift of [-86_400_000, 0, 86_400_000]) {
    const probe = wall + shift
    const instant = wall + probe - wallTime(new Date(probe), formatter)
    if (instant < earliest && wallTime(new Date(instant), formatter) === wall) earliest = instant
  }
  return Number.isFinite(earliest) ? new Date(earliest) : null
}
