'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@vamos/db'
import { emailService } from '@vamos/email'
import { actionError, actionOk, logger, toPublicError, type ActionResult } from '@vamos/shared'
import { canTransitionBooking } from '@vamos/types'
import { bookingStatusUpdateSchema, refundRequestSchema } from '@vamos/validation'
import { requirePermission } from '../auth'
import { recordAudit } from '../audit'
import { refundPayment } from '../payments'

const log = logger.scoped('admin:bookings')

/**
 * Booking management actions.
 *
 * Every one:
 *   1. checks the caller's permission server-side,
 *   2. validates input with the shared Zod schema,
 *   3. enforces the booking state machine,
 *   4. writes an audit entry with before/after.
 *
 * Step 1 is not redundant with the page-level check: a Server Action is a
 * public HTTP endpoint and can be invoked without ever rendering the page.
 */

export async function updateBookingStatusAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('bookings:update')

    const parsed = bookingStatusUpdateSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá los datos.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const { bookingId, status, reason, internalNotes, notifyCustomer } = parsed.data

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        items: {
          include: { pickupLocation: { select: { name: true } } },
        },
      },
    })

    if (!booking) return actionError('NOT_FOUND', 'La reserva no existe.')

    if (!canTransitionBooking(booking.status, status)) {
      return actionError(
        'CONFLICT',
        `No se puede pasar de ${booking.status} a ${status}.`,
      )
    }

    const now = new Date()
    const releasesSeats = ['CANCELLED', 'REFUNDED'].includes(status)

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status,
          ...(internalNotes !== undefined ? { internalNotes } : {}),
          ...(status === 'CONFIRMED' ? { confirmedAt: now } : {}),
          ...(status === 'CANCELLED' ? { cancelledAt: now, cancellationReason: reason ?? null } : {}),
          ...(status === 'COMPLETED' ? { completedAt: now } : {}),
        },
      })

      // Returning seats to inventory is the whole reason cancellation is a
      // transaction and not a single update.
      if (releasesSeats) {
        for (const item of booking.items) {
          if (!item.availabilityId) continue
          const seats = item.adults + item.children
          await tx.tourAvailability.updateMany({
            where: { id: item.availabilityId },
            data: { seatsBooked: { decrement: seats } },
          })
          await tx.tourAvailability.updateMany({
            where: { id: item.availabilityId, seatsBooked: { lt: 0 } },
            data: { seatsBooked: 0 },
          })
        }
      }
    })

    await recordAudit({
      action: status === 'CANCELLED' ? 'UPDATE' : 'UPDATE',
      entityType: 'Booking',
      entityId: bookingId,
      summary: `Reserva ${booking.reference}: ${booking.status} → ${status}`,
      before: { status: booking.status },
      after: { status, reason },
      actorId: session.id,
      actorEmail: session.email,
    })

    if (notifyCustomer) {
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

      if (status === 'CONFIRMED') void emailService.bookingConfirmed(emailData)
      if (status === 'CANCELLED') void emailService.bookingCancelled({ ...emailData, reason })
    }

    log.info('Booking status updated by admin', {
      bookingId, from: booking.status, to: status, actorId: session.id,
    })

    revalidatePath('/bookings')
    revalidatePath(`/bookings/${bookingId}`)

    return actionOk(undefined)
  } catch (error) {
    log.error('Booking status update failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function refundBookingAction(input: unknown): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('payments:refund')

    const parsed = refundRequestSchema.safeParse(input)
    if (!parsed.success) {
      return actionError(
        'VALIDATION_ERROR',
        'Revisá el importe y el motivo.',
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      )
    }

    const result = await refundPayment(parsed.data)

    await recordAudit({
      action: 'REFUND',
      entityType: 'Payment',
      entityId: parsed.data.paymentId,
      summary: `Reembolso de ${result.refundedCents / 100} procesado — ${parsed.data.reason}`,
      after: { refundedCents: result.refundedCents, status: result.status },
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath('/payments')
    revalidatePath('/bookings')

    return actionOk(undefined)
  } catch (error) {
    log.error('Refund failed', error)
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}

export async function updateBookingNotesAction(
  bookingId: string,
  notes: string,
): Promise<ActionResult<void>> {
  try {
    const session = await requirePermission('bookings:update')

    await prisma.booking.update({
      where: { id: bookingId },
      data: { internalNotes: notes.slice(0, 2000) },
    })

    await recordAudit({
      action: 'UPDATE',
      entityType: 'Booking',
      entityId: bookingId,
      summary: 'Notas internas actualizadas',
      actorId: session.id,
      actorEmail: session.email,
    })

    revalidatePath(`/bookings/${bookingId}`)
    return actionOk(undefined)
  } catch (error) {
    const publicError = toPublicError(error)
    return actionError(publicError.code, publicError.message)
  }
}
