import { prisma } from '@vamos/db'
import { AppError } from '@vamos/shared'
import type { BookingSelection, PriceBreakdown, PriceLine } from '@vamos/types'

/**
 * PricingService - the only place a booking total is computed.
 *
 * The client never sends a price. It sends a selection — how many passengers
 * in each price band, which add-ons in what quantity — and the server prices
 * it from current database values. Anything else would let a visitor edit the
 * total in devtools.
 *
 * All arithmetic is on integer minor units.
 */
export const pricingService = {
  async quote(selection: BookingSelection): Promise<PriceBreakdown> {
    const option = await prisma.tourOption.findFirst({
      where: { id: selection.optionId, tourId: selection.tourId, isActive: true },
      select: {
        currency: true,
        minParticipants: true,
        maxParticipants: true,
        priceTiers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: { id: true, label: true, priceCents: true },
        },
        tour: {
          select: {
            extras: {
              where: { isActive: true },
              select: { id: true, name: true, priceCents: true, perPerson: true },
            },
          },
        },
      },
    })

    if (!option) {
      throw new AppError('NOT_FOUND', 'Tour option not found or inactive', {
        publicMessage: 'La opción seleccionada ya no está disponible.',
      })
    }
    if (option.priceTiers.length === 0) {
      throw new AppError('CONFLICT', 'Option has no active price tiers', {
        publicMessage: 'Esta opción no tiene tarifas cargadas. Consultanos para reservar.',
      })
    }

    // ── Passengers per band ───────────────────────────────────────────────
    const tierById = new Map(option.priceTiers.map((tier) => [tier.id, tier]))
    const requested = new Map<string, number>()
    for (const line of selection.tiers) {
      if (!tierById.has(line.tierId)) {
        throw new AppError('VALIDATION_ERROR', 'Unknown price tier for option', {
          publicMessage: 'Una de las tarifas elegidas ya no está disponible. Volvé a elegir.',
        })
      }
      requested.set(line.tierId, (requested.get(line.tierId) ?? 0) + line.quantity)
    }

    const passengers = [...requested.values()].reduce((sum, quantity) => sum + quantity, 0)

    if (passengers < 1) {
      throw new AppError('VALIDATION_ERROR', 'No passengers', {
        publicMessage: 'Elegí al menos un pasajero.',
      })
    }

    // At least one passenger in the first band — the adult rate. A booking of
    // only free infants is never a real booking.
    const firstTier = option.priceTiers[0]!
    if ((requested.get(firstTier.id) ?? 0) < 1) {
      throw new AppError('VALIDATION_ERROR', 'No passenger in the first tier', {
        publicMessage: `La reserva debe incluir al menos un pasajero en la tarifa "${firstTier.label}".`,
      })
    }

    if (passengers < option.minParticipants) {
      throw new AppError('VALIDATION_ERROR', 'Below minimum participants', {
        publicMessage: `Esta opción requiere un mínimo de ${option.minParticipants} pasajeros.`,
      })
    }
    if (passengers > option.maxParticipants) {
      throw new AppError('VALIDATION_ERROR', 'Above maximum participants', {
        publicMessage: `Esta opción admite hasta ${option.maxParticipants} pasajeros.`,
      })
    }

    // A date-specific override (seasonality) replaces the first band's price —
    // the headline adult rate — and leaves the other bands as configured.
    const availability = await prisma.tourAvailability.findFirst({
      where: {
        optionId: selection.optionId,
        date: new Date(`${selection.date}T00:00:00.000Z`),
        departureTime: selection.departureTime ?? null,
      },
      select: { priceCentsOverride: true },
    })

    const tierLines: PriceLine[] = option.priceTiers
      .filter((tier) => (requested.get(tier.id) ?? 0) > 0)
      .map((tier) => {
        const quantity = requested.get(tier.id)!
        const unitCents =
          tier.id === firstTier.id && availability?.priceCentsOverride != null
            ? availability.priceCentsOverride
            : tier.priceCents
        return { id: tier.id, label: tier.label, quantity, unitCents, subtotalCents: unitCents * quantity }
      })

    // ── Add-ons ───────────────────────────────────────────────────────────
    const extraById = new Map(option.tour.extras.map((extra) => [extra.id, extra]))
    const extraLines: PriceLine[] = []
    for (const line of selection.extras ?? []) {
      if (line.quantity === 0) continue
      const extra = extraById.get(line.extraId)
      if (!extra) {
        throw new AppError('VALIDATION_ERROR', 'Unknown extra for tour', {
          publicMessage: 'Uno de los adicionales elegidos ya no está disponible.',
        })
      }
      // Per-person add-ons cannot exceed the party; per-booking ones are 0/1.
      const ceiling = extra.perPerson ? passengers : 1
      if (line.quantity > ceiling) {
        throw new AppError('VALIDATION_ERROR', 'Extra quantity above ceiling', {
          publicMessage: extra.perPerson
            ? `"${extra.name}" no puede superar la cantidad de pasajeros.`
            : `"${extra.name}" se contrata una sola vez por reserva.`,
        })
      }
      extraLines.push({
        id: extra.id,
        label: extra.name,
        quantity: line.quantity,
        unitCents: extra.priceCents,
        subtotalCents: extra.priceCents * line.quantity,
      })
    }

    // ── Pickup point surcharge (per passenger) ──────────────────────────────
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
      pickupCostCents = pickup.extraCostCents * passengers
    }

    const tiersSubtotalCents = tierLines.reduce((sum, line) => sum + line.subtotalCents, 0)
    const extrasCostCents = extraLines.reduce((sum, line) => sum + line.subtotalCents, 0)
    const subtotalCents = tiersSubtotalCents + extrasCostCents + pickupCostCents

    return {
      tiers: tierLines,
      extras: extraLines,
      passengers,
      tiersSubtotalCents,
      extrasCostCents,
      pickupCostCents,
      subtotalCents,
      discountCents: 0,
      totalCents: subtotalCents,
      currency: option.currency,
    }
  },
}
