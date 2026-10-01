import Link from 'next/link'
import type { Metadata } from 'next'
import {
  ArrowRight, Clock, Compass, Heart, Map as MapIcon, MapPin, MessagesSquare, ShieldCheck, Star, Users,
} from 'lucide-react'
import { ROUTES, absoluteUrl } from '@vamos/shared'
import type { HomeConfig, HomeSectionId } from '@vamos/validation'
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
import { MustSeeBanner } from '@/components/home/MustSeeBanner'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'
import { TourCard } from '@/components/tours/TourCard'
import { DestinationCarousel } from '@/components/marketing/DestinationCarousel'
import { SmartImage } from '@/components/media/SmartImage'
import { HomeSearch } from '@/components/marketing/HomeSearch'
import { cn } from '@/lib/utils'
import { getTourCategories } from '@/server/queries/tours'
import { getHeroImage, listBlogPosts, listDestinations, listHotels } from '@/server/queries/content'
import {
  getCatalogue,
  getCategoryTiles,
  getHeroSlides,
  getHomeConfig,
  getHomeReviews,
  getMediaByIds,
  getMustSeeTours,
  getSeasonImages,
  getShowcasePhotos,
  getSpotlightTour,
} from '@/server/queries/home'

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/') },
}

/** Sections drawn full-bleed; the others alternate white / tinted bands. */
const FULL_BLEED: HomeSectionId[] = ['search', 'spotlight', 'facts', 'cta']

const WHY_ICONS = {
  compass: Compass,
  clock: Clock,
  shield: ShieldCheck,
  messages: MessagesSquare,
  star: Star,
  heart: Heart,
  map: MapIcon,
  users: Users,
} as const

/**
 * Homepage.
 *
 * Rendered entirely from the homepage configuration that editors manage in
 * the admin ("Página de inicio"): which sections appear, in what order, and
 * all their texts, images, buttons and items. Without a saved configuration
 * the defaults reproduce the page as designed.
 *
 * A section that is switched off, or that has nothing real to show (no
 * approved reviews, no hotels yet), renders nothing rather than an empty
 * frame. Data is fetched in parallel.
 */
export default async function HomePage() {
  const config = await getHomeConfig()
  const s = config.sections

  const [
    hero,
    heroImage,
    categories,
    destinations,
    posts,
    hotels,
    tiles,
    spotlight,
    showcase,
    reviews,
    seasonImages,
    catalogue,
    mustSee,
    chosenMedia,
  ] = await Promise.all([
    getHeroSlides(),
    getHeroImage(),
    getTourCategories('excursiones'),
    listDestinations(),
    listBlogPosts({ pageSize: s.guide.count }),
    listHotels({ pageSize: 3 }),
    getCategoryTiles('excursiones'),
    s.spotlight.tourSlug ? getSpotlightTour(s.spotlight.tourSlug) : Promise.resolve(null),
    getShowcasePhotos(s.gallery.maxPhotos),
    getHomeReviews(9),
    getSeasonImages(),
    getCatalogue(s.catalogue.tourSlugs),
    getMustSeeTours(s.catalogue.banner.tourSlugs),
    getMediaByIds([s.facts.imageId, s.cta.imageId, ...s.seasons.items.map((item) => item.imageId)]),
  ])

  // Alternate the tinted background across the band sections that are on.
  let band = 0
  const tinted = new Map<HomeSectionId, boolean>()
  for (const id of config.order) {
    if (!s[id].enabled || FULL_BLEED.includes(id)) continue
    tinted.set(id, band % 2 === 1)
    band += 1
  }

  const firstSlide = config.hero.slides[0]!

  const render: Record<HomeSectionId, () => React.ReactNode> = {
    // ── Search ───────────────────────────────────────────────────────────
    search: () => (
      <section key="search" className="relative z-20 -mt-10 pb-4" aria-label="Buscar experiencias">
        <div className="container-page">
          <HomeSearch categories={categories.map((c) => ({ slug: c.slug, name: c.name }))} />
        </div>
      </section>
    ),

    // ── Catalogue, with the "3 imperdibles" banner and closing card ──────
    catalogue: () => {
      if (catalogue.length === 0) return null
      const split = s.catalogue.banner.enabled ? s.catalogue.tilesBeforeBanner : catalogue.length
      const before = catalogue.slice(0, split)
      const after = catalogue.slice(split)
      const closing = s.catalogue.closingCard
      // The closing card fills an incomplete last row so the grid never ends ragged.
      const remainder = after.length % 3
      const showClosing = closing.enabled && after.length > 0 && remainder !== 0

      return (
        <Band key="catalogue" tinted={tinted.get('catalogue')}>
          <Heading content={s.catalogue.heading} link={{ href: ROUTES.tours, label: 'Ver el catálogo con filtros' }} />

          {before.length > 0 ? (
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {before.map((tour, index) => (
                <li key={tour.id} className="reveal flex min-w-0">
                  <TourCard tour={tour} priority={index < 3} className="w-full" />
                </li>
              ))}
            </ul>
          ) : null}

          {s.catalogue.banner.enabled ? (
            <div className={before.length > 0 ? 'my-12' : 'mb-12 mt-10'}>
              <MustSeeBanner tours={mustSee} content={s.catalogue.banner} />
            </div>
          ) : null}

          {after.length > 0 ? (
            <ul className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', !s.catalogue.banner.enabled && 'mt-10')}>
              {after.map((tour) => (
                <li key={tour.id} className="reveal flex min-w-0">
                  <TourCard tour={tour} className="w-full" />
                </li>
              ))}
              {showClosing ? (
                <li
                  className={cn(
                    'reveal flex min-w-0',
                    remainder === 1 && 'lg:col-span-2',
                    after.length % 2 === 0 && 'sm:col-span-2 lg:col-span-1',
                  )}
                >
                  <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-[1.25rem] bg-aurora p-7 text-white shadow-raised sm:p-9">
                    <div>
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-violet-300">{closing.eyebrow}</p>
                      <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-white sm:text-[1.75rem]">
                        {closing.title}
                      </h3>
                      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-white/75">{closing.body}</p>
                    </div>
                    <div className="mt-7 flex flex-wrap gap-3">
                      {closing.primary.label ? (
                        <ButtonLink href={closing.primary.href || ROUTES.contact} variant="accent">
                          {closing.primary.label}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </ButtonLink>
                      ) : null}
                      {closing.secondary.label ? (
                        <ButtonLink href={closing.secondary.href || ROUTES.tours} variant="glass">
                          {closing.secondary.label}
                        </ButtonLink>
                      ) : null}
                    </div>
                  </div>
                </li>
              ) : null}
            </ul>
          ) : null}
        </Band>
      )
    },

    // ── Experience types ─────────────────────────────────────────────────
    categories: () =>
      tiles.length > 0 ? (
        <Band key="categories" tinted={tinted.get('categories')} dots>
          <Heading content={s.categories.heading} link={{ href: ROUTES.tours, label: 'Ver el catálogo completo' }} />
          <div className="mt-10">
            <CategoryTiles categories={tiles} />
          </div>
        </Band>
      ) : null,

    // ── Spotlight ────────────────────────────────────────────────────────
    spotlight: () =>
      spotlight ? (
        <SpotlightBanner key="spotlight" tour={spotlight} eyebrow={s.spotlight.eyebrow} ctaLabel={s.spotlight.ctaLabel} />
      ) : null,

    // ── Destinations ─────────────────────────────────────────────────────
    destinations: () =>
      destinations.length > 0 ? (
        <Band key="destinations" tinted={tinted.get('destinations')}>
          <Heading content={s.destinations.heading} link={{ href: ROUTES.destinations, label: 'Ver todos los destinos' }} />
          <div className="reveal mt-10">
            <DestinationCarousel destinations={destinations} ariaLabel="Destinos de la región" />
          </div>
        </Band>
      ) : null,

    // ── Facts ────────────────────────────────────────────────────────────
    facts: () => (
      <FactsBanner
        key="facts"
        media={chosenMedia[s.facts.imageId] ?? seasonImages['glaciar-perito-moreno'] ?? heroImage}
        eyebrow={s.facts.eyebrow}
        title={s.facts.title}
        items={s.facts.items}
      />
    ),

    // ── Seasons ──────────────────────────────────────────────────────────
    seasons: () => (
      <Band key="seasons" tinted={tinted.get('seasons')}>
        <Heading content={s.seasons.heading} align="center" />
        <div className="reveal mt-10">
          <SeasonTabs
            seasons={s.seasons.items.map((item) => ({
              ...item,
              media: chosenMedia[item.imageId] ?? seasonImages[item.imageFrom] ?? null,
            }))}
          />
        </div>
      </Band>
    ),

    // ── Photo strip ──────────────────────────────────────────────────────
    gallery: () =>
      showcase.length >= 4 ? (
        <section
          key="gallery"
          className={cn('py-16 sm:py-24', tinted.get('gallery') && 'border-y border-border bg-surface-muted')}
        >
          <div className="container-page">
            <Heading content={s.gallery.heading} align="center" />
          </div>
          <div className="mt-10">
            <PhotoMarquee photos={showcase} />
          </div>
        </section>
      ) : null,

    // ── Reviews: only real, approved ones ────────────────────────────────
    reviews: () =>
      reviews.length > 0 ? (
        <Band key="reviews" tinted={tinted.get('reviews')}>
          <Heading content={s.reviews.heading} />
          <div className="reveal mt-10">
            <ReviewsCarousel reviews={reviews} />
          </div>
        </Band>
      ) : null,

    // ── Why book here ────────────────────────────────────────────────────
    why: () => (
      <section
        key="why"
        className={cn(
          'relative overflow-hidden py-16 sm:py-24',
          tinted.get('why') && 'border-y border-border bg-surface-muted',
        )}
      >
        <div
          className="pointer-events-none absolute -right-40 -top-40 size-[30rem] rounded-full bg-violet-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 size-[30rem] rounded-full bg-magenta-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="container-page relative">
          <Heading content={s.why.heading} align="center" />
          <ul
            className={cn(
              'mt-12 grid gap-5 sm:grid-cols-2',
              s.why.items.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-4',
            )}
          >
            {s.why.items.map((item) => {
              const Icon = WHY_ICONS[item.icon]
              return (
                <li
                  key={item.title}
                  className="reveal group rounded-[1.25rem] border border-border bg-surface p-6 shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-raised"
                >
                  <span
                    className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-magenta-500 text-white shadow-[0_8px_20px_rgb(108_88_254/0.3)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-sans text-base font-bold text-heading">{item.title}</h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">{item.description}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    ),

    // ── Travel guide ─────────────────────────────────────────────────────
    guide: () =>
      posts.items.length > 0 ? (
        <Band key="guide" tinted={tinted.get('guide')}>
          <Heading content={s.guide.heading} link={{ href: ROUTES.blog, label: 'Ver todos los artículos' }} />
          <div className="reveal mt-10">
            <StoryCarousel posts={posts.items} />
          </div>
        </Band>
      ) : null,

    // ── Where to stay: shown once real listings exist ────────────────────
    hotels: () =>
      hotels.items.length > 0 ? (
        <Band key="hotels" tinted={tinted.get('hotels')}>
          <Heading content={s.hotels.heading} link={{ href: ROUTES.hotels, label: 'Ver la guía completa' }} />
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
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{hotel.summary}</p>
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
        </Band>
      ) : null,

    // ── Closing call to action ───────────────────────────────────────────
    cta: () => (
      <CtaBanner
        key="cta"
        eyebrow={s.cta.eyebrow}
        title={s.cta.title}
        description={s.cta.description}
        primary={{ href: s.cta.primary.href || ROUTES.tours, label: s.cta.primary.label || 'Ver excursiones' }}
        secondary={
          s.cta.secondary.label ? { href: s.cta.secondary.href || ROUTES.contact, label: s.cta.secondary.label } : undefined
        }
        media={chosenMedia[s.cta.imageId] ?? seasonImages['lago-argentino'] ?? null}
      />
    ),
  }

  const lastEnabled = [...config.order].reverse().find((id) => s[id].enabled)

  return (
    <>
      {/* Transparent over the hero, solid once scrolled. */}
      <Header overHero />

      <main id="contenido">
        {hero.slides.length > 0 ? (
          <HeroSlider slides={hero.slides} autoplaySeconds={hero.autoplaySeconds} />
        ) : (
          <Hero media={heroImage} title={firstSlide.title} subtitle={firstSlide.description} />
        )}

        {config.order.map((id) => (s[id].enabled ? render[id]() : null))}
      </main>

      {/* A page ending in a full-bleed band sits flush against the footer. */}
      <Footer flush={lastEnabled === 'cta' || lastEnabled === 'spotlight' || lastEnabled === 'facts'} />
      <WhatsAppButton context="homepage" />
    </>
  )
}

/** Standard section band: optional tinted background and dot pattern. */
function Band({
  tinted = false,
  dots = false,
  children,
}: {
  tinted?: boolean
  dots?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={cn('relative py-16 sm:py-24', tinted && 'border-y border-border bg-surface-muted')}>
      {dots && tinted ? <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" /> : null}
      <div className="container-page relative">{children}</div>
    </section>
  )
}

function Heading({
  content,
  link,
  align,
}: {
  content: HomeConfig['sections']['catalogue']['heading']
  link?: { href: string; label: string }
  align?: 'left' | 'center'
}) {
  return (
    <SectionHeading
      eyebrow={content.eyebrow || undefined}
      title={content.title}
      description={content.description || undefined}
      link={align === 'center' ? undefined : link}
      align={align}
    />
  )
}
