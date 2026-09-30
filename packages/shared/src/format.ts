/** Presentation helpers shared by both applications. */

/** 150 → "2 h 30 min"; 60 → "1 h"; 45 → "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

/** Full-day durations read better as days on listing cards. */
export function formatDurationLabel(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440)
    return days === 1 ? 'Día completo' : `${days} días`
  }
  if (minutes >= 420) return 'Día completo'
  if (minutes >= 240) return 'Medio día'
  return formatDuration(minutes)
}

const ES_DATE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const ES_DATE_SHORT = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Dates are stored as UTC-midnight `date` columns. Formatting them in UTC
 * keeps a 1 January departure from rendering as 31 December for a traveller
 * whose browser is west of Greenwich.
 */
export function formatDate(date: Date | string): string {
  return ES_DATE.format(typeof date === 'string' ? new Date(date) : date)
}

export function formatDateShort(date: Date | string): string {
  return ES_DATE_SHORT.format(typeof date === 'string' ? new Date(date) : date)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Rio_Gallegos',
  }).format(d)
}

/**
 * Coerces a value that should be a Date into one.
 *
 * Values that cross a cache or a serialisation boundary arrive as ISO strings
 * even when their type says `Date`, so anything calling a Date method on
 * possibly-cached data goes through here first.
 */
export function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

/** ISO `yyyy-mm-dd` in UTC — the wire format for availability queries. */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Parses `yyyy-mm-dd` into a UTC-midnight Date, matching the `date` column. */
export function fromISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

/** Today at UTC midnight. */
export function todayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/** Truncates on a word boundary, for meta descriptions and card excerpts. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/** Average reading speed in Spanish, rounded up to whole minutes. */
export function readingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}
