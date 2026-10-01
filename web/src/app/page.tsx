import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Clock, Compass, MapPin, MessagesSquare, ShieldCheck } from 'lucide-react'
import { ROUTES, absoluteUrl } from '@vamos/shared'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { WhatsAppButton } from '@/components/layout/WhatsAppButton'
import { Hero } from '@/components/marketing/Hero'
import { CtaBanner } from '@/components/marketing/CtaBanner'
import { HeroSlider } from '@/components/home/HeroSlider'
import { CategoryTiles } from '@/components/home/CategoryTiles'
import { SpotlightBanner } from '@/components/home/SpotlightBanner'
import { FactsBanner } from '@/components/home/FactsBanner'
import { SeasonTabs } from '@/components/home/SeasonTabs'
import { PhotoMarquee } from '@/components/home/PhotoMarquee'
import { StoryCarousel } from '@/components/home/StoryCarousel'
import { ReviewsCarousel } from '@/components/home/ReviewsCarousel'
import { SEASONS } from '@/lib/seasons'
import {
  getCategoryTiles,
  getHeroSlides,
  getHomeReviews,
  getSeasonImages,
  getShowcasePhotos,
  getSpotlightTour,
} from '@/server/queries/home'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { TourCarousel } from '@/components/tours/TourCarousel'
import { TourCard } from '@/components/tours/TourCard'
import { DestinationCarousel } from '@/components/marketing/DestinationCarousel'
import { SmartImage } from '@/components/media/SmartImage'
import { HomeSearch } from '@/components/marketing/HomeSearch'
import { getFeaturedTours, getTourCategories, listTours } from '@/server/queries/tours'
import {
  getHeroImage,
  getSiteSettings,
  listBlogPosts,
  listDestinations,
  listHotels,
} from '@/server/queries/content'

/** Distances are road distances, rounded; they describe the route, not a service promise. */
const TRANSFER_ROUTES = [
  { from: 'Aeropuerto FTE', to: 'El Calafate', detail: 'Unos 23 km por la Ruta 11 · aprox. 25 minutos' },
  { from: 'El Calafate', to: 'El Chaltén', detail: 'Unos 215 km por las rutas 40 y 23 · aprox. 3 horas' },
]

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
  const [
    featured,
    categories,
    transfers,
    destinations,
    posts,
    hotels,
    settings,
    heroImage,
    slides,
    tiles,
    spotlight,
    showcase,
    reviews,
    seasonImages,
  ] = await Promise.all([
    getFeaturedTours(8),
    getTourCategories('excursiones'),
    listTours({ channel: 'traslados', pageSize: 6 }),
    listDestinations(),
    listBlogPosts({ pageSize: 8 }),
    listHotels({ pageSize: 3 }),
    getSiteSettings(),
    getHeroImage(),
    getHeroSlides(),
    getCategoryTiles('excursiones'),
    getSpotlightTour(),
    getShowcasePhotos(16),
    getHomeReviews(9),
    getSeasonImages(),
  ])

  const heroTitle =
    typeof settings['site.heroTitle'] === 'string'
      ? settings['site.heroTitle']
      : 'Viví la Patagonia desde El Calafate'

  const heroSubtitle =
    typeof settings['site.heroSubtitle'] === 'string'
      ? settings['site.heroSubtitle']
      : 'Excursiones al Glaciar Perito Moreno, navegaciones por el Lago Argentino y traslados, con reserva online.'

  // An operator-written headline overrides the first slide's copy.
  const heroSlides = slides.map((slide, index) =>
    index === 0 ? { ...slide, title: heroTitle, description: heroSubtitle } : slide,
  )

  const seasons = SEASONS.map((season) => ({
    ...season,
    goodFor: [...season.goodFor],
    media: seasonImages[season.imageSlug] ?? null,
  }))

  const factsImage = seasonImages['glaciar-perito-moreno'] ?? heroImage
  const ctaImage = seasonImages['lago-argentino'] ?? seasonImages['el-chalten'] ?? null

  return (
    <>
      {/* Transparent over the hero, solid once scrolled. */}
      <Header overHero />

      <main id="contenido">
        {/* ── 1. Hero slider (falls back to a single hero) ──────────────── */}
        {heroSlides.length > 1 ? (
          <HeroSlider slides={heroSlides} />
        ) : (
          <Hero media={heroImage} title={heroTitle} subtitle={heroSubtitle} />
        )}

        {/* ── 2. Search ─────────────────────────────────────────────────── */}
        <section className="relative z-20 -mt-10 pb-4" aria-label="Buscar experiencias">
          <div className="container-page">
            <HomeSearch categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
          </div>
        </section>

        {/* ── 3. Featured excursions ────────────────────────────────────── */}
        <section className="container-page py-16 sm:py-24">
          <SectionHeading
            eyebrow="Experiencias destacadas"
            title="Las excursiones que definen un viaje a El Calafate"
            description="Del frente del Perito Moreno a los glaciares que solo se alcanzan navegando."
            link={{ href: ROUTES.tours, label: 'Ver todas las excursiones' }}
          />
          <div className="reveal mt-10">
            <TourCarousel tours={featured} ariaLabel="Excursiones destacadas" priorityCount={0} />
          </div>
        </section>

        {/* ── 4. Experience types, as a photo bento ─────────────────────── */}
        {tiles.length > 0 ? (
          <section className="relative border-y border-border bg-surface-muted py-16 sm:py-24">
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="container-page relative">
              <SectionHeading
                eyebrow="Explorá por tipo de experiencia"
                title="Elegí cómo querés conocer la región"
                description="Hielo, agua, montaña o estepa: cada forma de recorrer Los Glaciares cuenta otra historia."
                link={{ href: ROUTES.tours, label: 'Ver el catálogo completo' }}
              />
              <div className="mt-10">
                <CategoryTiles categories={tiles} />
              </div>
            </div>
          </section>
        ) : null}

        {/* ── 5. Spotlight banner ───────────────────────────────────────── */}
        {spotlight ? <SpotlightBanner tour={spotlight} /> : null}

        {/* ── 6. Destinations ───────────────────────────────────────────── */}
        <section className="container-page py-16 sm:py-24">
          <SectionHeading
            eyebrow="Destinos"
            title="La región, explicada"
            description="Qué es cada lugar, cómo se llega y qué se puede hacer allí."
            link={{ href: ROUTES.destinations, label: 'Ver todos los destinos' }}
          />
          <div className="reveal mt-10">
            <DestinationCarousel destinations={destinations} ariaLabel="Destinos de la región" />
          </div>
        </section>

        {/* ── 7. Facts banner ───────────────────────────────────────────── */}
        <FactsBanner media={factsImage} />

        {/* ── 8. When to travel ─────────────────────────────────────────── */}
        <section className="container-page py-16 sm:py-24">
          <SectionHeading
            eyebrow="Cuándo viajar"
            title="Cada estación, otra Patagonia"
            description="El Calafate se visita todo el año. Esto es lo que cambia según cuándo vengas."
            align="center"
          />
          <div className="reveal mt-10">
            <SeasonTabs seasons={seasons} />
          </div>
        </section>

        {/* ── 9. Transfers, as a split feature ────────────────────────── */}
        {transfers.items.length > 0 ? (
          <section className="relative overflow-hidden border-y border-border bg-surface-muted py-16 sm:py-24">
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="container-page relative grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)] lg:gap-14">
              <div className="reveal lg:sticky lg:top-28 lg:self-start">
                <SectionHeading
                  eyebrow="Traslados"
                  title="Llegá y movete sin resolverlo sobre la marcha"
                  description="Del aeropuerto al centro y de El Calafate a El Chaltén, con seguimiento del vuelo."
                />
                <ol className="mt-8 space-y-0">
                  {TRANSFER_ROUTES.map((route, index) => (
                    <li key={route.from} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < TRANSFER_ROUTES.length - 1 ? (
                        <span className="absolute left-[0.6875rem] top-7 h-[calc(100%-1.25rem)] w-px bg-gradient-to-b from-primary/60 to-transparent" aria-hidden="true" />
                      ) : null}
                      <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-magenta-500 text-[0.6875rem] font-bold text-white">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-[0.9375rem] font-semibold text-heading">
                          {route.from} <span className="text-primary">→</span> {route.to}
                        </p>
                        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{route.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <Link
                  href={ROUTES.transfers}
                  className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
                >
                  Ver todos los traslados
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="reveal">
                {transfers.items.length <= 2 ? (
                  <ul className="grid gap-5 sm:grid-cols-2">
                    {transfers.items.map((tour) => (
                      <li key={tour.id} className="flex">
                        <TourCard tour={tour} className="w-full" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <TourCarousel tours={transfers.items} ariaLabel="Traslados disponibles" />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── 10. Photo strip ───────────────────────────────────────────── */}
        {showcase.length >= 4 ? (
          <section className="py-16 sm:py-24">
            <div className="container-page">
              <SectionHeading
                eyebrow="Galería"
                title="La Patagonia austral en imágenes"
                align="center"
              />
            </div>
            <div className="mt-10">
              <PhotoMarquee photos={showcase} />
            </div>
          </section>
        ) : null}

        {/* ── 11. Reviews (only real, approved ones) ────────────────────── */}
        {reviews.length > 0 ? (
          <section className="border-y border-border bg-surface-muted py-16 sm:py-24">
            <div className="container-page">
              <SectionHeading eyebrow="Opiniones" title="Lo que cuentan quienes ya viajaron" />
              <div className="reveal mt-10">
                <ReviewsCarousel reviews={reviews} />
              </div>
            </div>
          </section>
        ) : null}

        {/* ── 12. Why book here ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div
            className="pointer-events-none absolute -right-40 -top-40 size-[30rem] rounded-full bg-violet-500/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-40 -left-40 size-[30rem] rounded-full bg-magenta-500/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="container-page relative">
            <SectionHeading
              eyebrow="Por qué reservar acá"
              title="Reservá con información clara, antes de viajar"
              align="center"
            />
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* ── 13. Travel guide ──────────────────────────────────────────── */}
        {posts.items.length > 0 ? (
          <section className="border-t border-border bg-surface-muted py-16 sm:py-24">
            <div className="container-page">
              <SectionHeading
                eyebrow="Guía de viaje"
                title="Todo lo que conviene saber antes de venir"
                description="Cuántos días quedarse, cómo llegar, qué llevar y cómo organizar cada día."
                link={{ href: ROUTES.blog, label: 'Ver todos los artículos' }}
              />
              <div className="reveal mt-10">
                <StoryCarousel posts={posts.items} />
              </div>
            </div>
          </section>
        ) : null}

        {/* ── 14. Where to stay ─────────────────────────────────────────── */}
        {hotels.items.length > 0 ? (
          <section className="container-page py-16 sm:py-24">
            <SectionHeading
              eyebrow="Guía local"
              title="Dónde dormir y dónde comer"
              description="Alojamientos, restaurantes y servicios de El Calafate."
              link={{ href: ROUTES.hotels, label: 'Ver la guía completa' }}
            />

            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hotels.items.map((hotel) => (
                <li key={hotel.id} className="reveal">
                  <Link
                    href={ROUTES.hotel(hotel.slug)}
                    className="group flex h-full gap-4 rounded-[1.25rem] border border-border bg-surface p-3.5 shadow-subtle transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-raised"
                  >
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-card">
                      <SmartImage
                        media={hotel.images[0]?.media}
                        seed={hotel.slug}
                        alt={hotel.name}
                        sizes="96px"
                        className="transition-transform duration-500 group-hover:scale-[1.08]"
                      />
                    </div>

                    <div className="min-w-0 flex-1 py-1">
                      <h3 className="font-sans text-[0.9375rem] font-semibold leading-snug text-heading group-hover:text-primary">
                        {hotel.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {hotel.summary}
                      </p>
                      {hotel.address ? (
                        <p className="mt-2 inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                          <MapPin className="size-3" aria-hidden="true" />
                          {hotel.address}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[1.25rem] border border-primary/20 bg-primary-soft px-6 py-5 sm:flex-row">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-heading">¿Tenés un hotel o comercio en El Calafate?</span>{' '}
                Sumalo gratis a la guía local.
              </p>
              <Link
                href={ROUTES.hotelRegister}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Registrar mi negocio
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        ) : null}

        {/* ── 15. Closing call to action ────────────────────────────────── */}
        <CtaBanner
          eyebrow="Empezá a planificar"
          title="Tu viaje a El Calafate, resuelto antes de llegar"
          description="Elegí la excursión, seleccioná la fecha y reservá online. Si tenés dudas, escribinos: respondemos antes de que pagues."
          primary={{ href: ROUTES.tours, label: 'Ver excursiones' }}
          secondary={{ href: ROUTES.contact, label: 'Hacer una consulta' }}
          media={ctaImage}
        />
      </main>

      <Footer flush />
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
    <li className="reveal group rounded-[1.25rem] border border-border bg-surface p-6 shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-raised">
      <span
        className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-magenta-500 text-white shadow-[0_8px_20px_rgb(108_88_254/0.3)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3 className="mt-5 font-sans text-base font-bold text-heading">{title}</h3>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
    </li>
  )
}
