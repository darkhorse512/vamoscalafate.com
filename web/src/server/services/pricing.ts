import { prisma } from '@vamos/db'
import { AppError } from '@vamos/shared'
import type { BookingSelection, PriceBreakdown } from '@vamos/types'

/**
 * PricingService — the only place a booking total is computed.
 *
 * The client never sends a price. It sends a selection; the server prices it
 * from current database values. Anything else would let a visitor edit the
 * total in devtools.
 *
 * All arithmetic is on integer minor units.
 */
export const pricingService = {
  async quote(selection: BookingSelection): Promise<PriceBreakdown> {
    const option = await prisma.tourOption.findFirst({
      where: { id: selection.optionId, tourId: selection.tourId, isActive: true },
      select: {
        priceCents: true, childPriceCents: true, currency: true,
        minParticipants: true, maxParticipants: true,
      },
    })

    if (!option) {
      throw new AppError('NOT_FOUND', 'Tour option not found or inactive', {
        publicMessage: 'La opción seleccionada ya no está disponible.',
      })
    }

    const totalPassengers = selection.adults + selection.children

    if (totalPassengers < option.minParticipants) {
      throw new AppError('VALIDATION_ERROR', 'Below minimum participants', {
        publicMessage: `Esta opción requiere un mínimo de ${option.minParticipants} pasajeros.`,
      })
    }

    if (totalPassengers > option.maxParticipants) {
      throw new AppError('VALIDATION_ERROR', 'Above maximum participants', {
        publicMessage: `Esta opción admite hasta ${option.maxParticipants} pasajeros.`,
      })
    }

    // A date-specific override (seasonality) wins over the option's base price.
    const availability = await prisma.tourAvailability.findFirst({
      where: {
        optionId: selection.optionId,
        date: new Date(`${selection.date}T00:00:00.000Z`),
        departureTime: selection.departureTime ?? null,
      },
      select: { priceCentsOverride: true },
    })

    const adultUnitCents = availability?.priceCentsOverride ?? option.priceCents

    // When no child price is configured, children pay the adult rate rather
    // than travelling free — silently discounting would misprice the booking.
    const childUnitCents =
      option.childPriceCents ??
      (availability?.priceCentsOverride ? adultUnitCents : option.priceCents)

    let pickupCostCents = 0
    if (selection.pickupLocationId) {
      const pickup = await prisma.tourPickupLocation.findFirst({
        where: { id: selection.pickupLocationId, tourId: selection.tourId, isActive: true },
        select: { extraCostCents: true },
      })
      if (!pickup) {
        throw new AppError('VALIDATION_ERROR', 'Pickup location not available', {
          publicMessage: 'El punto de encuentro seleccionado no está disponible.',
        })
      }
      // Pickup surcharges are per passenger, matching how operators charge.
      pickupCostCents = pickup.extraCostCents * totalPassengers
    }

    const adultsSubtotalCents = adultUnitCents * selection.adults
    const childrenSubtotalCents = childUnitCents * selection.children
    const subtotalCents = adultsSubtotalCents + childrenSubtotalCents + pickupCostCents

    return {
      adults: selection.adults,
      children: selection.children,
      adultUnitCents,
      childUnitCents,
      adultsSubtotalCents,
      childrenSubtotalCents,
      pickupCostCents,
      subtotalCents,
      discountCents: 0,
      totalCents: subtotalCents,
      currency: option.currency,
    }
  },
}
