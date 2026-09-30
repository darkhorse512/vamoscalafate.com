/** Small shared helpers used across components. */

/**
 * Conditional class names.
 *
 * Deliberately dependency-free: `clsx` plus `tailwind-merge` would add a
 * client-side runtime for something this small. Later classes are not merged,
 * so avoid passing conflicting Tailwind utilities for the same property.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/**
 * Preserves UTM parameters across an internal navigation.
 *
 * Campaign attribution is lost the moment a redirect drops the query string,
 * which then makes paid traffic look organic. Any link that crosses into the
 * booking flow goes through here.
 */
const ATTRIBUTION_KEYS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'msclkid',
]

export function withAttribution(href: string, params: URLSearchParams | null): string {
  if (!params) return href

  const carried = new URLSearchParams()
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key)
    if (value) carried.set(key, value)
  }

  if ([...carried.keys()].length === 0) return href

  const separator = href.includes('?') ? '&' : '?'
  return `${href}${separator}${carried.toString()}`
}

/** Extracts attribution from a server-side searchParams object. */
export function extractAttribution(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of ATTRIBUTION_KEYS) {
    const value = searchParams[key]
    const single = Array.isArray(value) ? value[0] : value
    if (single) out[key] = single.slice(0, 200)
  }
  return out
}

/** Builds a URL with updated query params, dropping empty values. */
export function buildQuery(
  base: string,
  current: URLSearchParams | Record<string, string | undefined>,
  updates: Record<string, string | number | undefined | null>,
): string {
  const params = new URLSearchParams(
    current instanceof URLSearchParams
      ? current
      : Object.entries(current).filter((e): e is [string, string] => Boolean(e[1])),
  )

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === '') params.delete(key)
    else params.set(key, String(value))
  }

  // Changing a filter must reset pagination, or page 4 of the old result set
  // is requested against a smaller new one and renders empty.
  if (!('page' in updates)) params.delete('page')

  const query = params.toString()
  return query ? `${base}?${query}` : base
}

/**
 * Converts a YouTube or Vimeo watch URL into its privacy-preserving embed
 * form. Returns null for anything else, so an unexpected host is never framed.
 */
export function toEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = parsed.searchParams.get('v')
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1)
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'vimeo.com') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  } catch {
    return null
  }
}
