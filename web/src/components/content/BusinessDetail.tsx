import Link from 'next/link'
import { Clock, Globe, Mail, MapPin, Phone } from 'lucide-react'
import { LOCATION, ROUTES, SITE, absoluteUrl } from '@vamos/shared'
import type { BusinessDetail as BusinessDetailData } from '@vamos/types'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs, type Crumb } from '@/components/layout/Breadcrumbs'
import { Gallery } from '@/components/media/Gallery'
import { Markdown } from './Markdown'
import { breadcrumbSchema, jsonLdScript } from '@/lib/jsonld'

const WEEKDAY_LABELS: Record<string, string> = {
  mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves',
  fri: 'Viernes', sat: 'Sábado', sun: 'Domingo',
}

/**
 * Shared detail view for restaurants and service businesses.
 *
 * Emits `LocalBusiness` structured data - the accurate type for a directory
 * listing. No Offer and no aggregateRating: this platform does not sell these
 * businesses' services and has no verified ratings for them.
 */
export function BusinessDetail({
  business,
  path,
  crumbs,
}: {
  business: BusinessDetailData
  path: string
  crumbs: Crumb[]
}) {
  const hours =
    business.openingHours && typeof business.openingHours === 'object'
      ? (business.openingHours as Record<string, string>)
      : null

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.summary,
    url: absoluteUrl(path),
    ...(business.images.length
      ? { image: business.images.slice(0, 5).map((i) => i.media.url) }
      : {}),
    address: {
      '@type': 'PostalAddress',
      ...(business.address ? { streetAddress: business.address } : {}),
      addressLocality: LOCATION.city,
      addressRegion: LOCATION.province,
      addressCountry: LOCATION.countryCode,
    },
    ...(business.latitude && business.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: business.latitude,
            longitude: business.longitude,
          },
        }
      : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.priceRange ? { priceRange: business.priceRange } : {}),
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url },
  }

  const ld = jsonLdScript([localBusiness, breadcrumbSchema(crumbs)])

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <div className="container-page pt-6">
        <Breadcrumbs items={crumbs} />
      </div>

      <div className="container-page mt-5">
        <Gallery
          images={business.images.map((i) => i.media)}
          seed={business.slug}
          title={business.name}
        />
      </div>

      <div className="container-page mt-8 pb-16">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{business.category.name}</Badge>
              {business.priceRange ? <Badge tone="neutral">{business.priceRange}</Badge> : null}
              {business.isDemo ? <Badge tone="warning">Ficha de ejemplo</Badge> : null}
            </div>

            <h1 className="mt-3 font-display text-display-sm font-bold leading-tight text-heading">
              {business.name}
            </h1>

            <p className="mt-3 text-[1.0625rem] leading-relaxed text-foreground">
              {business.summary}
            </p>

            <div className="mt-8">
              <Markdown content={business.description} />
            </div>

            {business.services.length > 0 ? (
              <section className="mt-10">
                <h2 className="font-display text-xl font-semibold text-heading">
                  Qué ofrece
                </h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {business.services.map((service) => (
                    <li
                      key={service}
                      className="flex items-center gap-2.5 text-[0.9375rem] text-foreground"
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-violet-400"
                        aria-hidden="true"
                      />
                      {service}
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
                {business.address ? (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="text-foreground">{business.address}</span>
                  </li>
                ) : null}

                {business.phone ? (
                  <li className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`tel:${business.phone}`} className="text-primary hover:underline">
                      {business.phone}
                    </a>
                  </li>
                ) : null}

                {business.email ? (
                  <li className="flex items-start gap-2.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <a
                      href={`mailto:${business.email}`}
                      className="break-all text-primary hover:underline"
                    >
                      {business.email}
                    </a>
                  </li>
                ) : null}

                {business.website ? (
                  <li className="flex items-start gap-2.5">
                    <Globe className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="break-all text-primary hover:underline"
                    >
                      Sitio web
                    </a>
                  </li>
                ) : null}
              </ul>

              {hours ? (
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="flex items-center gap-2 font-sans text-sm font-bold text-heading">
                    <Clock className="size-4 text-primary" aria-hidden="true" />
                    Horarios
                  </h3>
                  <dl className="mt-2.5 space-y-1 text-xs">
                    {Object.entries(hours).map(([day, value]) => (
                      <div key={day} className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">{WEEKDAY_LABELS[day] ?? day}</dt>
                        <dd className="font-medium text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
                Ficha informativa de la guía de El Calafate. Contactá directamente al comercio para
                reservas o consultas.
              </p>
            </div>

            <div className="mt-4 rounded-card border border-border p-5">
              <h2 className="font-sans text-sm font-bold text-heading">Planificá tu viaje</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Reservá excursiones y traslados para tu estadía.
              </p>
              <Link
                href={ROUTES.tours}
                className="mt-3 inline-block text-[0.8125rem] font-semibold text-primary underline underline-offset-2"
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
