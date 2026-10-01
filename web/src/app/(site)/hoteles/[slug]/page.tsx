import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Globe, Mail, MapPin, Phone, Star } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Gallery } from '@/components/media/Gallery'
import { Markdown } from '@/components/content/Markdown'
import { breadcrumbSchema, hotelSchema, jsonLdScript } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { getHotelBySlug, getHotelSlugs } from '@/server/queries/content'

export async function generateStaticParams() {
  const hotels = await getHotelSlugs()
  return hotels.map((h) => ({ slug: h.slug }))
}

export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const hotel = await getHotelBySlug(slug)
  if (!hotel) return { title: 'Alojamiento no encontrado' }

  return buildMetadata({
    title: hotel.name,
    description: hotel.summary,
    path: ROUTES.hotel(hotel.slug),
    imageUrl: hotel.images[0]?.media.url ?? null,
    seo: hotel.seo,
  })
}

export default async function HotelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hotel = await getHotelBySlug(slug)
  if (!hotel) notFound()

  const path = ROUTES.hotel(hotel.slug)
  const crumbs = [
    { name: 'Inicio', path: '/' },
    { name: 'Hoteles', path: ROUTES.hotels },
    { name: hotel.name, path },
  ]

  const ld = jsonLdScript([hotelSchema(hotel, path), breadcrumbSchema(crumbs)])

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <div className="container-page pt-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container-page mt-5">
        <Gallery images={hotel.images.map((i) => i.media)} seed={hotel.slug} title={hotel.name} />
      </div>

      <div className="container-page mt-8 pb-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0">
            {hotel.isDemo ? (
              <Badge tone="warning" className="mb-3">
                Ficha de ejemplo
              </Badge>
            ) : null}

            {hotel.starRating ? (
              <p
                className="flex items-center gap-0.5 text-magenta-500"
                aria-label={`${hotel.starRating} estrellas`}
              >
                {Array.from({ length: hotel.starRating }, (_, i) => (
                  <Star key={i} className="size-4 fill-current" aria-hidden="true" />
                ))}
              </p>
            ) : null}

            <h1 className="mt-2 font-display text-display-sm font-bold leading-tight text-heading">
              {hotel.name}
            </h1>

            <p className="mt-3 text-[1.0625rem] leading-relaxed text-foreground">{hotel.summary}</p>

            <div className="mt-8">
              <Markdown content={hotel.description} />
            </div>

            {hotel.amenities.length > 0 ? (
              <section className="mt-10">
                <h2 className="font-display text-xl font-semibold text-heading">Servicios</h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {hotel.amenities.map(({ amenity }) => (
                    <li
                      key={amenity.id}
                      className="flex items-center gap-2.5 text-[0.9375rem] text-foreground"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-violet-400" aria-hidden="true" />
                      {amenity.name}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="mt-10 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
            <div className="rounded-card border border-border bg-surface-muted p-5">
              <h2 className="font-display text-base font-semibold text-heading">Contacto</h2>

              <ul className="mt-4 space-y-3 text-sm">
                {hotel.address ? (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" />
                    <span className="text-foreground">{hotel.address}</span>
                  </li>
                ) : null}

                {hotel.phone ? (
                  <li className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" />
                    <a href={`tel:${hotel.phone}`} className="text-violet-700 hover:underline">
                      {hotel.phone}
                    </a>
                  </li>
                ) : null}

                {hotel.email ? (
                  <li className="flex items-start gap-2.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" />
                    <a href={`mailto:${hotel.email}`} className="break-all text-violet-700 hover:underline">
                      {hotel.email}
                    </a>
                  </li>
                ) : null}

                {hotel.website ? (
                  <li className="flex items-start gap-2.5">
                    <Globe className="mt-0.5 size-4 shrink-0 text-violet-600" aria-hidden="true" />
                    <a
                      href={hotel.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="break-all text-violet-700 hover:underline"
                    >
                      Sitio web
                    </a>
                  </li>
                ) : null}
              </ul>

              <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-plum-500">
                Esta ficha es informativa. La reserva se realiza directamente con el
                establecimiento; Vamos Calafate no gestiona alojamientos.
              </p>
            </div>

            <div className="mt-4 rounded-card border border-border p-5">
              <h2 className="font-sans text-sm font-bold text-heading">
                ¿Ya tenés dónde dormir?
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Reservá las excursiones y el traslado desde el aeropuerto.
              </p>
              <Link
                href={ROUTES.tours}
                className="mt-3 inline-block text-[0.8125rem] font-semibold text-violet-700 underline underline-offset-2"
              >
                Ver excursiones
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
