import Link from 'next/link'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/media/SmartImage'
import { buildMetadata } from '@/lib/seo'
import { listDestinations } from '@/server/queries/content'
import { PageBanner } from '@/components/marketing/PageBanner'

export const metadata: Metadata = buildMetadata({
  title: 'Destinos de la Patagonia austral',
  description:
    'El Calafate, el Glaciar Perito Moreno, el Parque Nacional Los Glaciares, El Chaltén y el Lago Argentino: qué son, cómo se llega y qué hacer en cada uno.',
  path: ROUTES.destinations,
})

export default async function DestinosPage() {
  const destinations = await listDestinations()

  return (
    <>
      <PageBanner imageSlug="parque-nacional-los-glaciares">
          <Breadcrumbs tone="light" items={[{ name: 'Inicio', path: '/' }, { name: 'Destinos', path: ROUTES.destinations }]} />
          <SectionHeading
            tone="light"
            as="h1"
            eyebrow="Qué hacer"
            title="Destinos de la Patagonia austral"
            description="La región explicada lugar por lugar: qué es cada sitio, cómo se accede y qué se puede hacer allí."
            className="mt-5"
          />
      </PageBanner>

      <div className="container-page py-10 sm:py-12">
        <ul className="grid gap-6 sm:grid-cols-2">
          {destinations.map((destination, index) => (
            <li key={destination.id}>
              <Link
                href={ROUTES.destination(destination.slug)}
                className="group relative flex aspect-[3/2] flex-col justify-end overflow-hidden rounded-card"
              >
                <SmartImage
                  media={destination.heroImage}
                  seed={destination.slug}
                  alt={destination.name}
                  sizes="(max-width: 639px) 92vw, 46vw"
                  priority={index < 2}
                  className="transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 scrim-bottom" />
                <div className="relative p-6">
                  <h2 className="font-display text-xl font-semibold text-white">{destination.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">
                    {destination.shortIntro}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
