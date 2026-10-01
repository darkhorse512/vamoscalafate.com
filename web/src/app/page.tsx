import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Clock, Compass, MapPin, MessagesSquare, ShieldCheck } from 'lucide-react'
import { ROUTES, absoluteUrl, formatDate } from '@vamos/shared'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { Hero } from '@/components/marketing/Hero'
import { CtaBanner } from '@/components/marketing/CtaBanner'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TourCarousel } from '@/components/tours/TourCarousel'
import { DestinationCarousel } from '@/components/marketing/DestinationCarousel'
import { SmartImage } from '@/components/media/SmartImage'
import { HomeSearch } from '@/components/marketing/HomeSearch'
import {
  getFeaturedTours,
  getTourCategories,
  listTours,
} from '@/server/queries/tours'
import { listBlogPosts, listDestinations, listHotels, getSiteSettings } from '@/server/queries/content'

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/') },
}

/**
 * Homepage.
 *
 * A Server Component throughout: the only client JavaScript is the header,
 * the search box and the consent banner. Everything else - hero, grids,
 * editorial - is HTML on first paint.
 *
 * Data is fetched in parallel; a waterfall of sequential awaits here would
 * add a full round-trip per section to TTFB.
 */
export default async function HomePage() {
  const [featured, categories, transfers, destinations, posts, hotels, settings] =
    await Promise.all([
      getFeaturedTours(6),
      getTourCategories('excursiones'),
      listTours({ channel: 'traslados', pageSize: 3 }),
      listDestinations(),
      listBlogPosts({ pageSize: 3 }),
      listHotels({ pageSize: 3 }),
      getSiteSettings(),
    ])

  const heroTitle =
    typeof settings['site.heroTitle'] === 'string'
      ? settings['site.heroTitle']
      : 'Viví la Patagonia desde El Calafate'

  const heroSubtitle =
    typeof settings['site.heroSubtitle'] === 'string'
      ? settings['site.heroSubtitle']
      : 'Excursiones al Glaciar Perito Moreno, navegaciones por el Lago Argentino y traslados, con reserva online.'

  return (
    <>
      {/* Transparent over the hero, solid once scrolled. */}
      <Header overHero />

      <main id="contenido">
        <Hero title={heroTitle} subtitle={heroSubtitle} />

        {/* ── 2. Search / discovery ─────────────────────────────────────── */}
        <section className="relative z-10 -mt-8 pb-4" aria-label="Buscar experiencias">
          <div className="container-page">
            <HomeSearch categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
          </div>
        </section>

        {/* ── 3. Featured excursions ────────────────────────────────────── */}
        <section className="container-page py-16 sm:py-20">
          <SectionHeading
            eyebrow="Experiencias destacadas"
            title="Las excursiones que definen un viaje a El Calafate"
            description="Del frente del Perito Moreno a los glaciares que solo se alcanzan navegando."
            link={{ href: ROUTES.tours, label: 'Ver todas las excursiones' }}
          />
          <div className="mt-9">
            <TourCarousel
              tours={featured}
              ariaLabel="Excursiones destacadas"
              priorityCount={3}
            />
          </div>
        </section>

        {/* ── 4. Why Vamos Calafate ─────────────────────────────────────── */}
        <section className="border-y border-border bg-surface-muted py-16 sm:py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Por qué reservar acá"
              title="Reservá con información clara, antes de viajar"
              align="center"
            />

            <ul className="mx-auto mt-10 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <ValueProp
                icon={<Compass className="size-5" aria-hidden="true" />}
                title="Información verificable"
                description="Distancias, accesos y condiciones de cada actividad, sin promesas que el clima patagónico no puede sostener."
              />
              <ValueProp
                icon={<Clock className="size-5" aria-hidden="true" />}
                title="Disponibilidad real"
                description="Los lugares que ves son los que hay. La reserva confirma sobre cupo real, no sobre una estimación."
              />
              <ValueProp
                icon={<ShieldCheck className="size-5" aria-hidden="true" />}
                title="Pago seguro"
                description="Procesado por plataformas de pago establecidas. No almacenamos datos de tu tarjeta."
              />
              <ValueProp
                icon={<MessagesSquare className="size-5" aria-hidden="true" />}
                title="Respuesta directa"
                description="Consultas por correo o WhatsApp antes y después de reservar, con la referencia de tu reserva."
              />
            </ul>
          </div>
        </section>

        {/* ── 5. Explore El Calafate - categories ───────────────────────── */}
        <section className="container-page py-16 sm:py-20">
          <SectionHeading
            eyebrow="Explorá por tipo de experiencia"
            title="Elegí cómo querés conocer la región"
          />

          <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`${ROUTES.tours}?categoria=${category.slug}`}
                  className="group flex h-full flex-col justify-between rounded-card border border-border bg-surface p-5 transition-all hover:border-violet-300 hover:shadow-raised"
                >
                  <div>
                    <h3 className="font-display text-[1.0625rem] font-semibold text-heading">
                      {category.name}
                    </h3>
                    {category.description ? (
                      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                        {category.description}
                      </p>
                    ) : null}
                  </div>

                  <p className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-violet-700">
                    {category._count.tours}{' '}
                    {category._count.tours === 1 ? 'experiencia' : 'experiencias'}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── 6. Transfers ──────────────────────────────────────────────── */}
        {transfers.items.length > 0 ? (
          <section className="border-y border-border bg-surface-muted py-16 sm:py-20">
            <div className="container-page">
              <SectionHeading
                eyebrow="Traslados"
                title="Llegá y movete sin resolverlo sobre la marcha"
                description="Del aeropuerto al centro y de El Calafate a El Chaltén, con seguimiento del vuelo."
                link={{ href: ROUTES.transfers, label: 'Ver todos los traslados' }}
              />
              <div className="mt-9">
                <TourCarousel tours={transfers.items} ariaLabel="Traslados disponibles" />
              </div>
            </div>
          </section>
        ) : null}

        {/* ── 7. Destination guide ──────────────────────────────────────── */}
        <section className="container-page py-16 sm:py-20">
          <SectionHeading
            eyebrow="Destinos"
            title="La región, explicada"
            description="Qué es cada lugar, cómo se llega y qué se puede hacer allí."
            link={{ href: ROUTES.destinations, label: 'Ver todos los destinos' }}
          />

          <div className="mt-9">
            <DestinationCarousel destinations={destinations} ariaLabel="Destinos de la región" />
          </div>
        </section>

        {/* ── 8. Hotels & businesses ────────────────────────────────────── */}
        {hotels.items.length > 0 ? (
          <section className="border-y border-border bg-surface-muted py-16 sm:py-20">
            <div className="container-page">
              <SectionHeading
                eyebrow="Guía local"
                title="Dónde dormir y dónde comer"
                description="Alojamientos, restaurantes y servicios de El Calafate."
                link={{ href: ROUTES.hotels, label: 'Ver la guía completa' }}
              />

              <ul className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {hotels.items.map((hotel) => (
                  <li key={hotel.id}>
                    <Link
                      href={ROUTES.hotel(hotel.slug)}
                      className="group flex h-full gap-4 rounded-card border border-border bg-surface p-3.5 transition-all hover:border-border-strong hover:shadow-subtle"
                    >
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-[0.3rem]">
                        <SmartImage
                          media={hotel.images[0]?.media}
                          seed={hotel.slug}
                          alt={hotel.name}
                          sizes="80px"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-sans text-[0.9375rem] font-semibold leading-snug text-heading">
                          {hotel.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {hotel.summary}
                        </p>
                        {hotel.address ? (
                          <p className="mt-2 inline-flex items-center gap-1 text-[0.6875rem] text-plum-500">
                            <MapPin className="size-3" aria-hidden="true" />
                            {hotel.address}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                ¿Tenés un hotel o comercio en El Calafate?{' '}
                <Link
                  href={ROUTES.hotelRegister}
                  className="font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-900"
                >
                  Registralo en la guía
                </Link>
                .
              </p>
            </div>
          </section>
        ) : null}

        {/* ── 9. Travel articles ────────────────────────────────────────── */}
        {posts.items.length > 0 ? (
          <section className="container-page py-16 sm:py-20">
            <SectionHeading
              eyebrow="Guía de viaje"
              title="Todo lo que conviene saber antes de venir"
              description="Cuántos días quedarse, cómo llegar, qué llevar y cómo organizar cada día."
              link={{ href: ROUTES.blog, label: 'Ver todos los artículos' }}
            />

            <ul className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.items.map((post) => (
                <li key={post.id}>
                  <article className="group h-full">
                    <Link href={ROUTES.blogPost(post.slug)} className="block">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-card">
                        <SmartImage
                          media={post.heroImage}
                          seed={post.slug}
                          alt={post.title}
                          sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
                          className="transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      </div>

                      <div className="mt-4">
                        {post.category ? (
                          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-violet-700">
                            {post.category.name}
                          </p>
                        ) : null}

                        <h3 className="mt-2 font-display text-[1.0625rem] font-semibold leading-snug text-heading group-hover:text-violet-800">
                          {post.title}
                        </h3>

                        <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                          {post.excerpt}
                        </p>

                        <p className="mt-3 text-xs text-plum-500">
                          {post.publishedAt ? formatDate(post.publishedAt) : null}
                          {' · '}
                          {post.readingTime} min de lectura
                        </p>
                      </div>
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── 10 & 11. Trust + final CTA ────────────────────────────────── */}
        <CtaBanner
          eyebrow="Empezá a planificar"
          title="Tu viaje a El Calafate, resuelto antes de llegar"
          description="Elegí la excursión, seleccioná la fecha y reservá online. Si tenés dudas, escribinos: respondemos antes de que pagues."
          primary={{ href: ROUTES.tours, label: 'Ver excursiones' }}
          secondary={{ href: ROUTES.contact, label: 'Hacer una consulta' }}
        />
      </main>

      <Footer />
      <WhatsAppButton context="homepage" />
    </>
  )
}

function ValueProp({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <li>
      <span
        className="grid size-10 place-items-center rounded-control bg-violet-50 text-violet-700"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="mt-4 font-sans text-[0.9375rem] font-bold text-heading">{title}</h3>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
    </li>
  )
}
