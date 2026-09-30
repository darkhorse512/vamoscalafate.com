import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@vamos/db'
import type { WebhookResult } from '@vamos/types'
import { bookingService } from '../../web/src/server/services/booking'
import { paymentService } from '../../web/src/server/services/payment'
import { cleanupFixtures, createTourFixture, testCustomer, TEST_PREFIX } from './setup'

/**
 * Payment webhook processing.
 *
 * Providers retry on any non-2xx and occasionally deliver a successful event
 * twice, so idempotency is not a nicety — without it a retried notification
 * would confirm a booking repeatedly and could trigger duplicate emails or a
 * double refund.
 *
 * Signature verification is covered separately in the unit tests; these tests
 * start from an already-verified result and check what it does to the booking.
 */

async function createPendingBooking(seats = 10) {
  const fixture = await createTourFixture({ seats, priceCents: 100_000 })

  const booking = await bookingService.create({
    selection: {
      tourId: fixture.tour.id,
      optionId: fixture.option.id,
      date: fixture.isoDate,
      adults: 2,
      children: 0,
    },
    customer: testCustomer(),
  })

  return { fixture, booking }
}

function approvedEvent(reference: string, amountCents: number, eventId: string): WebhookResult {
  return {
    eventId: `${TEST_PREFIX}${eventId}`,
    eventType: 'checkout.session.completed',
    bookingReference: reference,
    providerPaymentId: 'pi_test_123',
    status: 'APPROVED',
    amountCents,
    currency: 'ARS',
    raw: { test: true },
  }
}

beforeEach(async () => {
  await cleanupFixtures()
})

afterAll(async () => {
  await cleanupFixtures()
  await prisma.$disconnect()
})

describe('payment webhook idempotency', () => {
  it('processes an approved payment and confirms the booking', async () => {
    const { booking } = await createPendingBooking()

    const result = await paymentService.handleWebhook(
      'stripe',
      approvedEvent(booking.reference, booking.totalCents, 'evt-1'),
    )

    expect(result.duplicate).toBe(false)

    const updated = await prisma.booking.findUnique({
      where: { id: booking.bookingId },
      select: { status: true },
    })
    expect(updated?.status).toBe('CONFIRMED')

    const payment = await prisma.payment.findFirst({
      where: { bookingId: booking.bookingId },
      select: { status: true, paidAt: true, amountCents: true },
    })
    expect(payment?.status).toBe('APPROVED')
    expect(payment?.paidAt).toBeTruthy()
  })

  it('SKIPS a duplicate delivery of the same event', async () => {
    const { booking } = await createPendingBooking()
    const event = approvedEvent(booking.reference, booking.totalCents, 'evt-dup')

    const first = await paymentService.handleWebhook('stripe', event)
    const second = await paymentService.handleWebhook('stripe', event)
    const third = await paymentService.handleWebhook('stripe', event)

    expect(first.duplicate).toBe(false)
    expect(second.duplicate).toBe(true)
    expect(third.duplicate).toBe(true)

    // Exactly one payment row, despite three deliveries.
    const payments = await prisma.payment.count({ where: { bookingId: booking.bookingId } })
    expect(payments).toBe(1)
  })

  it('records the event so a replay is detectable', async () => {
    const { booking } = await createPendingBooking()
    const event = approvedEvent(booking.reference, booking.totalCents, 'evt-recorded')

    await paymentService.handleWebhook('stripe', event)

    const recorded = await prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: 'stripe', eventId: event.eventId } },
      select: { processedAt: true, eventType: true },
    })

    expect(recorded).toBeTruthy()
    expect(recorded?.processedAt).toBeTruthy()
    expect(recorded?.eventType).toBe('checkout.session.completed')
  })

  it('treats the same event id from different providers as distinct', async () => {
    const { booking } = await createPendingBooking()
    const event = approvedEvent(booking.reference, booking.totalCents, 'evt-shared-id')

    const stripe = await paymentService.handleWebhook('stripe', event)
    const mercadopago = await paymentService.handleWebhook('mercadopago', event)

    expect(stripe.duplicate).toBe(false)
    // Idempotency is keyed on (provider, eventId), not eventId alone.
    expect(mercadopago.duplicate).toBe(false)
  })
})

describe('payment webhook amount verification', () => {
  it('REFUSES to confirm when the amount does not match the booking', async () => {
    const { booking } = await createPendingBooking()

    // A notification claiming a far smaller payment than the booking total.
    await paymentService.handleWebhook(
      'stripe',
      approvedEvent(booking.reference, 1, 'evt-mismatch'),
    )

    const updated = await prisma.booking.findUnique({
      where: { id: booking.bookingId },
      select: { status: true },
    })

    // Still awaiting payment — the mismatch must not confirm it.
    expect(updated?.status).toBe('AWAITING_PAYMENT')
  })

  it('confirms when the amount matches exactly', async () => {
    const { booking } = await createPendingBooking()

    await paymentService.handleWebhook(
      'stripe',
      approvedEvent(booking.reference, booking.totalCents, 'evt-exact'),
    )

    const updated = await prisma.booking.findUnique({
      where: { id: booking.bookingId },
      select: { status: true },
    })
    expect(updated?.status).toBe('CONFIRMED')
  })
})

describe('payment webhook failure handling', () => {
  it('cancels the booking and releases seats when payment is rejected', async () => {
    const { fixture, booking } = await createPendingBooking(10)

    let availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(2)

    await paymentService.handleWebhook('stripe', {
      eventId: `${TEST_PREFIX}evt-rejected`,
      eventType: 'payment_intent.payment_failed',
      bookingReference: booking.reference,
      providerPaymentId: 'pi_failed',
      status: 'REJECTED',
      amountCents: booking.totalCents,
      currency: 'ARS',
      failureReason: 'insufficient_funds',
      raw: {},
    })

    const updated = await prisma.booking.findUnique({
      where: { id: booking.bookingId },
      select: { status: true },
    })
    expect(updated?.status).toBe('CANCELLED')

    availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    // Seats returned to inventory so someone else can book them.
    expect(availability?.seatsBooked).toBe(0)
  })

  it('ignores a webhook for an unknown booking reference', async () => {
    const result = await paymentService.handleWebhook('stripe', {
      eventId: `${TEST_PREFIX}evt-unknown`,
      eventType: 'checkout.session.completed',
      bookingReference: 'VC-DOESNOTEXIST',
      providerPaymentId: 'pi_x',
      status: 'APPROVED',
      amountCents: 1000,
      currency: 'ARS',
      raw: {},
    })

    // Recorded as handled so the provider stops retrying, but nothing changed.
    expect(result.duplicate).toBe(false)
  })

  it('marks a refunded booking and releases its seats', async () => {
    const { fixture, booking } = await createPendingBooking(10)

    await paymentService.handleWebhook(
      'stripe',
      approvedEvent(booking.reference, booking.totalCents, 'evt-paid-then-refund'),
    )

    await paymentService.handleWebhook('stripe', {
      eventId: `${TEST_PREFIX}evt-refund`,
      eventType: 'charge.refunded',
      bookingReference: booking.reference,
      providerPaymentId: 'pi_test_123',
      status: 'REFUNDED',
      amountCents: booking.totalCents,
      currency: 'ARS',
      refundedCents: booking.totalCents,
      raw: {},
    })

    const updated = await prisma.booking.findUnique({
      where: { id: booking.bookingId },
      select: { status: true },
    })
    expect(updated?.status).toBe('REFUNDED')

    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(0)
  })
})
