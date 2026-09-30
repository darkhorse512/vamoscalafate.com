import type { Metadata } from 'next'
import Link from 'next/link'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { SmartImage } from '@/components/media/SmartImage'
import { buildMetadata } from '@/lib/seo'
import { getBusinessCategories, listBusinesses } from '@/server/queries/content'

export const metadata: Metadata = buildMetadata({
  title: 'Servicios turísticos en El Calafate',
  description:
    'Alquiler de autos, equipamiento outdoor, agencias y otros servicios para tu viaje a El Calafate, Patagonia argentina.',
  path: ROUTES.services,
})

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const categorySlug = typeof params.categoria === 'string' ? params.categoria : undefined
  const page = Number(params.page) || 1

  const [result, categories] = await Promise.all([
    listBusinesses({ channel: 'servicios', categorySlug, page, pageSize: 12 }),
    getBusinessCategories('servicios'),
  ])

  return (
    <>
      <div className="border-b border-stone-200 bg-stone-50">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs items={[{ name: 'Inicio', path: '/' }, { name: 'Servicios', path: ROUTES.services }]} />
          <SectionHeading
            as="h1"
            eyebrow="Guía local"
            title="Servicios turísticos en El Calafate"
            description="Alquiler de autos, equipamiento outdoor, agencias y otros servicios útiles durante tu estadía."
            className="mt-5"
          />
        </div>
      </div>

      <div className="container-page py-10 sm:py-12">
        {categories.length > 0 ? (
          <ul className="mb-8 flex flex-wrap gap-2">
            <li>
              <Link
                href={ROUTES.services}
                className={`inline-flex rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${!categorySlug ? 'border-glacier-700 bg-glacier-700 text-white' : 'border-stone-300 bg-white text-lenga-700 hover:border-lenga-400'}`}
              >
                Todos
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`${ROUTES.services}?categoria=${category.slug}`}
                  className={`inline-flex rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${categorySlug === category.slug ? 'border-glacier-700 bg-glacier-700 text-white' : 'border-stone-300 bg-white text-lenga-700 hover:border-lenga-400'}`}
                >
                  {category.name}
                  <span className="ml-1.5 opacity-60">{category._count.businesses}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {result.items.length === 0 ? (
          <div className="rounded-card border border-dashed border-stone-300 bg-stone-50 px-6 py-16 text-center">
            <h2 className="font-display text-lg font-semibold text-lenga-950">
              Todavía no hay servicios publicados
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-lenga-600">
              ¿Ofrecés un servicio turístico en El Calafate?{' '}
              <Link href={ROUTES.hotelRegister} className="font-semibold text-glacier-700 underline">
                Registralo en la guía
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((business) => (
              <li key={business.id}>
                <Link
                  href={ROUTES.service(business.slug)}
                  className="group block h-full overflow-hidden rounded-card border border-stone-200 bg-white transition-all hover:border-stone-300 hover:shadow-raised"
                >
                  <div className="relative aspect-[16/10] bg-stone-100">
                    <SmartImage
                      media={business.images[0]?.media}
                      seed={business.slug}
                      alt={business.name}
                      sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                    />
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-glacier-700">
                      {business.category.name}
                    </p>
                    <h2 className="mt-1.5 font-display text-[1.0625rem] font-semibold text-lenga-950">
                      {business.name}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-lenga-600">
                      {business.summary}
                    </p>
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
