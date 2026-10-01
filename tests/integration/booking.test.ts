import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@vamos/db'
import { bookingService } from '../../web/src/server/services/booking'
import { pricingService } from '../../web/src/server/services/pricing'
import { availabilityService } from '../../web/src/server/services/availability'
import { cleanupFixtures, createTourFixture, testCustomer, testPassengers } from './setup'

/**
 * Booking engine integration tests.
 *
 * The properties under test are the ones that cost real money if they break:
 * seats cannot be oversold, totals come from the database and not the request,
 * every passenger takes a seat, add-ons are priced by quantity, and cancelling
 * returns inventory.
 */

beforeEach(async () => {
  await cleanupFixtures()
})

afterAll(async () => {
  await cleanupFixtures()
  await prisma.$disconnect()
})

/** Creates a booking for `party`, with matching passenger details. */
async function book(
  fixture: Awaited<ReturnType<typeof createTourFixture>>,
  party: Parameters<Awaited<ReturnType<typeof createTourFixture>>['selection']>[0],
  customerSuffix?: string,
) {
  const seats = party.adults + (party.children ?? 0) + (party.infants ?? 0)
  return bookingService.create({
    selection: fixture.selection(party),
    customer: testCustomer(customerSuffix),
    passengers: testPassengers(seats),
  })
}

describe('pricing', () => {
  it('prices from the database, ignoring anything the client might claim', async () => {
    const fixture = await createTourFixture({ priceCents: 85_000 })
    const breakdown = await pricingService.quote(fixture.selection({ adults: 2 }))

    expect(breakdown.tiers).toHaveLength(1)
    expect(breakdown.tiers[0]!.unitCents).toBe(85_000)
    expect(breakdown.tiers[0]!.subtotalCents).toBe(170_000)
    expect(breakdown.totalCents).toBe(170_000)
  })

  it('prices each band at its own rate', async () => {
    const fixture = await createTourFixture({ priceCents: 100_000, childPriceCents: 60_000 })
    const breakdown = await pricingService.quote(fixture.selection({ adults: 2, children: 1 }))

    expect(breakdown.totalCents).toBe(200_000 + 60_000)
    expect(breakdown.passengers).toBe(3)
  })

  it('counts a free band as passengers at no cost', async () => {
    const fixture = await createTourFixture({ priceCents: 100_000 })
    const breakdown = await pricingService.quote(fixture.selection({ adults: 1, infants: 2 }))

    expect(breakdown.passengers).toBe(3)
    expect(breakdown.totalCents).toBe(100_000)
    expect(breakdown.tiers.find((t) => t.id === fixture.infantTier.id)?.unitCents).toBe(0)
  })

  it('requires at least one passenger in the first band', async () => {
    const fixture = await createTourFixture()
    await expect(pricingService.quote(fixture.selection({ adults: 0, infants: 1 }))).rejects.toThrow(
      /first tier/,
    )
  })

  it('rejects a band that belongs to another option', async () => {
    const fixture = await createTourFixture()
    const other = await createTourFixture()
    const selection = fixture.selection({ adults: 1 })
    selection.tiers = [{ tierId: other.adultTier.id, quantity: 1 }]

    await expect(pricingService.quote(selection)).rejects.toThrow()
  })

  it('prices a per-person add-on by quantity', async () => {
    const fixture = await createTourFixture({ priceCents: 100_000 })
    const breakdown = await pricingService.quote(
      fixture.selection({ adults: 2, extras: [{ extraId: fixture.perPersonExtra.id, quantity: 2 }] }),
    )

    // Two transfers at 7.500 — the "Almuerzo × 2" bug the brief reported.
    expect(breakdown.extras[0]).toMatchObject({ quantity: 2, unitCents: 7_500, subtotalCents: 15_000 })
    expect(breakdown.totalCents).toBe(215_000)
  })

  it('refuses more per-person add-ons than passengers', async () => {
    const fixture = await createTourFixture()
    await expect(
      pricingService.quote(fixture.selection({ adults: 1, extras: [{ extraId: fixture.perPersonExtra.id, quantity: 3 }] })),
    ).rejects.toThrow()
  })

  it('allows a per-booking add-on only once', async () => {
    const fixture = await createTourFixture()
    await expect(
      pricingService.quote(fixture.selection({ adults: 3, extras: [{ extraId: fixture.perBookingExtra.id, quantity: 2 }] })),
    ).rejects.toThrow()

    const once = await pricingService.quote(
      fixture.selection({ adults: 3, extras: [{ extraId: fixture.perBookingExtra.id, quantity: 1 }] }),
    )
    expect(once.extrasCostCents).toBe(30_000)
  })

  it('adds the pickup surcharge per passenger', async () => {
    const fixture = await createTourFixture({ priceCents: 100_000 })
    const breakdown = await pricingService.quote(
      fixture.selection({ adults: 2, pickupLocationId: fixture.pickup.id }),
    )

    expect(breakdown.pickupCostCents).toBe(10_000)
    expect(breakdown.totalCents).toBe(210_000)
  })

  it('refuses a group larger than the option allows', async () => {
    const fixture = await createTourFixture({ seats: 4 })
    await expect(pricingService.quote(fixture.selection({ adults: 10 }))).rejects.toThrow()
  })
})

describe('booking creation', () => {
  it('creates a booking, writes its lines and decrements seats', async () => {
    const fixture = await createTourFixture({ seats: 10, priceCents: 50_000 })
    const booking = await book(fixture, {
      adults: 2,
      infants: 1,
      extras: [{ extraId: fixture.perPersonExtra.id, quantity: 2 }],
    })

    expect(booking.reference).toMatch(/^VC-[A-Z0-9]{6}$/)
    expect(booking.status).toBe('AWAITING_PAYMENT')
    expect(booking.totalCents).toBe(100_000 + 15_000)

    const item = await prisma.bookingItem.findFirst({
      where: { bookingId: booking.bookingId },
      include: { tiers: true, extras: true },
    })
    expect(item?.tiers.map((t) => [t.labelSnapshot, t.quantity])).toEqual(
      expect.arrayContaining([['Adultos', 2], ['Bebés (0 a 2 años)', 1]]),
    )
    expect(item?.extras[0]).toMatchObject({ nameSnapshot: 'Traslado', quantity: 2, unitPriceCents: 7_500 })

    // Every passenger takes a seat, including the free infant.
    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(3)
  })

  it('stores each passenger with document and birth date', async () => {
    const fixture = await createTourFixture()
    const booking = await book(fixture, { adults: 2 })

    const passengers = await prisma.bookingPassenger.findMany({ where: { bookingId: booking.bookingId } })
    expect(passengers).toHaveLength(2)
    expect(passengers[0]).toMatchObject({ nationality: 'Argentina', documentNumber: '30000000' })
    expect(passengers[0]!.birthDate?.toISOString().slice(0, 10)).toBe('1990-05-20')
  })

  it('requires one set of passenger details per seat', async () => {
    const fixture = await createTourFixture()
    await expect(
      bookingService.create({
        selection: fixture.selection({ adults: 3 }),
        customer: testCustomer(),
        passengers: testPassengers(2),
      }),
    ).rejects.toThrow(/Passenger list/)
  })

  it('enforces the tour age range on the travel date', async () => {
    const fixture = await createTourFixture({ minAge: 8, maxAge: 65 })

    await expect(
      bookingService.create({
        selection: fixture.selection({ adults: 1 }),
        customer: testCustomer(),
        passengers: testPassengers(1, '1950-01-01'),
      }),
    ).rejects.toThrow(/age range/)

    const ok = await bookingService.create({
      selection: fixture.selection({ adults: 1 }),
      customer: testCustomer(),
      passengers: testPassengers(1, '1990-01-01'),
    })
    expect(ok.reference).toMatch(/^VC-/)
  })

  it('generates an unambiguous reference with no look-alike characters', async () => {
    const fixture = await createTourFixture()
    const booking = await book(fixture, { adults: 1 })
    expect(booking.reference.slice(3)).not.toMatch(/[IOU01]/)
  })

  it('REFUSES to oversell the last seats', async () => {
    const fixture = await createTourFixture({ seats: 4 })
    await book(fixture, { adults: 3 }, 'first')

    await expect(book(fixture, { adults: 3 }, 'second')).rejects.toThrow()

    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(3)
  })

  it('does not oversell under concurrent requests for the last seats', async () => {
    const fixture = await createTourFixture({ seats: 4 })

    const results = await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        book(fixture, { adults: 2 }, `race${index}`)
          .then(() => 'ok' as const)
          .catch(() => 'rejected' as const),
      ),
    )
    expect(results.filter((r) => r === 'ok').length).toBeLessThanOrEqual(2)

    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true, seatsTotal: true },
    })
    expect(availability!.seatsBooked).toBeLessThanOrEqual(availability!.seatsTotal)
  })

  it('reuses an existing customer record by email', async () => {
    const fixture = await createTourFixture({ seats: 20 })
    await book(fixture, { adults: 1 }, 'repeat')
    await book(fixture, { adults: 1 }, 'repeat')

    const email = testCustomer('repeat').email
    expect(await prisma.customer.count({ where: { email } })).toBe(1)
    expect(await prisma.booking.count({ where: { customer: { email } } })).toBe(2)
  })

  it('snapshots the tour name so a later rename does not rewrite history', async () => {
    const fixture = await createTourFixture()
    const booking = await book(fixture, { adults: 1 })

    await prisma.tour.update({ where: { id: fixture.tour.id }, data: { name: 'Renamed After Booking' } })

    const item = await prisma.bookingItem.findFirst({
      where: { bookingId: booking.bookingId },
      select: { tourNameSnapshot: true },
    })
    expect(item?.tourNameSnapshot).toBe('Test Tour')
  })
})

describe('booking status transitions', () => {
  it('returns every seat, free bands included, when a booking is cancelled', async () => {
    const fixture = await createTourFixture({ seats: 10 })
    const booking = await book(fixture, { adults: 3, infants: 1 })

    let availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(4)

    await bookingService.transition({ bookingId: booking.bookingId, to: 'CANCELLED', reason: 'Test' })

    availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(0)
  })

  it('refuses an illegal transition', async () => {
    const fixture = await createTourFixture()
    const booking = await book(fixture, { adults: 1 })

    await bookingService.transition({ bookingId: booking.bookingId, to: 'CANCELLED' })
    await expect(bookingService.transition({ bookingId: booking.bookingId, to: 'CONFIRMED' })).rejects.toThrow()
  })

  it('does not double-release seats when cancelled twice', async () => {
    const fixture = await createTourFixture({ seats: 10 })
    const booking = await book(fixture, { adults: 2 })

    await bookingService.transition({ bookingId: booking.bookingId, to: 'CANCELLED' })
    await bookingService.transition({ bookingId: booking.bookingId, to: 'CANCELLED' })

    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(0)
  })
})

describe('availability service', () => {
  it('reports remaining seats accurately after a booking', async () => {
    const fixture = await createTourFixture({ seats: 8 })
    await book(fixture, { adults: 3 })

    const slots = await availabilityService.getSlots(fixture.option.id, fixture.isoDate)
    expect(slots).toHaveLength(1)
    expect(slots[0]!.seatsAvailable).toBe(5)
  })

  it('excludes blocked departures', async () => {
    const fixture = await createTourFixture()
    await prisma.tourAvailability.update({ where: { id: fixture.availability.id }, data: { isBlocked: true } })

    const slots = await availabilityService.getSlots(fixture.option.id, fixture.isoDate)
    expect(slots).toHaveLength(0)
  })

  it('throws SOLD_OUT rather than returning null for a missing slot', async () => {
    const fixture = await createTourFixture()
    await expect(
      availabilityService.resolveSlot({ optionId: fixture.option.id, date: '2099-01-01', seatsNeeded: 1 }),
    ).rejects.toThrow()
  })
})
