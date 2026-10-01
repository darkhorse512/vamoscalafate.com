import { cacheTags, prisma } from '@vamos/db'
import { ROUTES } from '@vamos/shared'
import type { MediaRef, TourCard } from '@vamos/types'
import { HOME_CONFIG_KEY, resolveHomeConfig, type HomeConfig } from '@vamos/validation'
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
  secondary: { href: string; label: string } | null
  /** Short label for the slide selector. */
  tabLabel: string
}

/** The homepage configuration (admin → Página de inicio), merged over defaults. */
export const getHomeConfig = cachedQuery(
  async (): Promise<HomeConfig> => {
    const row = await prisma.siteSetting.findUnique({ where: { key: HOME_CONFIG_KEY }, select: { value: true } })
    return resolveHomeConfig(row?.value)
  },
  ['home', 'config'],
  { tags: [cacheTags.siteSettings], revalidate: REVALIDATE.content },
)

/** Media rows by id, for images chosen in the homepage editor. */
export const getMediaByIds = cachedQuery(
  async (ids: string[]): Promise<Record<string, MediaRef>> => {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return {}
    const rows = await prisma.media.findMany({ where: { id: { in: unique } }, select: mediaSelect })
    return Object.fromEntries(rows.map((row) => [row.id, row]))
  },
  ['home', 'media-by-id'],
  { tags: [cacheTags.siteSettings], revalidate: REVALIDATE.content },
)

async function coverOf(kind: 'tour' | 'destination', slug: string): Promise<MediaRef | null> {
  if (!slug) return null
  if (kind === 'tour') {
    const tour = await prisma.tour.findFirst({
      where: { slug, ...published },
      select: {
        images: { orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { media: { select: mediaSelect } } },
      },
    })
    return tour?.images[0]?.media ?? null
  }
  const destination = await prisma.destination.findFirst({
    where: { slug, ...published },
    select: { heroImage: { select: mediaSelect } },
  })
  return destination?.heroImage ?? null
}

/**
 * Hero slides from the configuration. A slide uses its chosen image, or else
 * the cover of the tour/destination it points at; a slide with neither, or
 * switched off, is dropped rather than shown blank.
 */
export const getHeroSlides = cachedQuery(
  async (): Promise<{ slides: HeroSlide[]; autoplaySeconds: number }> => {
    const config = await getHomeConfig()
    const chosen = await getMediaByIds(config.hero.slides.map((slide) => slide.imageId))
    const slides: HeroSlide[] = []
    for (const [index, slide] of config.hero.slides.entries()) {
      if (!slide.enabled) continue
      const media = chosen[slide.imageId] ?? (await coverOf(slide.imageFrom.kind, slide.imageFrom.slug))
      if (!media || !slide.title) continue
      slides.push({
        id: `slide-${index}`,
        media,
        eyebrow: slide.eyebrow,
        title: slide.title,
        description: slide.description,
        cta: slide.primary.label && slide.primary.href ? slide.primary : { label: 'Ver excursiones', href: ROUTES.tours },
        secondary: slide.secondary.label && slide.secondary.href ? slide.secondary : null,
        tabLabel: slide.tabLabel || slide.title,
      })
    }
    return { slides, autoplaySeconds: config.hero.autoplaySeconds }
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
  async (slug: string): Promise<SpotlightTour | null> => {
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
      where: { slug, ...published },
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
    const slugs = ['glaciar-perito-moreno', 'lago-argentino', 'el-chalten', 'parque-nacional-los-glaciares', 'el-calafate']
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
  async (slugs: string[]): Promise<TourCard[]> => {
    const tours = (await prisma.tour.findMany({
      where: { ...published, category: { channel: 'excursiones' } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: cardSelect,
    })) as TourCard[]
    if (slugs.length === 0) return tours
    // The editor's selection, in the editor's order; unpublished ones drop out.
    return slugs.flatMap((slug) => tours.filter((tour) => tour.slug === slug))
  },
  ['home', 'catalogue'],
  { tags: [cacheTags.tours, cacheTags.siteSettings], revalidate: REVALIDATE.listing },
)

/** Tours for the "3 imperdibles" banner, in the configured order. */
export const getMustSeeTours = cachedQuery(
  async (slugs: string[]): Promise<TourCard[]> => {
    const tours = (await prisma.tour.findMany({
      where: { ...published, slug: { in: slugs } },
      select: cardSelect,
    })) as TourCard[]
    return slugs.flatMap((slug) => tours.filter((tour) => tour.slug === slug))
  },
  ['home', 'must-see'],
  { tags: [cacheTags.tours], revalidate: REVALIDATE.content },
)
