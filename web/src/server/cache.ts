import { unstable_cache } from 'next/cache'

/**
 * Cached data-access wrapper.
 *
 * Public content - tours, destinations, hotels, blog posts - changes rarely
 * and is read constantly, so every public query goes through here. Reads are
 * tagged, and the admin purges those tags on publish (see the revalidation
 * route), which is what lets an editor change a tour without a rebuild or a
 * restart.
 *
 * `revalidate` is a backstop, not the primary mechanism: correctness comes
 * from tag invalidation, and the timer only bounds staleness if a purge is
 * ever missed.
 */

export const REVALIDATE = {
  /** Catalogue content. Purged explicitly on publish. */
  content: 3600,
  /** Listing pages, which aggregate many rows. */
  listing: 1800,
  /** Inventory. Short-lived: seat counts change with every booking. */
  availability: 60,
  /** Sitemap and other derived indexes. */
  index: 3600,
} as const

/**
 * Matches exactly the ISO-8601 form `JSON.stringify` produces for a Date.
 *
 * Deliberately strict - anchored, millisecond-precision, UTC `Z` suffix - so
 * ordinary content strings cannot be mistaken for timestamps.
 */
const SERIALISED_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/**
 * Restores `Date` objects lost to cache serialisation.
 *
 * Next's data cache persists entries as JSON, so a `Date` written by Prisma
 * comes back as a string on any cache HIT while being a real `Date` on a MISS.
 * The types claim `Date` either way, so TypeScript cannot catch the difference
 * and the failure only appears once something is actually cached - a nasty,
 * intermittent class of bug.
 *
 * Reviving here restores the contract for every consumer at once, rather than
 * making each call site defensive and hoping the next one remembers.
 */
function reviveDates<T>(value: T, depth = 0): T {
  // Prisma payloads are shallow relative to this; the guard is for safety.
  if (depth > 8) return value
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return (SERIALISED_DATE.test(value) ? new Date(value) : value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item, depth + 1)) as T
  }

  if (typeof value === 'object') {
    // Already a Date on a cache miss - leave it alone.
    if (value instanceof Date) return value

    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = reviveDates(item, depth + 1)
    }
    return out as T
  }

  return value
}

export function cachedQuery<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options: { tags: string[]; revalidate?: number },
): (...args: Args) => Promise<Result> {
  const cached = unstable_cache(fn, keyParts, {
    tags: options.tags,
    revalidate: options.revalidate ?? REVALIDATE.content,
  })

  return async (...args: Args) => reviveDates(await cached(...args))
}
