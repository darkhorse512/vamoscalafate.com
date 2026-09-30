import { prisma, type PaymentProvider } from '@vamos/db'
import { emailService } from '@vamos/email'
import { AppError, absoluteUrl, logger, publicEnv } from '@vamos/shared'
import type { ProviderKey, WebhookResult } from '@vamos/types'
import { getGateway } from '../payments/index.ts'
import { bookingService } from './booking.ts'

const log = logger.scoped('payment')

/**
 * PaymentService — owns the money side of a booking.
 *
 * Two rules govern everything here:
 *
 *  1. A booking is NEVER marked paid from a client-side redirect. The return
 *     URL only tells the customer what happened; the state change comes from
 *     a signature-verified webhook.
 *
 *  2. Webhook processing is idempotent. Providers retry on any non-2xx and
 *     occasionally deliver twice on success, so every event is recorded in
 *     `webhook_events` by (provider, eventId) and replays are skipped.
 */

const PROVIDER_ENUM: Record<ProviderKey, PaymentProvider> = {
  mercadopago: 'MERCADOPAGO',
  stripe: 'STRIPE',
}

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  MERCADOPAGO: 'Mercado Pago',
  STRIPE: 'Stripe',
  MANUAL: 'Pago manual',
}

export const paymentService = {
  /** Creates a provider checkout session and the matching Payment row. */
  async startCheckout(args: { bookingId: string; provider: ProviderKey }) {
    const booking = await prisma.booking.findUnique({
      where: { id: args.bookingId },
      include: {
        customer: true,
        items: { select: { tourNameSnapshot: true, optionNameSnapshot: true, adults: true, children: true } },
      },
    })

    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found')

    if (!['PENDING', 'AWAITING_PAYMENT'].includes(booking.status)) {
      throw new AppError('CONFLICT', `Booking is ${booking.status}`, {
        publicMessage: 'Esta reserva ya no admite pagos.',
      })
    }

    const gateway = getGateway(args.provider)
    const item = booking.items[0]

    const session = await gateway.createCheckout({
      bookingId: booking.id,
      bookingReference: booking.reference,
      amountCents: booking.totalCents,
      currency: booking.currency,
      items: [
        {
          title: item?.tourNameSnapshot ?? 'Reserva Vamos Calafate',
          description: item?.optionNameSnapshot,
          quantity: 1,
          unitPriceCents: booking.totalCents,
        },
      ],
      customer: {
        email: booking.customer.email,
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        phone: booking.customer.phone ?? undefined,
      },
      successUrl: absoluteUrl(`/checkout/resultado?ref=${booking.reference}&estado=exito`),
      failureUrl: absoluteUrl(`/checkout/resultado?ref=${booking.reference}&estado=error`),
      pendingUrl: absoluteUrl(`/checkout/resultado?ref=${booking.reference}&estado=pendiente`),
    })

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: PROVIDER_ENUM[args.provider],
        status: 'PENDING',
        providerReferenceId: session.providerReferenceId,
        checkoutUrl: session.checkoutUrl,
        amountCents: booking.totalCents,
        currency: booking.currency,
      },
    })

    if (booking.status === 'PENDING') {
      await bookingService.transition({ bookingId: booking.id, to: 'AWAITING_PAYMENT' })
    }

    log.info('Checkout session created', {
      bookingId: booking.id,
      reference: booking.reference,
      provider: args.provider,
    })

    return { checkoutUrl: session.checkoutUrl, reference: booking.reference }
  },

  /**
   * Processes a verified webhook.
   *
   * Signature verification has already happened in the route; this handles the
   * state change. Returns `{ duplicate: true }` when the event was seen before,
   * so the route can still answer 200 and stop the provider retrying.
   */
  async handleWebhook(providerKey: ProviderKey, result: WebhookResult) {
    const provider = PROVIDER_ENUM[providerKey]

    // Claim the event. The unique constraint on (provider, eventId) makes this
    // the idempotency gate: a concurrent duplicate delivery loses the race.
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: providerKey,
          eventId: result.eventId,
          eventType: result.eventType,
          payload: result.raw as object,
        },
      })
    } catch {
      log.info('Duplicate webhook ignored', { provider: providerKey, eventId: result.eventId })
      return { duplicate: true as const }
    }

    try {
      await this.applyWebhook(provider, providerKey, result)

      await prisma.webhookEvent.update({
        where: { provider_eventId: { provider: providerKey, eventId: result.eventId } },
        data: { processedAt: new Date() },
      })

      return { duplicate: false as const }
    } catch (error) {
      // Record the failure but re-throw: the route answers 5xx so the provider
      // retries, and the unprocessed row is visible for support.
      await prisma.webhookEvent.update({
        where: { provider_eventId: { provider: providerKey, eventId: result.eventId } },
        data: { error: error instanceof Error ? error.message : String(error) },
      })
      throw error
    }
  },

  async applyWebhook(provider: PaymentProvider, providerKey: ProviderKey, result: WebhookResult) {
    if (!result.bookingReference) {
      log.warn('Webhook carried no booking reference', { eventId: result.eventId })
      return
    }

    const booking = await prisma.booking.findUnique({
      where: { reference: result.bookingReference },
      include: {
        customer: true,
        items: {
          include: { pickupLocation: { select: { name: true } } },
        },
        payments: { where: { provider }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!booking) {
      log.warn('Webhook for unknown booking', { reference: result.bookingReference })
      return
    }

    /**
     * Amount check. A webhook claiming a different total than the booking is
     * either a provider-side error or tampering; either way it must not
     * confirm the reservation.
     */
    if (
      result.status === 'APPROVED' &&
      result.amountCents !== null &&
      result.amountCents !== booking.totalCents
    ) {
      log.error('Webhook amount mismatch — not confirming', undefined, {
        reference: booking.reference,
        expected: booking.totalCents,
        received: result.amountCents,
      })

      void emailService.adminPaymentProblem({
        reference: booking.reference,
        bookingId: booking.id,
        adminUrl: publicEnv.NEXT_PUBLIC_ADMIN_URL,
        provider: PROVIDER_LABEL[provider],
        reason: `Importe recibido (${result.amountCents}) distinto del esperado (${booking.totalCents})`,
        amountCents: result.amountCents,
        currency: result.currency ?? booking.currency,
      })
      return
    }

    const existing = booking.payments[0]
    const now = new Date()

    const paymentData = {
      status: result.status,
      providerPaymentId: result.providerPaymentId,
      providerPayload: result.raw as object,
      failureReason: result.failureReason ?? null,
      refundedCents: result.refundedCents ?? 0,
      ...(result.status === 'APPROVED' ? { paidAt: now } : {}),
      ...(result.status === 'REFUNDED' ? { refundedAt: now } : {}),
    }

    if (existing) {
      await prisma.payment.update({ where: { id: existing.id }, data: paymentData })
    } else {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider,
          amountCents: result.amountCents ?? booking.totalCents,
          currency: result.currency ?? booking.currency,
          ...paymentData,
        },
      })
    }

    const item = booking.items[0]
    const emailData = {
      reference: booking.reference,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      customerEmail: booking.customer.email,
      tourName: item?.tourNameSnapshot ?? '',
      optionName: item?.optionNameSnapshot ?? '',
      travelDate: item?.travelDate ?? now,
      departureTime: item?.departureTime ?? null,
      adults: item?.adults ?? 1,
      children: item?.children ?? 0,
      pickupLocation: item?.pickupLocation?.name ?? null,
      totalCents: booking.totalCents,
      currency: booking.currency,
    }

    switch (result.status) {
      case 'APPROVED': {
        if (booking.status === 'PAID' || booking.status === 'CONFIRMED') break

        await bookingService.transition({ bookingId: booking.id, to: 'PAID' })
        void emailService.paymentReceived({
          ...emailData,
          paidAmountCents: result.amountCents ?? booking.totalCents,
        })

        // Inventory was already reserved at booking time and the payment has
        // cleared, so confirm immediately. An operator who needs to verify
        // with a supplier first can remove this and confirm from the admin.
        await bookingService.transition({ bookingId: booking.id, to: 'CONFIRMED' })
        void emailService.bookingConfirmed(emailData)
        break
      }

      case 'REJECTED':
      case 'CANCELLED': {
        if (['PENDING', 'AWAITING_PAYMENT'].includes(booking.status)) {
          await bookingService.transition({
            bookingId: booking.id,
            to: 'CANCELLED',
            reason: result.failureReason ?? 'Pago no completado',
            releaseSeats: true,
          })
          void emailService.bookingCancelled({
            ...emailData,
            reason: 'El pago no pudo completarse.',
          })
        }
        break
      }

      case 'REFUNDED': {
        if (booking.status !== 'REFUNDED') {
          await bookingService.transition({
            bookingId: booking.id,
            to: 'REFUNDED',
            releaseSeats: true,
          })
          void emailService.refundProcessed({
            ...emailData,
            refundedCents: result.refundedCents ?? booking.totalCents,
            providerLabel: PROVIDER_LABEL[provider],
          })
        }
        break
      }

      default:
        log.info('Webhook received with pending status', {
          reference: booking.reference,
          status: result.status,
        })
    }
  },

  /** Admin-initiated refund. */
  async refund(args: { paymentId: string; amountCents: number; reason: string }) {
    const payment = await prisma.payment.findUnique({
      where: { id: args.paymentId },
      include: { booking: { select: { id: true, reference: true } } },
    })

    if (!payment) throw new AppError('NOT_FOUND', 'Payment not found')
    if (payment.status !== 'APPROVED') {
      throw new AppError('CONFLICT', 'Only approved payments can be refunded', {
        publicMessage: 'Solo se pueden reembolsar pagos aprobados.',
      })
    }
    if (!payment.providerPaymentId) {
      throw new AppError('CONFLICT', 'Payment has no provider id')
    }

    const refundable = payment.amountCents - payment.refundedCents
    if (args.amountCents > refundable) {
      throw new AppError('VALIDATION_ERROR', 'Refund exceeds refundable amount', {
        publicMessage: `El máximo reembolsable es ${refundable / 100}.`,
      })
    }

    const providerKey: ProviderKey = payment.provider === 'STRIPE' ? 'stripe' : 'mercadopago'
    const gateway = getGateway(providerKey)

    const result = await gateway.refund({
      providerPaymentId: payment.providerPaymentId,
      amountCents: args.amountCents,
      reason: args.reason,
    })

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedCents: payment.refundedCents + result.refundedCents,
        status: payment.refundedCents + result.refundedCents >= payment.amountCents ? 'REFUNDED' : payment.status,
        refundedAt: new Date(),
      },
    })

    log.info('Refund processed', {
      paymentId: payment.id,
      reference: payment.booking.reference,
      refundedCents: result.refundedCents,
    })

    return result
  },
}
