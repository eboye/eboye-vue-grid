/** A date-only ISO value as UTC midnight, rejecting calendar rollover. */
export function parseIsoDay(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}
