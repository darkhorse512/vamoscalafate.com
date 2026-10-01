import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ROUTES } from '@vamos/shared'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { FaqList } from '@/components/content/FaqList'
import { Markdown } from '@/components/content/Markdown'
import { PhotoCredit } from '@/components/media/PhotoCredit'
import { SmartImage } from '@/components/media/SmartImage'
import { TourCarousel } from '@/components/tours/TourCarousel'
import { breadcrumbSchema, destinationSchema, faqSchema, jsonLdScript } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { getDestinationBySlug, getDestinationSlugs, listBlogPosts } from '@/server/queries/content'
import { listTours } from '@/server/queries/tours'
import { ArrowDown } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { StoryCarousel } from '@/components/home/StoryCarousel'

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
    listBlogPosts({ pageSize: 6 }),
  ])

  return (
    <>
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={ld} /> : null}

      <div className="relative isolate flex min-h-[min(70svh,36rem)] items-end overflow-hidden bg-inverse">
        <div className="absolute inset-0 -z-10">
          <SmartImage
            media={destination.heroImage}
            seed={destination.slug}
            alt={destination.name}
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-plum-950/80 via-plum-950/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-plum-950/90 via-plum-950/20 to-transparent" />
        </div>

        {/* Credit over the image itself — there is no page background here to
            place it on, and the licence requires it alongside the work. */}
        <PhotoCredit
          media={destination.heroImage}
          tone="light"
          className="absolute bottom-2 right-4 z-10 text-right"
        />

        <div className="container-page relative pb-14 pt-28">
          <Breadcrumbs items={crumbs} tone="light" />
          <p className="mt-6 inline-flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-violet-300">
            <span className="accent-rule" aria-hidden="true" />
            Destino · Patagonia austral
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-display-lg font-bold leading-[1.04] text-white">
            {destination.name}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/85 sm:text-[1.0625rem]">
            {destination.shortIntro}
          </p>
          {tours.items.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#excursiones" size="lg" variant="accent">
                Ver {tours.items.length} {tours.items.length === 1 ? 'experiencia' : 'experiencias'}
                <ArrowDown className="size-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </div>

      <div className="container-page mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="max-w-[68ch]">
          <Markdown content={destination.description} />
        </div>

        {/* Planning card: the next step from reading to booking. */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-raised">
            <div className="bg-aurora px-6 py-6 text-white">
              <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-violet-300">
                Planificá tu visita
              </p>
              <p className="mt-2 font-display text-xl font-semibold leading-snug">{destination.name}</p>
            </div>
            <div className="space-y-4 p-6">
              {tours.items.length > 0 ? (
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-heading">{tours.items.length}</span>{' '}
                  {tours.items.length === 1 ? 'experiencia disponible' : 'experiencias disponibles'} para
                  reservar online.
                </p>
              ) : null}
              <ButtonLink href={tours.items.length > 0 ? '#excursiones' : ROUTES.tours} fullWidth variant="accent">
                Ver excursiones
              </ButtonLink>
              <ButtonLink href={ROUTES.contact} fullWidth variant="outline">
                Hacer una consulta
              </ButtonLink>
            </div>
          </div>
        </aside>
      </div>

      {destination.attractions.length > 0 ? (
        <section className="container-page mt-20">
          <SectionHeading eyebrow="Imperdibles" title="Qué ver y hacer" />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destination.attractions.map((attraction) => (
              <li
                key={attraction.id}
                className="group overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:shadow-raised"
              >
                <div className="relative aspect-[16/10] bg-surface-strong">
                  <SmartImage
                    media={attraction.image}
                    seed={attraction.slug}
                    alt={attraction.name}
                    sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                    className="transition-transform duration-700 group-hover:scale-[1.06]"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-[1.0625rem] font-semibold text-heading">
                    {attraction.name}
                  </h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                    {attraction.summary}
                  </p>
                  {attraction.openingInfo || attraction.entryFeeInfo ? (
                    <dl className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
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
        <section id="excursiones" className="mt-20 border-y border-border bg-surface-muted py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Reservá online"
              title={`Excursiones en ${destination.name}`}
              description="Experiencias que podés reservar online para conocer este destino."
              link={{ href: ROUTES.tours, label: 'Ver el catálogo completo' }}
            />
            <div className="mt-10">
              <TourCarousel tours={tours.items} ariaLabel={`Excursiones en ${destination.name}`} />
            </div>
          </div>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section className="container-prose py-16 sm:py-20">
          <SectionHeading eyebrow="Antes de ir" title="Preguntas frecuentes" />
          <FaqList faqs={faqs} className="mt-8" />
        </section>
      ) : null}

      {posts.items.length > 0 ? (
        <section className="container-page py-16 sm:py-20">
          <SectionHeading
            eyebrow="Guía de viaje"
            title="Seguí leyendo antes de viajar"
            link={{ href: ROUTES.blog, label: 'Ver todos los artículos' }}
          />
          <div className="mt-10">
            <StoryCarousel posts={posts.items} />
          </div>
        </section>
      ) : null}
    </>
  )
}
