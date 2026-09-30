/**
 * Slug generation for URLs.
 *
 * Spanish content carries accents and ñ, which must be transliterated rather
 * than stripped: "Cañón" → "canon", not "cann".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

/**
 * Appends a numeric suffix until the slug is unique.
 * `exists` is supplied by the caller so this stays database-agnostic.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'item'
  if (!(await exists(root))) return root

  for (let n = 2; n < 500; n += 1) {
    const candidate = `${root}-${n}`
    if (!(await exists(candidate))) return candidate
  }

  return `${root}-${Date.now()}`
}
