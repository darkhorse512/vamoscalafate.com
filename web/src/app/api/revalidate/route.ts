import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { logger, serverEnv } from '@vamos/shared'
import { timingSafeEqual } from 'node:crypto'

const log = logger.scoped('revalidate')

/**
 * Cache purge endpoint.
 *
 * The admin application calls this after publishing content so the public site
 * reflects the change immediately - without a rebuild, a redeploy or a process
 * restart. That is the mechanism behind spec §45 and §76.
 *
 * Authenticated with REVALIDATE_SECRET, which both applications share. The
 * comparison is constant-time: a plain `===` on a secret leaks its prefix
 * through timing.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  tags: z.array(z.string().min(1).max(120)).min(1).max(40),
})

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const provided = request.headers.get('x-revalidate-secret')
  const expected = serverEnv().REVALIDATE_SECRET

  if (!provided || !secretMatches(provided, expected)) {
    log.warn('Revalidation rejected: bad secret')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  for (const tag of parsed.data.tags) {
    // `{ expire: 0 }` purges immediately rather than marking the entry stale.
    // An admin who hits "publish" expects the live page to change now, not on
    // the next background revalidation.
    revalidateTag(tag, { expire: 0 })
  }

  log.info('Cache purged', { tags: parsed.data.tags })

  return NextResponse.json({ revalidated: true, tags: parsed.data.tags, at: Date.now() })
}
