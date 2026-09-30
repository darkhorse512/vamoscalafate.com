import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger, toPublicError } from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
import { availabilityService } from '@/server/services/availability'
import { clientIp } from '@/server/request'

/**
 * Availability lookup for the booking widget.
 *
 * A Route Handler rather than a Server Action because the widget polls it as
 * the visitor changes date or option - that is an HTTP read, not a mutation.
 *
 * Never cached: a stale seat count is a double-sold seat.
 */
export const dynamic = 'force-dynamic'

const querySchema = z.object({
  optionId: z.string().min(1).max(64),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
})

export async function GET(request: Request) {
  try {
    const limit = await checkRateLimit(RATE_LIMITS.search, clientIp(request.headers))
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas consultas. Esperá unos segundos.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const url = new URL(request.url)
    const parsed = querySchema.safeParse({
      optionId: url.searchParams.get('optionId'),
      date: url.searchParams.get('date'),
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const slots = await availabilityService.getSlots(parsed.data.optionId, parsed.data.date)

    // `availabilityId` is deliberately stripped: the client has no use for it
    // and the booking action re-resolves the slot server-side anyway.
    return NextResponse.json(
      {
        slots: slots.map(({ availabilityId: _ignored, ...slot }) => slot),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    logger.error('Availability lookup failed', error)
    const publicError = toPublicError(error)
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
