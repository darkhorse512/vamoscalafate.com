import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@vamos/db'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { BookingForm } from '@/components/booking/BookingForm'
import { noindexMetadata } from '@/lib/seo'
import { pricingService } from '@/server/services/pricing'
import { availabilityService } from '@/server/services/availability'
import { extractAttribution } from '@/lib/utils'

/**
 * Reservation step: customer details and review.
 *
 * Never indexed - it is a transient state in a funnel, and indexing it would
 * put a half-finished checkout in search results (spec §33).
 *
 * The selection arrives in the URL but is NOT trusted: the tour, option,
 * availability and price are all re-read here, so an edited query string
 * cannot change what is charged.
 */
export const metadata: Metadata = noindexMetadata(
  'Completá tu reserva',
  'Ingresá tus datos para completar la reserva.',
)

export const dynamic = 'force-dynamic'

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const str = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined)

  const tourSlug = str('tour')
  const optionId = str('opcion')
  const date = str('fecha')
  const adults = Math.max(1, Number(str('adultos') ?? 1) || 1)
  const children = Math.max(0, Number(str('menores') ?? 0) || 0)
  const departureTime = str('horario') ?? null
  const pickupId = str('pickup') ?? null

  if (!tourSlug || !optionId || !date) notFound()

  const tour = await prisma.tour.findFirst({
    where: { slug: tourSlug, status: 'PUBLISHED' },
    select: {
      id: true, slug: true, name: true, currency: true,
      category: { select: { name: true, slug: true, channel: true } },
      options: { where: { id: optionId, isActive: true }, take: 1 },
      pickupLocations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      cancellationPolicy: true,
    },
  })

  const option = tour?.options[0]
  if (!tour || !option) notFound()

  // Re-price and re-check inventory server-side. If either fails, the page
  // sends the visitor back rather than collecting details for a dead booking.
  let breakdown
  let seatsAvailable: number | null = null

  try {
    breakdown = await pricingService.quote({
      tourId: tour.id,
      optionId: option.id,
      date,
      departureTime,
      adults,
      children,
      pickupLocationId: pickupId,
    })

    const slot = await availabilityService.resolveSlot({
      optionId: option.id,
      date,
      departureTime,
      seatsNeeded: adults + children,
    })
    seatsAvailable = slot.seatsTotal - slot.seatsBooked
  } catch {
    return (
      <div className="container-page py-20">
        <div className="mx-auto max-w-lg rounded-card border border-stone-200 bg-stone-50 p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-lenga-950">
            Esa salida ya no está disponible
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-lenga-600">
            Los lugares para la fecha y el horario que elegiste se ocuparon mientras completabas la
            reserva. Elegí otra fecha y volvé a intentar.
          </p>
          <a
            href={ROUTES.tour(tour.slug)}
            className="mt-6 inline-block text-sm font-semibold text-glacier-700 underline underline-offset-2"
          >
            Volver a {tour.name}
          </a>
        </div>
      </div>
    )
  }

  const detailPath =
    tour.category.channel === 'traslados' ? ROUTES.transfer(tour.slug) : ROUTES.tour(tour.slug)

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { name: 'Inicio', path: '/' },
          { name: tour.name, path: detailPath },
          { name: 'Reservar', path: ROUTES.book },
        ]}
      />

      <h1 className="mt-5 font-display text-display-sm font-bold leading-tight text-lenga-950">
        Completá tu reserva
      </h1>

      <BookingForm
        tour={{
          id: tour.id,
          slug: tour.slug,
          name: tour.name,
          categoryName: tour.category.name,
          currency: tour.currency,
          cancellationPolicy: tour.cancellationPolicy,
          detailPath,
        }}
        option={{ id: option.id, name: option.name, freeCancellationHours: option.freeCancellationHours }}
        selection={{ date, departureTime, adults, children, pickupLocationId: pickupId }}
        pickupLocations={tour.pickupLocations.map((p) => ({
          id: p.id,
          name: p.name,
          extraCostCents: p.extraCostCents,
        }))}
        breakdown={breakdown}
        seatsAvailable={seatsAvailable}
        attribution={extractAttribution(params)}
      />
    </div>
  )
}
