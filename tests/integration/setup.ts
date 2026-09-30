import { prisma } from '@vamos/db'

/**
 * Integration test fixtures.
 *
 * These tests run against a REAL PostgreSQL database. Mocking Prisma would
 * defeat the purpose: the behaviour under test - transactional seat
 * reservation, unique-constraint idempotency, cascade deletes - lives in the
 * database, not in application code.
 *
 * Every fixture is namespaced with an `itest-` prefix and torn down
 * afterwards, so a test run never disturbs seed or production data.
 */

export const TEST_PREFIX = 'itest-'

export type TourFixture = Awaited<ReturnType<typeof createTourFixture>>

export async function createTourFixture(options?: {
  seats?: number
  priceCents?: number
  childPriceCents?: number | null
}) {
  const seats = options?.seats ?? 10
  const priceCents = options?.priceCents ?? 100_000
  const suffix = Math.random().toString(36).slice(2, 10)

  const category = await prisma.tourCategory.upsert({
    where: { slug: `${TEST_PREFIX}category` },
    create: {
      slug: `${TEST_PREFIX}category`,
      name: 'Test Category',
      channel: 'excursiones',
      status: 'PUBLISHED',
    },
    update: {},
  })

  const tour = await prisma.tour.create({
    data: {
      slug: `${TEST_PREFIX}tour-${suffix}`,
      name: 'Test Tour',
      summary: 'A tour used only by the integration tests.',
      description: 'Integration test fixture.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      categoryId: category.id,
      durationMinutes: 240,
      fromPriceCents: priceCents,
      options: {
        create: {
          name: 'Regular',
          priceCents,
          childPriceCents: options?.childPriceCents ?? null,
          currency: 'ARS',
          durationMinutes: 240,
          capacity: seats,
          minParticipants: 1,
          maxParticipants: seats,
          isActive: true,
        },
      },
      pickupLocations: {
        create: {
          name: 'Test pickup',
          offsetMinutes: -30,
          extraCostCents: 5_000,
          isActive: true,
        },
      },
    },
    include: { options: true, pickupLocations: true },
  })

  const option = tour.options[0]!
  // Departure two weeks out, at UTC midnight, matching the `date` column.
  const travelDate = new Date(Date.now() + 14 * 86_400_000)
  const date = new Date(
    Date.UTC(travelDate.getUTCFullYear(), travelDate.getUTCMonth(), travelDate.getUTCDate()),
  )

  const availability = await prisma.tourAvailability.create({
    data: {
      tourId: tour.id,
      optionId: option.id,
      date,
      departureTime: null,
      seatsTotal: seats,
      seatsBooked: 0,
    },
  })

  return {
    tour,
    option,
    pickup: tour.pickupLocations[0]!,
    availability,
    isoDate: date.toISOString().slice(0, 10),
  }
}

/** Removes every row this test suite created. Order respects foreign keys. */
export async function cleanupFixtures() {
  await prisma.payment.deleteMany({ where: { booking: { reference: { startsWith: 'VC-' } , customer: { email: { startsWith: TEST_PREFIX } } } } })
  await prisma.booking.deleteMany({ where: { customer: { email: { startsWith: TEST_PREFIX } } } })
  await prisma.customer.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } })
  await prisma.tourAvailability.deleteMany({ where: { tour: { slug: { startsWith: TEST_PREFIX } } } })
  await prisma.tour.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } })
  await prisma.tourCategory.deleteMany({ where: { slug: { startsWith: TEST_PREFIX } } })
  await prisma.webhookEvent.deleteMany({ where: { eventId: { startsWith: TEST_PREFIX } } })
  await prisma.rateLimitCounter.deleteMany({ where: { bucketKey: { contains: TEST_PREFIX } } })
}

export function testCustomer(suffix = Math.random().toString(36).slice(2, 8)) {
  return {
    firstName: 'Test',
    lastName: 'Customer',
    email: `${TEST_PREFIX}${suffix}@example.com`,
    phone: '+5492902000000',
    country: 'Argentina',
  }
}
