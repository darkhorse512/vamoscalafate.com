import { prisma } from '@vamos/db'
import { logger } from './logger.ts'

/**
 * Database-backed fixed-window rate limiter.
 *
 * A per-process in-memory counter would be defeated by PM2 cluster mode and
 * reset on every deploy, so buckets live in PostgreSQL where both apps and all
 * workers share them. Fixed windows (not sliding) keep it to a single upsert.
 *
 * For very high-volume endpoints, swap this implementation for Redis — the
 * call sites only depend on the `checkRateLimit` signature.
 */

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export type RateLimitRule = {
  /** Distinct bucket namespace, e.g. 'login' or 'contact'. */
  name: string
  limit: number
  windowSeconds: number
}

export const RATE_LIMITS = {
  login: { name: 'login', limit: 5, windowSeconds: 900 },
  contact: { name: 'contact', limit: 5, windowSeconds: 3600 },
  submission: { name: 'submission', limit: 3, windowSeconds: 3600 },
  booking: { name: 'booking', limit: 10, windowSeconds: 3600 },
  search: { name: 'search', limit: 60, windowSeconds: 60 },
  review: { name: 'review', limit: 3, windowSeconds: 86400 },
} as const satisfies Record<string, RateLimitRule>

export async function checkRateLimit(
  rule: RateLimitRule,
  identifier: string,
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStart = Math.floor(now.getTime() / (rule.windowSeconds * 1000))
  const bucketKey = `${rule.name}:${identifier}:${windowStart}`
  const expiresAt = new Date((windowStart + 1) * rule.windowSeconds * 1000)

  try {
    const counter = await prisma.rateLimitCounter.upsert({
      where: { bucketKey },
      create: { bucketKey, count: 1, expiresAt },
      update: { count: { increment: 1 } },
      select: { count: true },
    })

    const remaining = Math.max(0, rule.limit - counter.count)
    return {
      allowed: counter.count <= rule.limit,
      remaining,
      retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
    }
  } catch (error) {
    // A limiter outage must not take down the endpoint it protects. Fail open,
    // but log loudly so the condition is visible.
    logger.error('Rate limiter unavailable — failing open', error, { rule: rule.name })
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 }
  }
}

/** Clears a bucket early, e.g. after a successful login. */
export async function resetRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  const windowStart = Math.floor(Date.now() / (rule.windowSeconds * 1000))
  await prisma.rateLimitCounter
    .deleteMany({ where: { bucketKey: `${rule.name}:${identifier}:${windowStart}` } })
    .catch(() => undefined)
}

/** Housekeeping for expired buckets; run from a cron or on a low-traffic path. */
export async function pruneRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimitCounter.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return count
}
