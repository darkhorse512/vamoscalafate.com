import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { FaqList } from '@/components/content/FaqList'
import { Markdown } from '@/components/content/Markdown'
import { SmartImage } from '@/components/media/SmartImage'
import { TourGrid } from '@/components/tours/TourGrid'
import { breadcrumbSchema, destinationSchema, faqSchema, jsonLdScript } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { getDestinationBySlug, getDestinationSlugs, listBlogPosts } from '@/server/queries/content'
import { listTours } from '@/server/queries/tours'

export async function generateStaticParams() {
  const destinations = await getDestinationSlugs()
  return destinations.map((d) => ({ slug: d.slug }))
}

export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const destination = await getDestinationBySlug(slug)
  if (!destination) return { title: 'Destino no encontrado' }

  return buildMetadata({
    title: destination.name,
    description: destination.shortIntro,
    path: ROUTES.destination(destination.slug),
    imageUrl: destination.heroImage?.url ?? null,
    seo: destination.seo,
  })
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const destination = await getDestinationBySlug(slug)
  if (!destination) notFound()

  const path = ROUTES.destination(destination.slug)
  const crumbs = [
    { name: 'Inicio', path: '/' },
    { name: 'Destinos', path: ROUTES.destinations },
    { name: destination.name, path },
  ]

  const schemas = [destinationSchema(destination, path), breadcrumbSchema(crumbs)]
  const faqs = destination.faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))
  const faqLd = faqSchema(faqs)
  if (faqLd) schemas.push(faqLd)
  const ld = jsonLdScript(schemas)

  // Products and editorial for this place - the hub of the internal link graph.
  const [tours, posts] = await Promise.all([
    listTours({ destinationSlug: destination.slug, pageSize: 6 }),
    listBlogPosts({ pageSize: 3 }),
  ])

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <div className="relative isolate flex min-h-[26rem] items-end overflow-hidden bg-lenga-950">
        <div className="absolute inset-0 -z-10">
          <SmartImage
            media={destination.heroImage}
            seed={destination.slug}
            alt={destination.name}
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 scrim-bottom" />
        </div>

        <div className="container-page relative pb-10 pt-24">
          <Breadcrumbs items={crumbs} tone="light" />
          <h1 className="mt-4 max-w-3xl font-display text-display-md font-bold leading-[1.08] text-white">
            {destination.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85">
            {destination.shortIntro}
          </p>
        </div>
      </div>

      <div className="container-prose mt-12">
        <Markdown content={destination.description} />
      </div>

      {destination.attractions.length > 0 ? (
        <section className="container-page mt-16">
          <h2 className="font-display text-2xl font-semibold text-lenga-950">Qué ver y hacer</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destination.attractions.map((attraction) => (
              <li
                key={attraction.id}
                className="overflow-hidden rounded-card border border-stone-200 bg-white"
              >
                <div className="relative aspect-[16/10] bg-stone-100">
                  <SmartImage
                    media={attraction.image}
                    seed={attraction.slug}
                    alt={attraction.name}
                    sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-[1.0625rem] font-semibold text-lenga-950">
                    {attraction.name}
                  </h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-lenga-600">
                    {attraction.summary}
                  </p>
                  {attraction.openingInfo || attraction.entryFeeInfo ? (
                    <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-xs text-lenga-500">
                      {attraction.openingInfo ? (
                        <div>
                          <dt className="inline font-semibold">Horarios: </dt>
                          <dd className="inline">{attraction.openingInfo}</dd>
                        </div>
                      ) : null}
                      {attraction.entryFeeInfo ? (
                        <div>
                          <dt className="inline font-semibold">Entrada: </dt>
                          <dd className="inline">{attraction.entryFeeInfo}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tours.items.length > 0 ? (
        <section className="container-page mt-16">
          <h2 className="font-display text-2xl font-semibold text-lenga-950">
            Excursiones en {destination.name}
          </h2>
          <p className="mt-2 text-sm text-lenga-600">
            Experiencias que podés reservar online para conocer este destino.
          </p>
          <TourGrid tours={tours.items} columns={3} className="mt-6" />
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section className="container-prose mt-16">
          <h2 className="font-display text-2xl font-semibold text-lenga-950">
            Preguntas frecuentes
          </h2>
          <FaqList faqs={faqs} className="mt-5" />
        </section>
      ) : null}

      {posts.items.length > 0 ? (
        <section className="container-page mt-16 border-t border-stone-200 pt-12">
          <h2 className="font-display text-xl font-semibold text-lenga-950">
            Seguí leyendo en la guía de viaje
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {posts.items.map((post) => (
              <li key={post.id}>
                <Link
                  href={ROUTES.blogPost(post.slug)}
                  className="block rounded-card border border-stone-200 p-4 transition-colors hover:border-glacier-300 hover:bg-stone-50"
                >
                  <h3 className="font-sans text-[0.9375rem] font-semibold leading-snug text-lenga-950">
                    {post.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-lenga-600">
                    {post.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
