export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** Builds a URL with updated query params, dropping empties and resetting page. */
export function buildQuery(
  base: string,
  current: URLSearchParams,
  updates: Record<string, string | number | undefined | null>,
): string {
  const params = new URLSearchParams(current)

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === '') params.delete(key)
    else params.set(key, String(value))
  }

  if (!('page' in updates)) params.delete('page')

  const query = params.toString()
  return query ? `${base}?${query}` : base
}
