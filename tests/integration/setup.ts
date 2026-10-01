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
  minAge?: number | null
  maxAge?: number | null
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
      minAge: options?.minAge ?? null,
      maxAge: options?.maxAge ?? null,
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
          // Bands: adults, an optional child band, and a free infant band.
          priceTiers: {
            create: [
              { label: 'Adultos', priceCents, sortOrder: 0 },
              ...(options?.childPriceCents != null
                ? [{ label: 'Menores', ageMin: 6, ageMax: 15, priceCents: options.childPriceCents, sortOrder: 1 }]
                : []),
              { label: 'Bebés (0 a 2 años)', ageMin: 0, ageMax: 2, priceCents: 0, sortOrder: 2 },
            ],
          },
        },
      },
      extras: {
        create: [
          { name: 'Traslado', priceCents: 7_500, perPerson: true, sortOrder: 0 },
          { name: 'Salón privado', priceCents: 30_000, perPerson: false, sortOrder: 1 },
        ],
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
    include: {
      options: { include: { priceTiers: { orderBy: { sortOrder: 'asc' } } } },
      pickupLocations: true,
      extras: { orderBy: { sortOrder: 'asc' } },
    },
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

  const tiers = option.priceTiers
  const isoDate = date.toISOString().slice(0, 10)

  return {
    tour,
    option,
    pickup: tour.pickupLocations[0]!,
    availability,
    isoDate,
    adultTier: tiers[0]!,
    childTier: tiers.find((t) => t.label === 'Menores') ?? null,
    infantTier: tiers.find((t) => t.label.startsWith('Bebés'))!,
    perPersonExtra: tour.extras[0]!,
    perBookingExtra: tour.extras[1]!,
    /** A selection for this fixture: n adults, plus optional children/infants. */
    selection(party: { adults: number; children?: number; infants?: number; extras?: { extraId: string; quantity: number }[]; pickupLocationId?: string }) {
      const childTier = tiers.find((t) => t.label === 'Menores')
      return {
        tourId: tour.id,
        optionId: option.id,
        date: isoDate,
        tiers: [
          { tierId: tiers[0]!.id, quantity: party.adults },
          ...(party.children && childTier ? [{ tierId: childTier.id, quantity: party.children }] : []),
          ...(party.infants ? [{ tierId: tiers.find((t) => t.label.startsWith('Bebés'))!.id, quantity: party.infants }] : []),
        ],
        extras: party.extras ?? [],
        pickupLocationId: party.pickupLocationId ?? null,
      }
    },
  }
}

/** One set of traveller details per seat, as the booking form submits them. */
export function testPassengers(count: number, birthDate = '1990-05-20') {
  return Array.from({ length: count }, (_, index) => ({
    firstName: `Pasajero${index + 1}`,
    lastName: 'Test',
    type: 'ADULT' as const,
    nationality: 'Argentina',
    documentNumber: `30${String(index).padStart(6, '0')}`,
    birthDate,
  }))
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
    hotelName: 'Hotel de prueba',
  }
}
