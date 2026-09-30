'use server'

import { prisma } from '@vamos/db'
import { actionError, actionOk, logger, toPublicError, type ActionResult } from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
import { reviewSchema } from '@vamos/validation'
import { clientIpFromContext } from '../request'

const log = logger.scoped('action:review')

/**
 * Public review submission.
 *
 * Always created with status PENDING: nothing a visitor writes appears on the
 * site until a moderator approves it. `isVerified` is set only when the
 * submitter's email matches a COMPLETED booking for that entity — it is
 * derived from booking history, never accepted from the form.
 */
export async function submitReviewAction(
  input: unknown,
  submitterEmail?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ip = await clientIpFromContext()

    const limit = await checkRateLimit(RATE_LIMITS.review, ip)
    if (!limit.allowed) return actionError('RATE_LIMITED')

    const parsed = reviewSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos del formulario.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    if (parsed.data.website) {
      log.warn('Honeypot triggered on review form', { ip })
      return actionOk({ id: 'discarded' })
    }

    const data = parsed.data

    if (!data.tourId && !data.hotelId && !data.businessId) {
      return actionError('VALIDATION_ERROR', 'Falta indicar qué estás reseñando.')
    }

    let isVerified = false
    let customerId: string | null = null

    if (submitterEmail && data.tourId) {
      const completed = await prisma.booking.findFirst({
        where: {
          status: 'COMPLETED',
          customer: { email: submitterEmail.toLowerCase() },
          items: { some: { tourId: data.tourId } },
        },
        select: { customerId: true },
      })
      if (completed) {
        isVerified = true
        customerId = completed.customerId
      }
    }

    const review = await prisma.review.create({
      data: {
        status: 'PENDING',
        rating: data.rating,
        title: data.title || null,
        content: data.content,
        authorName: data.authorName,
        authorCountry: data.authorCountry || null,
        tourId: data.tourId ?? null,
        hotelId: data.hotelId ?? null,
        businessId: data.businessId ?? null,
        customerId,
        isVerified,
      },
      select: { id: true },
    })

    log.info('Review submitted for moderation', { id: review.id, isVerified })

    return actionOk({ id: review.id })
  } catch (error) {
    log.error('Review submission failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
