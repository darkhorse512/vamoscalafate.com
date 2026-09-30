import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@vamos/db'
import { bookingService } from '../../web/src/server/services/booking'
import { pricingService } from '../../web/src/server/services/pricing'
import { availabilityService } from '../../web/src/server/services/availability'
import { cleanupFixtures, createTourFixture, testCustomer } from './setup'

/**
 * Booking engine integration tests.
 *
 * The properties under test are the ones that cost real money if they break:
 * seats cannot be oversold, totals come from the database and not the request,
 * and cancelling returns inventory.
 */

beforeEach(async () => {
  await cleanupFixtures()
})

afterAll(async () => {
  await cleanupFixtures()
  await prisma.$disconnect()
})

describe('pricing', () => {
  it('prices from the database, ignoring anything the client might claim', async () => {
    const fixture = await createTourFixture({ priceCents: 85_000 })

    const breakdown = await pricingService.quote({
      tourId: fixture.tour.id,
      optionId: fixture.option.id,
      date: fixture.isoDate,
      adults: 2,
      children: 0,
    })

    expect(breakdown.adultUnitCents).toBe(85_000)
    expect(breakdown.adultsSubtotalCents).toBe(170_000)
    expect(breakdown.totalCents).toBe(170_000)
  })

  it('charges children the adult rate when no child price is configured', async () => {
    const fixture = await createTourFixture({ priceCents: 100_000, childPriceCents: null })

    const breakdown = await pricingService.quote({
      tourId: fixture.tour.id,
      optionId: fixture.option.id,
      date: fixture.isoDate,
      adults: 1,
      children: 1,
    })

    // Silently discounting to zero would misprice the booking.
    expect(breakdown.childUnitCents).toBe(100_000)
    expect(breakdown.totalCents).toBe(200_000)
  })

  it('applies a configured child price', async () => {
    const fixture = await createTourFixture({ priceCents: 100_000, childPriceCents: 60_000 })

    const breakdown = await pricingService.quote({
      tourId: fixture.tour.id,
      optionId: fixture.option.id,
      date: fixture.isoDate,
      adults: 2,
      children: 1,
    })

    expect(breakdown.totalCents).toBe(200_000 + 60_000)
  })

  it('adds the pickup surcharge per passenger', async () => {
    const fixture = await createTourFixture({ priceCents: 100_000 })

    const breakdown = await pricingService.quote({
      tourId: fixture.tour.id,
      optionId: fixture.option.id,
      date: fixture.isoDate,
      adults: 2,
      children: 0,
      pickupLocationId: fixture.pickup.id,
    })

    // 5.000 per passenger × 2
    expect(breakdown.pickupCostCents).toBe(10_000)
    expect(breakdown.totalCents).toBe(210_000)
  })

  it('refuses a group larger than the option allows', async () => {
    const fixture = await createTourFixture({ seats: 4 })

    await expect(
      pricingService.quote({
        tourId: fixture.tour.id,
        optionId: fixture.option.id,
        date: fixture.isoDate,
        adults: 10,
        children: 0,
      }),
    ).rejects.toThrow()
  })
})

describe('booking creation', () => {
  it('creates a booking and decrements available seats', async () => {
    const fixture = await createTourFixture({ seats: 10, priceCents: 50_000 })

    const booking = await bookingService.create({
      selection: {
        tourId: fixture.tour.id,
        optionId: fixture.option.id,
        date: fixture.isoDate,
        adults: 3,
        children: 0,
      },
      customer: testCustomer(),
    })

    expect(booking.reference).toMatch(/^VC-[A-Z0-9]{6}$/)
    expect(booking.status).toBe('AWAITING_PAYMENT')
    expect(booking.totalCents).toBe(150_000)

    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(3)
  })

  it('generates an unambiguous reference with no look-alike characters', async () => {
    const fixture = await createTourFixture()

    const booking = await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 1, children: 0,
      },
      customer: testCustomer(),
    })

    // I, O, U, 0 and 1 are excluded so a reference read aloud is unambiguous.
    expect(booking.reference.slice(3)).not.toMatch(/[IOU01]/)
  })

  it('REFUSES to oversell the last seats', async () => {
    const fixture = await createTourFixture({ seats: 4 })

    await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 3, children: 0,
      },
      customer: testCustomer('first'),
    })

    // Only one seat left; asking for three must fail.
    await expect(
      bookingService.create({
        selection: {
          tourId: fixture.tour.id, optionId: fixture.option.id,
          date: fixture.isoDate, adults: 3, children: 0,
        },
        customer: testCustomer('second'),
      }),
    ).rejects.toThrow()

    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true, seatsTotal: true },
    })
    // The failed attempt must not have consumed inventory.
    expect(availability?.seatsBooked).toBe(3)
  })

  it('does not oversell under concurrent requests for the last seats', async () => {
    const fixture = await createTourFixture({ seats: 4 })

    // Four concurrent bookings of 2 seats each against 4 seats: at most two
    // can succeed. This is the race the conditional update exists to prevent.
    const attempts = Array.from({ length: 4 }, (_, index) =>
      bookingService
        .create({
          selection: {
            tourId: fixture.tour.id, optionId: fixture.option.id,
            date: fixture.isoDate, adults: 2, children: 0,
          },
          customer: testCustomer(`race${index}`),
        })
        .then(() => 'ok' as const)
        .catch(() => 'rejected' as const),
    )

    const results = await Promise.all(attempts)
    const succeeded = results.filter((r) => r === 'ok').length

    expect(succeeded).toBeLessThanOrEqual(2)

    const availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true, seatsTotal: true },
    })

    // The invariant that actually matters: never more booked than exist.
    expect(availability!.seatsBooked).toBeLessThanOrEqual(availability!.seatsTotal)
  })

  it('reuses an existing customer record by email', async () => {
    const fixture = await createTourFixture({ seats: 20 })
    const customer = testCustomer('repeat')

    await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 1, children: 0,
      },
      customer,
    })

    await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 1, children: 0,
      },
      customer,
    })

    const count = await prisma.customer.count({ where: { email: customer.email } })
    expect(count).toBe(1)

    const bookings = await prisma.booking.count({
      where: { customer: { email: customer.email } },
    })
    expect(bookings).toBe(2)
  })

  it('snapshots the tour name so a later rename does not rewrite history', async () => {
    const fixture = await createTourFixture()

    const booking = await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 1, children: 0,
      },
      customer: testCustomer(),
    })

    await prisma.tour.update({
      where: { id: fixture.tour.id },
      data: { name: 'Renamed After Booking' },
    })

    const item = await prisma.bookingItem.findFirst({
      where: { bookingId: booking.bookingId },
      select: { tourNameSnapshot: true },
    })

    expect(item?.tourNameSnapshot).toBe('Test Tour')
  })
})

describe('booking status transitions', () => {
  it('returns seats to inventory when a booking is cancelled', async () => {
    const fixture = await createTourFixture({ seats: 10 })

    const booking = await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 4, children: 0,
      },
      customer: testCustomer(),
    })

    let availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(4)

    await bookingService.transition({
      bookingId: booking.bookingId,
      to: 'CANCELLED',
      reason: 'Test cancellation',
    })

    availability = await prisma.tourAvailability.findUnique({
      where: { id: fixture.availability.id },
      select: { seatsBooked: true },
    })
    expect(availability?.seatsBooked).toBe(0)
  })

  it('refuses an illegal transition', async () => {
    const fixture = await createTourFixture()

    const booking = await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 1, children: 0,
      },
      customer: testCustomer(),
    })

    await bookingService.transition({ bookingId: booking.bookingId, to: 'CANCELLED' })

    // CANCELLED → CONFIRMED is not a legal move.
    await expect(
      bookingService.transition({ bookingId: booking.bookingId, to: 'CONFIRMED' }),
    ).rejects.toThrow()
  })

  it('does not double-release seats when cancelled twice', async () => {
    const fixture = await createTourFixture({ seats: 10 })

    const booking = await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 2, children: 0,
      },
      customer: testCustomer(),
    })

    await bookingService.transition({ bookingId: booking.bookingId, to: 'CANCELLED' })
    // Second call is a no-op because the status already matches.
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

    await bookingService.create({
      selection: {
        tourId: fixture.tour.id, optionId: fixture.option.id,
        date: fixture.isoDate, adults: 3, children: 0,
      },
      customer: testCustomer(),
    })

    const slots = await availabilityService.getSlots(fixture.option.id, fixture.isoDate)
    expect(slots).toHaveLength(1)
    expect(slots[0]!.seatsAvailable).toBe(5)
  })

  it('excludes blocked departures', async () => {
    const fixture = await createTourFixture()

    await prisma.tourAvailability.update({
      where: { id: fixture.availability.id },
      data: { isBlocked: true },
    })

    const slots = await availabilityService.getSlots(fixture.option.id, fixture.isoDate)
    expect(slots).toHaveLength(0)
  })

  it('throws SOLD_OUT rather than returning null for a missing slot', async () => {
    const fixture = await createTourFixture()

    await expect(
      availabilityService.resolveSlot({
        optionId: fixture.option.id,
        date: '2099-01-01',
        seatsNeeded: 1,
      }),
    ).rejects.toThrow()
  })
})
