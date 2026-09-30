import { headers } from 'next/headers'

/**
 * Request helpers.
 *
 * Behind Nginx the socket address is always 127.0.0.1, so the real client
 * address comes from `X-Forwarded-For`. The deploy config sets that header
 * (see deploy/nginx/vamoscalafate.conf); if it did not, every visitor would
 * share one rate-limit bucket.
 *
 * Only the FIRST entry is used - later entries are client-supplied and can be
 * forged. This is safe precisely because Nginx overwrites the header.
 */
export function clientIp(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return requestHeaders.get('x-real-ip') ?? 'unknown'
}

/** Same, for Server Actions, which have no Request object. */
export async function clientIpFromContext(): Promise<string> {
  return clientIp(await headers())
}

export async function userAgent(): Promise<string | null> {
  return (await headers()).get('user-agent')
}
