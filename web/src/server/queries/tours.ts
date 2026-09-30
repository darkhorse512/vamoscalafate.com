import { cacheTags, prisma, type Prisma } from '@vamos/db'
import type { Paginated, TourCard, TourDetail } from '@vamos/types'
import { cachedQuery, REVALIDATE } from '../cache.ts'

/**
 * Tour read models.
 *
 * Listing queries select a deliberately narrow column set: an index page that
 * pulled full descriptions and every option would transfer orders of magnitude
 * more data than it renders.
 */

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  summary: true,
  fromPriceCents: true,
  currency: true,
  durationMinutes: true,
  difficulty: true,
  location: true,
  featured: true,
  category: { select: { slug: true, name: true, channel: true } },
  images: {
    where: { isCover: true },
    take: 1,
    select: {
      media: {
        select: {
          id: true, url: true, altText: true, caption: true,
          width: true, height: true, blurDataUrl: true, externalUrl: true,
        },
      },
    },
  },
} satisfies Prisma.TourSelect

const mediaSelect = {
  id: true, url: true, altText: true, caption: true,
  width: true, height: true, blurDataUrl: true, externalUrl: true,
} satisfies Prisma.MediaSelect

export type TourListFilters = {
  channel?: string
  categorySlug?: string
  destinationSlug?: string
  difficulty?: 'EASY' | 'MODERATE' | 'CHALLENGING'
  minPriceCents?: number
  maxPriceCents?: number
  minDurationMinutes?: number
  maxDurationMinutes?: number
  availableOn?: string
  query?: string
  sort?: string
  page?: number
  pageSize?: number
}

function buildWhere(filters: TourListFilters): Prisma.TourWhereInput {
  const where: Prisma.TourWhereInput = {
    status: 'PUBLISHED',
    publishedAt: { not: null, lte: new Date() },
  }

  // Channel and category both constrain the same relation, so they are
  // combined into one filter rather than assigned over each other.
  if (filters.channel || filters.categorySlug) {
    where.category = {
      ...(filters.channel ? { channel: filters.channel } : {}),
      ...(filters.categorySlug ? { slug: filters.categorySlug } : {}),
    }
  }
  if (filters.destinationSlug) where.destination = { slug: filters.destinationSlug }
  if (filters.difficulty) where.difficulty = filters.difficulty

  if (filters.minPriceCents !== undefined || filters.maxPriceCents !== undefined) {
    where.fromPriceCents = {
      ...(filters.minPriceCents !== undefined ? { gte: filters.minPriceCents } : {}),
      ...(filters.maxPriceCents !== undefined ? { lte: filters.maxPriceCents } : {}),
    }
  }

  if (filters.minDurationMinutes !== undefined || filters.maxDurationMinutes !== undefined) {
    where.durationMinutes = {
      ...(filters.minDurationMinutes !== undefined ? { gte: filters.minDurationMinutes } : {}),
      ...(filters.maxDurationMinutes !== undefined ? { lte: filters.maxDurationMinutes } : {}),
    }
  }

  if (filters.query) {
    // `mode: 'insensitive'` maps to ILIKE. Adequate at catalogue scale; if the
    // catalogue grows into the thousands, move to a tsvector index.
    where.OR = [
      { name: { contains: filters.query, mode: 'insensitive' } },
      { summary: { contains: filters.query, mode: 'insensitive' } },
      { location: { contains: filters.query, mode: 'insensitive' } },
    ]
  }

  if (filters.availableOn) {
    // Only surface tours with a real, unblocked seat on that date.
    where.availability = {
      some: {
        date: new Date(`${filters.availableOn}T00:00:00.000Z`),
        isBlocked: false,
        option: { isActive: true },
      },
    }
  }

  return where
}

function buildOrderBy(sort?: string): Prisma.TourOrderByWithRelationInput[] {
  switch (sort) {
    case 'precio-asc':
      return [{ fromPriceCents: 'asc' }, { name: 'asc' }]
    case 'precio-desc':
      return [{ fromPriceCents: 'desc' }, { name: 'asc' }]
    case 'duracion-asc':
      return [{ durationMinutes: 'asc' }, { name: 'asc' }]
    case 'nombre-asc':
      return [{ name: 'asc' }]
    default:
      return [{ featured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }]
  }
}

async function listToursUncached(filters: TourListFilters): Promise<Paginated<TourCard>> {
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12))
  const where = buildWhere(filters)

  const [items, total] = await Promise.all([
    prisma.tour.findMany({
      where,
      select: cardSelect,
      orderBy: buildOrderBy(filters.sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tour.count({ where }),
  ])

  return {
    items: items as TourCard[],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export const listTours = cachedQuery(listToursUncached, ['tours', 'list'], {
  tags: [cacheTags.tours],
  revalidate: REVALIDATE.listing,
})

async function getTourBySlugUncached(slug: string): Promise<TourDetail | null> {
  const tour = await prisma.tour.findFirst({
    where: { slug, status: 'PUBLISHED', publishedAt: { not: null, lte: new Date() } },
    include: {
      category: { select: { id: true, slug: true, name: true, channel: true } },
      destination: { select: { id: true, slug: true, name: true } },
      seo: true,
      images: { orderBy: { sortOrder: 'asc' }, include: { media: { select: mediaSelect } } },
      videos: { orderBy: { sortOrder: 'asc' }, include: { media: { select: mediaSelect } } },
      options: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      itinerary: { orderBy: { sortOrder: 'asc' } },
      pickupLocations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      faqs: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
      // Only approved reviews are ever exposed publicly.
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 12,
      },
    },
  })

  return tour as TourDetail | null
}

export function getTourBySlug(slug: string) {
  return cachedQuery(getTourBySlugUncached, ['tours', 'detail'], {
    tags: [cacheTags.tours, cacheTags.tour(slug)],
    revalidate: REVALIDATE.content,
  })(slug)
}

async function getRelatedToursUncached(tourId: string, limit: number): Promise<TourCard[]> {
  const explicit = await prisma.tourRelation.findMany({
    where: { sourceId: tourId, target: { status: 'PUBLISHED' } },
    orderBy: { sortOrder: 'asc' },
    take: limit,
    select: { target: { select: cardSelect } },
  })

  const related = explicit.map((r) => r.target) as TourCard[]
  if (related.length >= limit) return related

  // Backfill from the same category so the section is never half-empty.
  const source = await prisma.tour.findUnique({
    where: { id: tourId },
    select: { categoryId: true },
  })
  if (!source) return related

  const fallback = await prisma.tour.findMany({
    where: {
      status: 'PUBLISHED',
      categoryId: source.categoryId,
      id: { notIn: [tourId, ...related.map((r) => r.id)] },
    },
    select: cardSelect,
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    take: limit - related.length,
  })

  return [...related, ...(fallback as TourCard[])]
}

export function getRelatedTours(tourId: string, limit = 3) {
  return cachedQuery(getRelatedToursUncached, ['tours', 'related'], {
    tags: [cacheTags.tours],
    revalidate: REVALIDATE.content,
  })(tourId, limit)
}

export const getFeaturedTours = cachedQuery(
  async (limit: number): Promise<TourCard[]> => {
    const tours = await prisma.tour.findMany({
      where: { status: 'PUBLISHED', publishedAt: { not: null, lte: new Date() }, featured: true },
      select: cardSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: limit,
    })
    return tours as TourCard[]
  },
  ['tours', 'featured'],
  { tags: [cacheTags.tours], revalidate: REVALIDATE.listing },
)

export const getTourCategories = cachedQuery(
  async (channel?: string) =>
    prisma.tourCategory.findMany({
      where: { status: 'PUBLISHED', ...(channel ? { channel } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, slug: true, name: true, description: true, channel: true,
        _count: { select: { tours: { where: { status: 'PUBLISHED' } } } },
      },
    }),
  ['tour-categories'],
  { tags: [cacheTags.tourCategories, cacheTags.tours], revalidate: REVALIDATE.content },
)

/** Price and duration bounds that drive the filter sliders. */
export const getTourFacets = cachedQuery(
  async (channel?: string) => {
    const where: Prisma.TourWhereInput = {
      status: 'PUBLISHED',
      ...(channel ? { category: { channel } } : {}),
    }
    const [aggregate, count] = await Promise.all([
      prisma.tour.aggregate({
        where,
        _min: { fromPriceCents: true, durationMinutes: true },
        _max: { fromPriceCents: true, durationMinutes: true },
      }),
      prisma.tour.count({ where }),
    ])
    return {
      minPriceCents: aggregate._min.fromPriceCents ?? 0,
      maxPriceCents: aggregate._max.fromPriceCents ?? 0,
      minDurationMinutes: aggregate._min.durationMinutes ?? 0,
      maxDurationMinutes: aggregate._max.durationMinutes ?? 0,
      total: count,
    }
  },
  ['tours', 'facets'],
  { tags: [cacheTags.tours], revalidate: REVALIDATE.listing },
)

/** Slugs for the sitemap. Kept separate so the sitemap never loads full rows. */
export const getPublishedTourSlugs = cachedQuery(
  async () =>
    prisma.tour.findMany({
      where: { status: 'PUBLISHED', publishedAt: { not: null, lte: new Date() } },
      select: { slug: true, updatedAt: true, category: { select: { channel: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
  ['tours', 'slugs'],
  { tags: [cacheTags.tours, cacheTags.sitemap], revalidate: REVALIDATE.index },
)
