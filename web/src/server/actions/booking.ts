'use server'

import { redirect } from 'next/navigation'
import { actionError, actionOk, logger, toPublicError, type ActionResult } from '@vamos/shared'
import { checkRateLimit, RATE_LIMITS } from '@vamos/shared/rate-limit'
import { bookingSchema, checkoutStartSchema } from '@vamos/validation'
import { bookingService } from '../services/booking'
import { paymentService } from '../services/payment'
import { clientIpFromContext } from '../request'

const log = logger.scoped('action:booking')

/**
 * Booking server actions.
 *
 * Server Actions are public HTTP endpoints - the fact that a form calls them
 * does not restrict who can. Every one of them therefore re-validates its
 * input with Zod and re-prices from the database, exactly as a REST handler
 * would.
 */

export type CreateBookingResult = ActionResult<{
  bookingId: string
  reference: string
  totalCents: number
  currency: string
}>

export async function createBookingAction(
  input: unknown,
): Promise<CreateBookingResult> {
  try {
    const ip = await clientIpFromContext()

    const limit = await checkRateLimit(RATE_LIMITS.booking, ip)
    if (!limit.allowed) {
      return actionError('RATE_LIMITED')
    }

    const parsed = bookingSchema.safeParse(input)
    if (!parsed.success) {
      // Full dotted paths ("passengers.2.documentNumber"), not flatten():
      // flatten() keeps only the top-level key, which would report every
      // passenger's mistake as a single vague "passengers" error.
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        ;(fieldErrors[key] ??= []).push(issue.message)
      }
      return actionError('VALIDATION_ERROR', 'Revisá los datos marcados en el formulario.', fieldErrors)
    }

    // Honeypot: a filled hidden field means a bot. Report success so the bot
    // gets no signal, but write nothing.
    if (parsed.data.website) {
      log.warn('Honeypot triggered on booking form', { ip })
      return actionError('VALIDATION_ERROR', 'No pudimos procesar la solicitud.')
    }

    const booking = await bookingService.create({
      selection: parsed.data.selection,
      customer: parsed.data.customer,
      passengers: parsed.data.passengers,
      attribution: parsed.data.attribution,
    })

    return actionOk({
      bookingId: booking.bookingId,
      reference: booking.reference,
      totalCents: booking.totalCents,
      currency: booking.currency,
    })
  } catch (error) {
    log.error('Booking creation failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

/**
 * Starts a provider checkout and redirects.
 *
 * `redirect()` throws a control-flow signal that Next.js catches, so it must
 * be called OUTSIDE the try/catch - inside, the catch would swallow it and
 * the redirect would silently never happen.
 */
export async function startCheckoutAction(input: unknown): Promise<ActionResult<never> | never> {
  const parsed = checkoutStartSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_ERROR', 'Elegí un medio de pago válido.')
  }

  let checkoutUrl: string

  try {
    const session = await paymentService.startCheckout({
      bookingId: parsed.data.bookingId,
      provider: parsed.data.provider,
    })
    checkoutUrl = session.checkoutUrl
  } catch (error) {
    log.error('Checkout start failed', error, { bookingId: parsed.data.bookingId })
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }

  redirect(checkoutUrl)
}
