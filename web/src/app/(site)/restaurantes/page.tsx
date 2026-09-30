import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/media/SmartImage'
import { ButtonLink } from '@/components/ui/Button'
import { buildMetadata } from '@/lib/seo'
import { listBusinesses } from '@/server/queries/content'

export const metadata: Metadata = buildMetadata({
  title: 'Dónde comer en El Calafate',
  description:
    'Restaurantes, parrillas y cafeterías en El Calafate, Santa Cruz. Cordero patagónico, cocina regional y opciones para cada momento del día.',
  path: ROUTES.restaurants,
})

export default async function RestaurantesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const result = await listBusinesses({ channel: 'restaurantes', page, pageSize: 12 })

  return (
    <>
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs
            items={[{ name: 'Inicio', path: '/' }, { name: 'Restaurantes', path: ROUTES.restaurants }]}
          />
          <SectionHeading
            as="h1"
            eyebrow="Guía local"
            title="Dónde comer en El Calafate"
            description="Restaurantes, parrillas y cafeterías de la ciudad, con su especialidad y datos de contacto."
            className="mt-5"
          />
        </div>
      </div>

      <div className="container-page py-10 sm:py-12">
        {result.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-stone-300 bg-stone-50 px-6 py-16 text-center">
            <h2 className="font-display text-lg font-semibold text-lenga-950">
              Todavía no hay restaurantes publicados
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-lenga-600">
              ¿Tenés un restaurante en El Calafate? Solicitá su publicación en la guía.
            </p>
            <ButtonLink href={ROUTES.hotelRegister} className="mt-6">
              Registrar mi comercio
            </ButtonLink>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((business, index) => (
              <li key={business.id}>
                <Link
                  href={ROUTES.restaurant(business.slug)}
                  className="group flex h-full flex-col overflow-hidden rounded-card border border-stone-200 bg-white transition-all hover:border-stone-300 hover:shadow-raised"
                >
                  <div className="relative aspect-[16/10] bg-stone-100">
                    <SmartImage
                      media={business.images[0]?.media}
                      seed={business.slug}
                      alt={business.name}
                      sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                      priority={index < 3}
                      className="transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-glacier-700">
                        {business.category.name}
                      </p>
                      {business.priceRange ? (
                        <span className="text-xs font-semibold text-lenga-500">
                          {business.priceRange}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-1.5 font-display text-[1.0625rem] font-semibold text-lenga-950">
                      {business.name}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-lenga-600">
                      {business.summary}
                    </p>

                    {business.address ? (
                      <p className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs text-lenga-500">
                        <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                        {business.address}
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
