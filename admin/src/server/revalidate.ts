import 'server-only'
import { tagsForEntity } from '@vamos/db'
import { logger, publicEnv, serverEnv } from '@vamos/shared'

const log = logger.scoped('revalidate')

/**
 * Cache invalidation across application boundaries.
 *
 * The admin and the public site are separate Node processes with separate
 * caches, so `revalidateTag` here would do nothing for visitors. Instead the
 * admin POSTs to the public app's /api/revalidate endpoint with the shared
 * secret, and that process purges its own tags.
 *
 * This is what lets an editor publish a tour and see it live immediately,
 * with no rebuild and no PM2 restart (spec §45, §76).
 *
 * Failures are logged, never thrown: a purge that does not land means content
 * is briefly stale, which is far better than losing the edit that triggered it.
 */
export async function revalidatePublicSite(tags: string[]): Promise<void> {
  if (tags.length === 0) return

  const url = `${publicEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/api/revalidate`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': serverEnv().REVALIDATE_SECRET,
      },
      body: JSON.stringify({ tags }),
      // Bounded: a hung public site must not hang the admin request.
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })

    if (!response.ok) {
      log.warn('Public cache purge rejected', { status: response.status, tags })
      return
    }

    log.info('Public cache purged', { tags })
  } catch (error) {
    log.error('Could not reach the public site to purge its cache', error, { url, tags })
  }
}

/** Convenience wrapper keyed on entity type. */
export async function revalidateEntity(
  entity: Parameters<typeof tagsForEntity>[0],
  slug?: string,
): Promise<void> {
  await revalidatePublicSite(tagsForEntity(entity, slug))
}
