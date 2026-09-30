import { prisma } from '@vamos/db'
import { AppError, toISODate } from '@vamos/shared'
import type { AvailabilitySlot } from '@vamos/types'

/**
 * AvailabilityService - the single source of truth for what can be sold.
 *
 * Deliberately free of any external booking-engine detail. To plug in a
 * supplier API later, add an implementation behind this same interface and
 * switch the export; no UI or booking code changes.
 *
 * Inventory is never cached: a seat count that is one request stale is a seat
 * that can be sold twice.
 */

export type DayAvailability = {
  date: string
  slots: AvailabilitySlot[]
  seatsAvailable: number
  soldOut: boolean
}

export const availabilityService = {
  /** Calendar data for a tour across a date range. */
  async getRange(args: {
    tourId: string
    optionId?: string
    from: string
    to: string
  }): Promise<DayAvailability[]> {
    const from = new Date(`${args.from}T00:00:00.000Z`)
    const to = new Date(`${args.to}T00:00:00.000Z`)

    const rows = await prisma.tourAvailability.findMany({
      where: {
        tourId: args.tourId,
        ...(args.optionId ? { optionId: args.optionId } : {}),
        date: { gte: from, lte: to },
        isBlocked: false,
        option: { isActive: true },
      },
      orderBy: [{ date: 'asc' }, { departureTime: 'asc' }],
      select: {
        id: true, date: true, departureTime: true, optionId: true,
        seatsTotal: true, seatsBooked: true, priceCentsOverride: true,
        option: { select: { priceCents: true, currency: true } },
      },
    })

    const byDate = new Map<string, DayAvailability>()

    for (const row of rows) {
      const key = toISODate(row.date)
      const seatsAvailable = Math.max(0, row.seatsTotal - row.seatsBooked)

      const slot: AvailabilitySlot = {
        date: key,
        departureTime: row.departureTime,
        optionId: row.optionId,
        seatsAvailable,
        priceCents: row.priceCentsOverride ?? row.option.priceCents,
        currency: row.option.currency,
        availabilityId: row.id,
      }

      const day = byDate.get(key)
      if (day) {
        day.slots.push(slot)
        day.seatsAvailable += seatsAvailable
      } else {
        byDate.set(key, { date: key, slots: [slot], seatsAvailable, soldOut: false })
      }
    }

    for (const day of byDate.values()) {
      day.soldOut = day.seatsAvailable === 0
    }

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  },

  /** Slots for one option on one date. */
  async getSlots(optionId: string, date: string): Promise<AvailabilitySlot[]> {
    const rows = await prisma.tourAvailability.findMany({
      where: {
        optionId,
        date: new Date(`${date}T00:00:00.000Z`),
        isBlocked: false,
        option: { isActive: true },
      },
      orderBy: { departureTime: 'asc' },
      select: {
        id: true, date: true, departureTime: true, optionId: true,
        seatsTotal: true, seatsBooked: true, priceCentsOverride: true,
        option: { select: { priceCents: true, currency: true } },
      },
    })

    return rows.map((row) => ({
      date, departureTime: row.departureTime, optionId: row.optionId,
      seatsAvailable: Math.max(0, row.seatsTotal - row.seatsBooked),
      priceCents: row.priceCentsOverride ?? row.option.priceCents,
      currency: row.option.currency,
      availabilityId: row.id,
    }))
  },

  /**
   * Resolves the single availability row a booking will consume.
   * Throws SOLD_OUT rather than returning null, so a caller cannot forget to
   * check and silently oversell.
   */
  async resolveSlot(args: {
    optionId: string
    date: string
    departureTime?: string | null
    seatsNeeded: number
  }) {
    const row = await prisma.tourAvailability.findFirst({
      where: {
        optionId: args.optionId,
        date: new Date(`${args.date}T00:00:00.000Z`),
        // An explicit null departureTime means "open slot"; match it exactly
        // so a timed request cannot accidentally consume the open one.
        departureTime: args.departureTime ?? null,
        isBlocked: false,
      },
      select: { id: true, seatsTotal: true, seatsBooked: true, priceCentsOverride: true },
    })

    if (!row) {
      throw new AppError('SOLD_OUT', 'No availability row for the requested slot', {
        publicMessage: 'No hay salidas disponibles para la fecha y el horario seleccionados.',
      })
    }

    if (row.seatsTotal - row.seatsBooked < args.seatsNeeded) {
      throw new AppError('SOLD_OUT', 'Insufficient seats', {
        publicMessage: `Solo quedan ${Math.max(0, row.seatsTotal - row.seatsBooked)} lugares para esa salida.`,
      })
    }

    return row
  },

  /**
   * Atomically reserves seats.
   *
   * Uses a single guarded UPDATE whose WHERE clause carries the capacity check
   * itself:
   *
   *     WHERE id = $1 AND NOT "isBlocked" AND "seatsBooked" + $2 <= "seatsTotal"
   *
   * PostgreSQL evaluates that predicate against the row it is about to lock,
   * so two concurrent requests that both read "4 seats left" cannot both
   * succeed - the second one finds the predicate false and updates zero rows.
   *
   * A read-then-write in application code could not provide this guarantee
   * without an explicit lock: between the SELECT and the UPDATE, another
   * transaction can commit.
   *
   * Must be called inside the transaction that creates the booking, so a
   * later failure rolls the reservation back with it.
   */
  async reserveSeats(tx: typeof prisma, availabilityId: string, seats: number): Promise<void> {
    if (!Number.isInteger(seats) || seats < 1) {
      throw new AppError('VALIDATION_ERROR', 'Seat count must be a positive integer')
    }

    const updated = await tx.$executeRaw`
      UPDATE "tour_availability"
      SET "seatsBooked" = "seatsBooked" + ${seats},
          "updatedAt" = NOW()
      WHERE "id" = ${availabilityId}
        AND "isBlocked" = false
        AND "seatsBooked" + ${seats} <= "seatsTotal"
    `

    if (updated === 0) {
      throw new AppError('SOLD_OUT', 'Reservation would exceed capacity', {
        publicMessage:
          'Los últimos lugares se acaban de ocupar. Probá con otra fecha u horario.',
      })
    }
  },

  /**
   * Returns seats to inventory when a booking is cancelled.
   *
   * `GREATEST(..., 0)` clamps in the same statement, so a double-release can
   * never drive the counter negative and silently inflate availability.
   */
  async releaseSeats(tx: typeof prisma, availabilityId: string, seats: number): Promise<void> {
    await tx.$executeRaw`
      UPDATE "tour_availability"
      SET "seatsBooked" = GREATEST("seatsBooked" - ${seats}, 0),
          "updatedAt" = NOW()
      WHERE "id" = ${availabilityId}
    `
  },
}
