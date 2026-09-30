import { NextResponse } from 'next/server'
import { logger } from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
import { searchQuerySchema } from '@vamos/validation'
import { searchSite } from '@/server/queries/search'
import { clientIp } from '@/server/request'

/**
 * Site search as JSON, for the header's type-ahead.
 *
 * `X-Robots-Tag: noindex` stops search-result URLs entering the index - an
 * unbounded set of thin pages is exactly what spec §38 warns against.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const limit = await checkRateLimit(RATE_LIMITS.search, clientIp(request.headers))
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Demasiadas consultas' }, { status: 429 })
    }

    const url = new URL(request.url)
    const parsed = searchQuerySchema.safeParse({
      q: url.searchParams.get('q') ?? '',
      tipo: url.searchParams.get('tipo') ?? 'todo',
    })

    if (!parsed.success) {
      return NextResponse.json({ query: '', total: 0, groups: [] })
    }

    const results = await searchSite(parsed.data.q, parsed.data.tipo)

    return NextResponse.json(results, {
      headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    logger.error('Search failed', error)
    return NextResponse.json({ error: 'Search unavailable' }, { status: 500 })
  }
}
