import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@vamos/db'
import { logger, todayUTC, toPublicError } from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
import { availabilityService } from '@/server/services/availability'
import { clientIp } from '@/server/request'

const querySchema = z.object({
  optionId: z.string().min(1).max(64),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido'),
})

/**
 * Month view of availability for the date picker.
 *
 * Returns, per day, whether seats remain and the lowest price, so the
 * calendar can mark bookable days before the visitor picks one. This is a
 * hint for the interface only: the chosen slot is re-checked by
 * `/api/availability` and again, atomically, when the booking is created.
 */
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
      month: url.searchParams.get('month'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const option = await prisma.tourOption.findFirst({
      where: { id: parsed.data.optionId, isActive: true, tour: { status: 'PUBLISHED' } },
      select: { tourId: true },
    })
    if (!option) return NextResponse.json({ days: [] }, { headers: { 'Cache-Control': 'no-store' } })

    const [year, month] = parsed.data.month.split('-').map(Number) as [number, number]
    const monthStart = new Date(Date.UTC(year, month - 1, 1))
    const monthEnd = new Date(Date.UTC(year, month, 0))
    const today = todayUTC()
    const from = monthStart < today ? today : monthStart
    if (from > monthEnd) return NextResponse.json({ days: [] }, { headers: { 'Cache-Control': 'no-store' } })

    const days = await availabilityService.getRange({
      tourId: option.tourId,
      optionId: parsed.data.optionId,
      from: from.toISOString().slice(0, 10),
      to: monthEnd.toISOString().slice(0, 10),
    })

    return NextResponse.json(
      {
        days: days.map((day) => ({
          date: day.date,
          seatsAvailable: day.seatsAvailable,
          soldOut: day.soldOut,
          minPriceCents: Math.min(...day.slots.map((slot) => slot.priceCents)),
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    logger.error('Availability calendar lookup failed', error)
    const publicError = toPublicError(error)
    return NextResponse.json({ error: publicError.message }, { status: publicError.status })
  }
}
