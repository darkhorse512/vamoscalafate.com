import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, Star } from 'lucide-react'
import { ROUTES, formatMoney } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/media/SmartImage'
import { ButtonLink } from '@/components/ui/Button'
import { buildMetadata } from '@/lib/seo'
import { listHotels } from '@/server/queries/content'

export const metadata: Metadata = buildMetadata({
  title: 'Hoteles y alojamientos en El Calafate',
  description:
    'Guía de alojamientos en El Calafate, Santa Cruz: hoteles, hosterías y cabañas con servicios, ubicación y datos de contacto.',
  path: ROUTES.hotels,
})

export default async function HotelesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const result = await listHotels({ page, pageSize: 12 })

  return (
    <>
      <div className="border-b border-border bg-surface-muted">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Hoteles', path: ROUTES.hotels }]} />
          <SectionHeading
            as="h1"
            eyebrow="Guía local"
            title="Dónde alojarse en El Calafate"
            description="Hoteles, hosterías y alojamientos de la ciudad. Esta guía es informativa: la reserva se realiza directamente con cada establecimiento."
            link={{ href: ROUTES.hotelRegister, label: 'Registrar mi alojamiento' }}
            className="mt-5"
          />
        </div>
      </div>

      <div className="container-page py-10 sm:py-12">
        {result.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-strong bg-surface-muted px-6 py-16 text-center">
            <h2 className="font-display text-lg font-semibold text-heading">
              Todavía no hay alojamientos publicados
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Estamos sumando establecimientos a la guía. Si tenés un alojamiento en El Calafate,
              podés solicitar su publicación.
            </p>
            <ButtonLink href={ROUTES.hotelRegister} className="mt-6">
              Registrar mi alojamiento
            </ButtonLink>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((hotel, index) => (
              <li key={hotel.id}>
                <Link
                  href={ROUTES.hotel(hotel.slug)}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-all hover:border-border-strong hover:shadow-raised"
                >
                  <div className="relative aspect-[4/3] bg-surface-strong">
                    <SmartImage
                      media={hotel.images[0]?.media}
                      seed={hotel.slug}
                      alt={hotel.name}
                      sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                      priority={index < 3}
                      className="transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    {hotel.starRating ? (
                      <p
                        className="flex items-center gap-0.5 text-magenta-500"
                        aria-label={`${hotel.starRating} estrellas`}
                      >
                        {Array.from({ length: hotel.starRating }, (_, i) => (
                          <Star key={i} className="size-3.5 fill-current" aria-hidden="true" />
                        ))}
                      </p>
                    ) : null}

                    <h2 className="mt-1.5 font-display text-[1.0625rem] font-semibold text-heading">
                      {hotel.name}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {hotel.summary}
                    </p>

                    {hotel.address ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-plum-500">
                        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                        {hotel.address}
                      </p>
                    ) : null}

                    {hotel.fromPriceCents ? (
                      <p className="mt-auto pt-4 text-sm">
                        <span className="text-xs text-plum-500">Desde </span>
                        <span className="font-display font-bold text-heading">
                          {formatMoney(hotel.fromPriceCents, hotel.currency)}
                        </span>
                        <span className="text-xs text-plum-500"> por noche</span>
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
