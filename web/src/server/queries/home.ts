import { cacheTags, prisma } from '@vamos/db'
import { ROUTES } from '@vamos/shared'
import type { MediaRef, TourCard } from '@vamos/types'
import { cachedQuery, REVALIDATE } from '../cache.ts'
import { mediaSelect } from './content.ts'
import { cardSelect } from './tours.ts'

/**
 * Homepage-only data.
 *
 * Everything here is assembled from content that already exists — published
 * tours, destinations and the media library — so the homepage can never
 * advertise an experience that has been unpublished, and there is no second
 * copy of any text to keep in step.
 */

const published = { status: 'PUBLISHED', publishedAt: { not: null, lte: new Date() } } as const

// ── Hero slides ────────────────────────────────────────────────────────────

export type HeroSlide = {
  id: string
  media: MediaRef
  eyebrow: string
  title: string
  description: string
  cta: { href: string; label: string }
  /** Short label for the slide selector. */
  tabLabel: string
}

/**
 * The slide plan. Each one points at a real tour or destination; a slide
 * whose source is missing, unpublished or has no photograph is dropped rather
 * than shown half-empty.
 */
const SLIDE_PLAN = [
  {
    kind: 'destination',
    slug: 'glaciar-perito-moreno',
    eyebrow: 'Parque Nacional Los Glaciares',
    title: 'Viví la Patagonia desde El Calafate',
    description:
      'Excursiones al Glaciar Perito Moreno, navegaciones por el Lago Argentino y traslados, con reserva online.',
    label: 'Ver excursiones',
    href: ROUTES.tours,
    tab: 'Perito Moreno',
  },
  {
    kind: 'tour',
    slug: 'minitrekking-perito-moreno',
    eyebrow: 'Trekking sobre hielo',
    title: 'Caminá sobre el glaciar',
    description:
      'Con crampones y guías de montaña, recorré la superficie del Perito Moreno entre grietas y sumideros de hielo azul.',
    label: 'Ver el minitrekking',
    tab: 'Minitrekking',
  },
  {
    kind: 'tour',
    slug: 'navegacion-todo-glaciares',
    eyebrow: 'Navegación lacustre',
    title: 'Navegá entre témpanos',
    description:
      'Los brazos del Lago Argentino llevan a frentes glaciares que solo se alcanzan por agua, como el Upsala y el Spegazzini.',
    label: 'Ver la navegación',
    tab: 'Todo Glaciares',
  },
  {
    kind: 'destination',
    slug: 'el-chalten',
    eyebrow: 'Capital nacional del trekking',
    title: 'El Chaltén y el Fitz Roy',
    description:
      'A unas tres horas por la Ruta 40, los senderos más célebres de la Patagonia parten desde el mismo pueblo.',
    label: 'Conocer El Chaltén',
    tab: 'El Chaltén',
  },
  {
    kind: 'destination',
    slug: 'lago-argentino',
    eyebrow: 'El lago más grande del país',
    title: 'Lago Argentino',
    description:
      'Aguas color turquesa alimentadas por el deshielo, con El Calafate asomado a su orilla sur.',
    label: 'Explorar el lago',
    tab: 'Lago Argentino',
  },
] as const

export const getHeroSlides = cachedQuery(
  async (): Promise<HeroSlide[]> => {
    const slides: HeroSlide[] = []

    for (const plan of SLIDE_PLAN) {
      let media: MediaRef | null = null
      let href = 'href' in plan ? plan.href : ''

      if (plan.kind === 'tour') {
        const tour = await prisma.tour.findFirst({
          where: { slug: plan.slug, ...published },
          select: {
            slug: true,
            images: {
              orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { media: { select: mediaSelect } },
            },
          },
        })
        media = tour?.images[0]?.media ?? null
        href ||= tour ? ROUTES.tour(tour.slug) : ''
      } else {
        const destination = await prisma.destination.findFirst({
          where: { slug: plan.slug, ...published },
          select: { slug: true, heroImage: { select: mediaSelect } },
        })
        media = destination?.heroImage ?? null
        href ||= destination ? ROUTES.destination(destination.slug) : ''
      }

      if (!media || !href) continue

      slides.push({
        id: plan.slug,
        media,
        eyebrow: plan.eyebrow,
        title: plan.title,
        description: plan.description,
        cta: { href, label: plan.label },
        tabLabel: plan.tab,
      })
    }

    return slides
  },
  ['home', 'hero-slides'],
  {
    tags: [cacheTags.tours, cacheTags.destinations, cacheTags.siteSettings],
    revalidate: REVALIDATE.content,
  },
)

// ── Category tiles ─────────────────────────────────────────────────────────

export type CategoryTile = {
  id: string
  slug: string
  name: string
  description: string | null
  tourCount: number
  media: MediaRef | null
}

/**
 * Categories with a photograph each: the category's own image when an editor
 * has set one, otherwise the cover of its first published tour. A category
 * with no published tours is omitted — a tile leading to an empty listing is
 * a dead end.
 */
export const getCategoryTiles = cachedQuery(
  async (channel: string): Promise<CategoryTile[]> => {
    const categories = await prisma.tourCategory.findMany({
      where: { status: 'PUBLISHED', channel },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        image: { select: mediaSelect },
        _count: { select: { tours: { where: published } } },
        tours: {
          where: published,
          orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: {
            images: {
              orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
              select: { media: { select: mediaSelect } },
            },
          },
        },
      },
    })

    return categories
      .filter((category) => category._count.tours > 0)
      .map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        tourCount: category._count.tours,
        media: category.image ?? category.tours[0]?.images[0]?.media ?? null,
      }))
  },
  ['home', 'category-tiles'],
  { tags: [cacheTags.tourCategories, cacheTags.tours], revalidate: REVALIDATE.content },
)

// ── Spotlight ──────────────────────────────────────────────────────────────

export type SpotlightTour = {
  slug: string
  name: string
  summary: string
  highlights: string[]
  durationMinutes: number
  location: string | null
  fromPriceCents: number | null
  currency: string
  categoryName: string
  images: MediaRef[]
}

/**
 * One experience given a full-width banner. Prefers the minitrekking — the
 * single most distinctive thing a visitor can do here — and otherwise the
 * first featured tour that has at least two photographs to compose with.
 */
export const getSpotlightTour = cachedQuery(
  async (): Promise<SpotlightTour | null> => {
    const select = {
      slug: true,
      name: true,
      summary: true,
      highlights: true,
      durationMinutes: true,
      location: true,
      fromPriceCents: true,
      currency: true,
      category: { select: { name: true } },
      images: {
        orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }],
        take: 3,
        select: { media: { select: mediaSelect } },
      },
    }

    const preferred = await prisma.tour.findFirst({
      where: { slug: 'minitrekking-perito-moreno', ...published },
      select,
    })
    const tour =
      preferred && preferred.images.length > 0
        ? preferred
        : await prisma.tour.findFirst({
            where: { ...published, featured: true, images: { some: {} } },
            orderBy: { sortOrder: 'asc' },
            select,
          })

    if (!tour) return null

    return {
      slug: tour.slug,
      name: tour.name,
      summary: tour.summary,
      highlights: tour.highlights.slice(0, 4),
      durationMinutes: tour.durationMinutes,
      location: tour.location,
      fromPriceCents: tour.fromPriceCents,
      currency: tour.currency,
      categoryName: tour.category.name,
      images: tour.images.map((image) => image.media),
    }
  },
  ['home', 'spotlight'],
  { tags: [cacheTags.tours], revalidate: REVALIDATE.content },
)

// ── Photo wall ─────────────────────────────────────────────────────────────

/**
 * Landscape photographs from the library for the moving photo strip.
 *
 * Only images that are actually in use on published content: the library also
 * holds drafts and staff test uploads, which should not surface on the
 * homepage just because they exist.
 */
export const getShowcasePhotos = cachedQuery(
  async (limit: number): Promise<MediaRef[]> => {
    const photos = await prisma.media.findMany({
      where: {
        type: 'IMAGE',
        OR: [
          { tourImages: { some: { tour: published } } },
          { destinationHeroFor: { some: published } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        ...mediaSelect,
        tourImages: { select: { tourId: true }, take: 1 },
        destinationHeroFor: { select: { id: true }, take: 1 },
      },
    })

    // Landscape frames only: the strip has a fixed height, and portrait shots
    // turn into narrow slivers.
    const landscape = photos.filter(
      (photo) => !photo.width || !photo.height || photo.width / photo.height >= 1.2,
    )

    /*
     * Round-robin across sources. Taken in upload order, a tour with several
     * similar photographs fills the strip by itself — the first run showed
     * three horse shots in a row. One image per tour or destination per pass
     * gives the strip the variety it exists to show.
     */
    const buckets = new Map<string, MediaRef[]>()
    for (const { tourImages, destinationHeroFor, ...photo } of landscape) {
      const source = tourImages[0]?.tourId ?? destinationHeroFor[0]?.id ?? photo.id
      buckets.set(source, [...(buckets.get(source) ?? []), photo])
    }

    const queues = [...buckets.values()]
    const ordered: MediaRef[] = []
    while (ordered.length < limit && queues.some((queue) => queue.length > 0)) {
      for (const queue of queues) {
        const next = queue.shift()
        if (next && ordered.length < limit) ordered.push(next)
      }
    }
    return ordered
  },
  ['home', 'showcase-photos'],
  { tags: [cacheTags.tours, cacheTags.destinations], revalidate: REVALIDATE.content },
)

// ── Reviews ────────────────────────────────────────────────────────────────

export type HomeReview = {
  id: string
  rating: number
  title: string | null
  content: string
  authorName: string
  authorCountry: string | null
  isVerified: boolean
  tourName: string | null
}

/**
 * Approved reviews only. The section renders nothing when there are none —
 * placeholder testimonials would be fabricated social proof.
 */
export const getHomeReviews = cachedQuery(
  async (limit: number): Promise<HomeReview[]> => {
    const reviews = await prisma.review.findMany({
      where: { status: 'APPROVED', publishedAt: { not: null } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        authorName: true,
        authorCountry: true,
        isVerified: true,
        tour: { select: { name: true } },
      },
    })
    return reviews.map(({ tour, ...review }) => ({ ...review, tourName: tour?.name ?? null }))
  },
  ['home', 'reviews'],
  { tags: [cacheTags.reviews], revalidate: REVALIDATE.content },
)

// ── Season imagery ─────────────────────────────────────────────────────────

/** A photograph for each season tab, taken from existing destinations. */
export const getSeasonImages = cachedQuery(
  async (): Promise<Record<string, MediaRef | null>> => {
    const slugs = ['glaciar-perito-moreno', 'lago-argentino', 'el-chalten', 'parque-nacional-los-glaciares']
    const rows = await prisma.destination.findMany({
      where: { slug: { in: slugs }, ...published },
      select: { slug: true, heroImage: { select: mediaSelect } },
    })
    return Object.fromEntries(rows.map((row) => [row.slug, row.heroImage]))
  },
  ['home', 'season-images'],
  { tags: [cacheTags.destinations], revalidate: REVALIDATE.content },
)

// ── Page banners ───────────────────────────────────────────────────────────

/** Every published destination's hero, keyed by slug, for page banners. */
export const getDestinationHeroes = cachedQuery(
  async (): Promise<Record<string, MediaRef | null>> => {
    const rows = await prisma.destination.findMany({
      where: published,
      select: { slug: true, heroImage: { select: mediaSelect } },
    })
    return Object.fromEntries(rows.map((row) => [row.slug, row.heroImage]))
  },
  ['destination-heroes'],
  { tags: [cacheTags.destinations], revalidate: REVALIDATE.content },
)

// ── Photo credits ──────────────────────────────────────────────────────────

/**
 * Every Creative Commons or public-domain image in use on published content,
 * for the photo-credits page. Images we own carry no licence and are omitted.
 */
export const getLicensedPhotos = cachedQuery(
  async (): Promise<MediaRef[]> =>
    prisma.media.findMany({
      where: {
        type: 'IMAGE',
        license: { not: null },
        NOT: { license: 'NONE' },
        OR: [
          { tourImages: { some: { tour: published } } },
          { destinationHeroFor: { some: published } },
          { blogHeroFor: { some: published } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: mediaSelect,
    }),
  ['photo-credits'],
  { tags: [cacheTags.tours, cacheTags.destinations, cacheTags.blogPosts], revalidate: REVALIDATE.content },
)

// ── Catalogue and the "3 imperdibles" ──────────────────────────────────────

/**
 * Every published excursion in the order the business set (sortOrder), for
 * the homepage grid. The brief asks for all tours on the homepage, not a
 * featured subset.
 */
export const getCatalogue = cachedQuery(
  async (): Promise<TourCard[]> =>
    (await prisma.tour.findMany({
      where: { ...published, category: { channel: 'excursiones' } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: cardSelect,
    })) as TourCard[],
  ['home', 'catalogue'],
  { tags: [cacheTags.tours], revalidate: REVALIDATE.listing },
)

/** The three excursions the "3 imperdibles" banner and page feature. */
export const MUST_SEE_SLUGS = [
  'glaciar-perito-moreno-pasarelas',
  'navegacion-todo-glaciares',
  'el-chalten-trekking-libre',
] as const

export const getMustSeeTours = cachedQuery(
  async (): Promise<TourCard[]> => {
    const tours = (await prisma.tour.findMany({
      where: { ...published, slug: { in: [...MUST_SEE_SLUGS] } },
      select: cardSelect,
    })) as TourCard[]
    return MUST_SEE_SLUGS.flatMap((slug) => tours.filter((tour) => tour.slug === slug))
  },
  ['home', 'must-see'],
  { tags: [cacheTags.tours], revalidate: REVALIDATE.content },
)
