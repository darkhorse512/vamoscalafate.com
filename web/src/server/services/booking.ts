import { randomBytes } from 'node:crypto'
import { prisma, type BookingStatus } from '@vamos/db'
import { emailService } from '@vamos/email'
import { AppError, logger, publicEnv } from '@vamos/shared'
import { canTransitionBooking, type CreateBookingInput, type CreatedBooking } from '@vamos/types'
import { availabilityService } from './availability.ts'
import { pricingService } from './pricing.ts'

const log = logger.scoped('booking')

/**
 * BookingService - orchestrates reservation creation and state changes.
 *
 * Contract:
 *   · Prices come from PricingService, never from the request.
 *   · Seats are reserved inside the same transaction that writes the booking,
 *     so a failure anywhere leaves no orphaned inventory hold.
 *   · Status changes go through the state machine in @vamos/types.
 *   · Email is sent AFTER the transaction commits. A mail outage must never
 *     roll back a paid booking.
 */

/**
 * Human-readable reference. Crockford-style alphabet with I/O/U/0/1 removed,
 * so a customer reading it over the phone cannot produce an ambiguous code.
 */
function generateReference(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTVWXYZ'
  const bytes = randomBytes(6)
  let out = ''
  for (const byte of bytes) out += alphabet[byte % alphabet.length]
  return `VC-${out}`
}

async function uniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const reference = generateReference()
    const existing = await prisma.booking.findUnique({ where: { reference }, select: { id: true } })
    if (!existing) return reference
  }
  throw new AppError('INTERNAL_ERROR', 'Could not allocate a unique booking reference')
}

export const bookingService = {
  async create(input: CreateBookingInput): Promise<CreatedBooking> {
    const { selection, customer, passengers, attribution } = input

    const tour = await prisma.tour.findFirst({
      where: { id: selection.tourId, status: 'PUBLISHED' },
      select: { id: true, name: true, slug: true },
    })
    if (!tour) {
      throw new AppError('NOT_FOUND', 'Tour not available', {
        publicMessage: 'La excursión seleccionada ya no está disponible.',
      })
    }

    const option = await prisma.tourOption.findFirst({
      where: { id: selection.optionId, tourId: tour.id, isActive: true },
      select: { id: true, name: true },
    })
    if (!option) {
      throw new AppError('NOT_FOUND', 'Tour option not available', {
        publicMessage: 'La opción seleccionada ya no está disponible.',
      })
    }

    const seatsNeeded = selection.adults + selection.children

    // Priced and validated before the transaction opens, so the transaction
    // stays short and holds row locks for as little time as possible.
    const [breakdown, slot] = await Promise.all([
      pricingService.quote(selection),
      availabilityService.resolveSlot({
        optionId: selection.optionId,
        date: selection.date,
        departureTime: selection.departureTime,
        seatsNeeded,
      }),
    ])

    const reference = await uniqueReference()
    const travelDate = new Date(`${selection.date}T00:00:00.000Z`)

    const booking = await prisma.$transaction(async (tx) => {
      // Seats first: if this fails, nothing else has been written.
      await availabilityService.reserveSeats(tx as typeof prisma, slot.id, seatsNeeded)

      const customerRecord = await tx.customer.upsert({
        where: { email: customer.email },
        create: {
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          country: customer.country,
          hotelName: customer.hotelName ?? null,
          marketingOptIn: customer.marketingOptIn ?? false,
        },
        update: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          country: customer.country,
          hotelName: customer.hotelName ?? null,
          // Consent is only ever granted, never revoked by a later booking
          // that happened to leave the box unchecked.
          ...(customer.marketingOptIn ? { marketingOptIn: true } : {}),
        },
        select: { id: true },
      })

      return tx.booking.create({
        data: {
          reference,
          status: 'AWAITING_PAYMENT',
          customerId: customerRecord.id,
          subtotalCents: breakdown.subtotalCents,
          discountCents: breakdown.discountCents,
          totalCents: breakdown.totalCents,
          currency: breakdown.currency,
          specialRequests: customer.specialRequests ?? null,
          utmSource: attribution?.utmSource ?? null,
          utmMedium: attribution?.utmMedium ?? null,
          utmCampaign: attribution?.utmCampaign ?? null,
          utmTerm: attribution?.utmTerm ?? null,
          utmContent: attribution?.utmContent ?? null,
          referrer: attribution?.referrer ?? null,
          items: {
            create: {
              tourId: tour.id,
              optionId: option.id,
              availabilityId: slot.id,
              pickupLocationId: selection.pickupLocationId ?? null,
              tourNameSnapshot: tour.name,
              optionNameSnapshot: option.name,
              travelDate,
              departureTime: selection.departureTime ?? null,
              adults: selection.adults,
              children: selection.children,
              unitPriceCents: breakdown.adultUnitCents,
              childUnitPriceCents: breakdown.childUnitCents,
              pickupCostCents: breakdown.pickupCostCents,
              subtotalCents: breakdown.subtotalCents,
            },
          },
          ...(passengers?.length
            ? {
                passengers: {
                  create: passengers.map((p) => ({
                    firstName: p.firstName,
                    lastName: p.lastName,
                    type: p.type,
                    nationality: p.nationality ?? null,
                  })),
                },
              }
            : {}),
        },
        select: {
          id: true, reference: true, status: true,
          totalCents: true, currency: true,
        },
      })
    })

    // Resolved after the transaction so the confirmation email can name the
    // meeting point. Previously this was fetched inside the transaction and
    // then dropped, which made every confirmation say "no pickup".
    const pickupName = selection.pickupLocationId
      ? (
          await prisma.tourPickupLocation.findUnique({
            where: { id: selection.pickupLocationId },
            select: { name: true },
          })
        )?.name ?? null
      : null

    log.info('Booking created', {
      bookingId: booking.id,
      reference: booking.reference,
      tourSlug: tour.slug,
      totalCents: booking.totalCents,
    })

    // Fire-and-forget notifications. Failures are logged inside emailService
    // and must not surface as a booking error.
    const emailData = {
      reference: booking.reference,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      tourName: tour.name,
      optionName: option.name,
      travelDate,
      departureTime: selection.departureTime ?? null,
      adults: selection.adults,
      children: selection.children,
      pickupLocation: pickupName,
      totalCents: booking.totalCents,
      currency: booking.currency,
      specialRequests: customer.specialRequests ?? null,
    }

    void emailService.bookingReceived(emailData)
    void emailService.adminNewBooking({
      ...emailData,
      adminUrl: publicEnv.NEXT_PUBLIC_ADMIN_URL,
      bookingId: booking.id,
    })

    return {
      bookingId: booking.id,
      reference: booking.reference,
      status: booking.status,
      totalCents: booking.totalCents,
      currency: booking.currency,
    }
  },

  async getByReference(reference: string) {
    return prisma.booking.findUnique({
      where: { reference },
      include: {
        customer: true,
        items: {
          include: {
            tour: { select: { slug: true, name: true } },
            pickupLocation: { select: { name: true } },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })
  },

  /**
   * Central status transition. Every path that changes a booking's state -
   * webhooks, admin actions, scheduled jobs - goes through here so the state
   * machine cannot be bypassed.
   */
  async transition(args: {
    bookingId: string
    to: BookingStatus
    reason?: string | null
    releaseSeats?: boolean
  }): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: args.bookingId },
      select: {
        id: true, status: true, reference: true,
        items: { select: { availabilityId: true, adults: true, children: true } },
      },
    })

    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found')

    if (!canTransitionBooking(booking.status, args.to)) {
      throw new AppError('CONFLICT', `Illegal transition ${booking.status} → ${args.to}`, {
        publicMessage: `No se puede pasar de ${booking.status} a ${args.to}.`,
      })
    }

    if (booking.status === args.to) return

    const now = new Date()
    const releases = args.releaseSeats ?? ['CANCELLED', 'REFUNDED'].includes(args.to)

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: args.to,
          ...(args.to === 'CONFIRMED' ? { confirmedAt: now } : {}),
          ...(args.to === 'CANCELLED'
            ? { cancelledAt: now, cancellationReason: args.reason ?? null }
            : {}),
          ...(args.to === 'COMPLETED' ? { completedAt: now } : {}),
        },
      })

      if (releases) {
        for (const item of booking.items) {
          if (!item.availabilityId) continue
          await availabilityService.releaseSeats(
            tx as typeof prisma,
            item.availabilityId,
            item.adults + item.children,
          )
        }
      }
    })

    log.info('Booking status changed', {
      bookingId: booking.id,
      reference: booking.reference,
      from: booking.status,
      to: args.to,
    })
  },
}
