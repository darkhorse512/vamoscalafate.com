import { cacheTags, prisma, type Prisma } from '@vamos/db'
import type {
  BlogPostCard, BlogPostDetail, BusinessCard, BusinessDetail,
  DestinationCard, DestinationDetail, HotelCard, HotelDetail, MediaRef, Paginated,
} from '@vamos/types'
import { cachedQuery, REVALIDATE } from '../cache.ts'

export const mediaSelect = {
  id: true, url: true, altText: true, caption: true,
  width: true, height: true, blurDataUrl: true, externalUrl: true,
  // Required to render the credit CC BY / CC BY-SA oblige us to show.
  license: true, attributionText: true, attributionUrl: true, sourceUrl: true,
} satisfies Prisma.MediaSelect

const publishedFilter = { status: 'PUBLISHED', publishedAt: { not: null, lte: new Date() } } as const

// ── Destinations ────────────────────────────────────────────────────────────

export const listDestinations = cachedQuery(
  async (): Promise<DestinationCard[]> => {
    const rows = await prisma.destination.findMany({
      where: publishedFilter,
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
      select: {
        id: true, slug: true, name: true, shortIntro: true, featured: true,
        heroImage: { select: mediaSelect },
      },
    })
    return rows as DestinationCard[]
  },
  ['destinations', 'list'],
  { tags: [cacheTags.destinations], revalidate: REVALIDATE.listing },
)

async function getDestinationUncached(slug: string): Promise<DestinationDetail | null> {
  const row = await prisma.destination.findFirst({
    where: { slug, ...publishedFilter },
    include: {
      heroImage: { select: mediaSelect },
      seo: true,
      attractions: {
        where: { status: 'PUBLISHED' },
        orderBy: { sortOrder: 'asc' },
        include: { image: { select: mediaSelect } },
      },
      faqs: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
    },
  })
  return row as DestinationDetail | null
}

export function getDestinationBySlug(slug: string) {
  return cachedQuery(getDestinationUncached, ['destinations', 'detail'], {
    tags: [cacheTags.destinations, cacheTags.destination(slug)],
    revalidate: REVALIDATE.content,
  })(slug)
}

export const getDestinationSlugs = cachedQuery(
  async () =>
    prisma.destination.findMany({
      where: publishedFilter,
      select: { slug: true, updatedAt: true },
    }),
  ['destinations', 'slugs'],
  { tags: [cacheTags.destinations, cacheTags.sitemap], revalidate: REVALIDATE.index },
)

// ── Hotels ──────────────────────────────────────────────────────────────────

const hotelCardSelect = {
  id: true, slug: true, name: true, summary: true, starRating: true,
  fromPriceCents: true, currency: true, address: true,
  images: { where: { isCover: true }, take: 1, select: { media: { select: mediaSelect } } },
} satisfies Prisma.HotelSelect

export const listHotels = cachedQuery(
  async (args: { page?: number; pageSize?: number; query?: string }): Promise<Paginated<HotelCard>> => {
    const page = Math.max(1, args.page ?? 1)
    const pageSize = Math.min(48, args.pageSize ?? 12)
    const where: Prisma.HotelWhereInput = {
      ...publishedFilter,
      ...(args.query
        ? {
            OR: [
              { name: { contains: args.query, mode: 'insensitive' } },
              { summary: { contains: args.query, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.hotel.findMany({
        where, select: hotelCardSelect,
        orderBy: [{ featured: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.hotel.count({ where }),
    ])

    return {
      items: items as HotelCard[], total, page, pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  },
  ['hotels', 'list'],
  { tags: [cacheTags.hotels], revalidate: REVALIDATE.listing },
)

async function getHotelUncached(slug: string): Promise<HotelDetail | null> {
  const row = await prisma.hotel.findFirst({
    where: { slug, ...publishedFilter },
    include: {
      destination: { select: { id: true, slug: true, name: true } },
      seo: true,
      images: { orderBy: { sortOrder: 'asc' }, include: { media: { select: mediaSelect } } },
      amenities: { include: { amenity: true } },
      reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  return row as HotelDetail | null
}

export function getHotelBySlug(slug: string) {
  return cachedQuery(getHotelUncached, ['hotels', 'detail'], {
    tags: [cacheTags.hotels, cacheTags.hotel(slug)],
    revalidate: REVALIDATE.content,
  })(slug)
}

export const getHotelSlugs = cachedQuery(
  async () => prisma.hotel.findMany({ where: publishedFilter, select: { slug: true, updatedAt: true } }),
  ['hotels', 'slugs'],
  { tags: [cacheTags.hotels, cacheTags.sitemap], revalidate: REVALIDATE.index },
)

// ── Businesses ──────────────────────────────────────────────────────────────

const businessCardSelect = {
  id: true, slug: true, name: true, summary: true, address: true, priceRange: true,
  category: { select: { slug: true, name: true, channel: true } },
  images: { where: { isCover: true }, take: 1, select: { media: { select: mediaSelect } } },
} satisfies Prisma.BusinessSelect

export const listBusinesses = cachedQuery(
  async (args: { channel?: string; categorySlug?: string; page?: number; pageSize?: number }): Promise<Paginated<BusinessCard>> => {
    const page = Math.max(1, args.page ?? 1)
    const pageSize = Math.min(48, args.pageSize ?? 12)
    const where: Prisma.BusinessWhereInput = {
      ...publishedFilter,
      ...(args.channel || args.categorySlug
        ? {
            category: {
              ...(args.channel ? { channel: args.channel } : {}),
              ...(args.categorySlug ? { slug: args.categorySlug } : {}),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.business.findMany({
        where, select: businessCardSelect,
        orderBy: [{ featured: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.business.count({ where }),
    ])

    return {
      items: items as BusinessCard[], total, page, pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  },
  ['businesses', 'list'],
  { tags: [cacheTags.businesses], revalidate: REVALIDATE.listing },
)

async function getBusinessUncached(slug: string): Promise<BusinessDetail | null> {
  const row = await prisma.business.findFirst({
    where: { slug, ...publishedFilter },
    include: {
      category: true,
      destination: { select: { id: true, slug: true, name: true } },
      seo: true,
      images: { orderBy: { sortOrder: 'asc' }, include: { media: { select: mediaSelect } } },
      reviews: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  return row as BusinessDetail | null
}

export function getBusinessBySlug(slug: string) {
  return cachedQuery(getBusinessUncached, ['businesses', 'detail'], {
    tags: [cacheTags.businesses, cacheTags.business(slug)],
    revalidate: REVALIDATE.content,
  })(slug)
}

export const getBusinessCategories = cachedQuery(
  async (channel?: string) =>
    prisma.businessCategory.findMany({
      where: channel ? { channel } : undefined,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true, name: true, channel: true, icon: true,
        _count: { select: { businesses: { where: { status: 'PUBLISHED' } } } },
      },
    }),
  ['business-categories'],
  { tags: [cacheTags.businesses], revalidate: REVALIDATE.content },
)

export const getBusinessSlugs = cachedQuery(
  async () =>
    prisma.business.findMany({
      where: publishedFilter,
      select: { slug: true, updatedAt: true, category: { select: { channel: true } } },
    }),
  ['businesses', 'slugs'],
  { tags: [cacheTags.businesses, cacheTags.sitemap], revalidate: REVALIDATE.index },
)

// ── Blog ────────────────────────────────────────────────────────────────────

const postCardSelect = {
  id: true, slug: true, title: true, excerpt: true, readingTime: true,
  publishedAt: true, featured: true,
  heroImage: { select: mediaSelect },
  category: { select: { slug: true, name: true } },
} satisfies Prisma.BlogPostSelect

export const listBlogPosts = cachedQuery(
  async (args: { categorySlug?: string; tagSlug?: string; page?: number; pageSize?: number; query?: string }): Promise<Paginated<BlogPostCard>> => {
    const page = Math.max(1, args.page ?? 1)
    const pageSize = Math.min(24, args.pageSize ?? 9)

    const where: Prisma.BlogPostWhereInput = {
      ...publishedFilter,
      ...(args.categorySlug ? { category: { slug: args.categorySlug } } : {}),
      ...(args.tagSlug ? { tags: { some: { tag: { slug: args.tagSlug } } } } : {}),
      ...(args.query
        ? {
            OR: [
              { title: { contains: args.query, mode: 'insensitive' } },
              { excerpt: { contains: args.query, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where, select: postCardSelect,
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
      }),
      prisma.blogPost.count({ where }),
    ])

    return {
      items: items as BlogPostCard[], total, page, pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    }
  },
  ['blog', 'list'],
  { tags: [cacheTags.blogPosts], revalidate: REVALIDATE.listing },
)

async function getBlogPostUncached(slug: string): Promise<BlogPostDetail | null> {
  const row = await prisma.blogPost.findFirst({
    where: { slug, ...publishedFilter },
    include: {
      heroImage: { select: mediaSelect },
      category: true,
      destination: { select: { id: true, slug: true, name: true } },
      author: { select: { id: true, name: true } },
      seo: true,
      tags: { include: { tag: true } },
      faqs: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
    },
  })
  return row as BlogPostDetail | null
}

export function getBlogPostBySlug(slug: string) {
  return cachedQuery(getBlogPostUncached, ['blog', 'detail'], {
    tags: [cacheTags.blogPosts, cacheTags.blogPost(slug)],
    revalidate: REVALIDATE.content,
  })(slug)
}

export const getBlogCategories = cachedQuery(
  async () =>
    prisma.blogCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true, slug: true, name: true, description: true,
        _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
      },
    }),
  ['blog-categories'],
  { tags: [cacheTags.blogCategories, cacheTags.blogPosts], revalidate: REVALIDATE.content },
)

export const getBlogSlugs = cachedQuery(
  async () => prisma.blogPost.findMany({ where: publishedFilter, select: { slug: true, updatedAt: true } }),
  ['blog', 'slugs'],
  { tags: [cacheTags.blogPosts, cacheTags.sitemap], revalidate: REVALIDATE.index },
)

// ── FAQ, pages, settings ────────────────────────────────────────────────────

export const getGlobalFaqs = cachedQuery(
  async () =>
    prisma.faq.findMany({
      where: { scope: 'GLOBAL', isPublished: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, question: true, answer: true },
    }),
  ['faqs', 'global'],
  { tags: [cacheTags.faqs], revalidate: REVALIDATE.content },
)

export function getStaticPage(slug: string) {
  return cachedQuery(
    async (pageSlug: string) =>
      prisma.staticPage.findFirst({
        where: { slug: pageSlug, status: 'PUBLISHED' },
        include: { seo: true },
      }),
    ['static-page'],
    { tags: [cacheTags.staticPages, cacheTags.staticPage(slug)], revalidate: REVALIDATE.content },
  )(slug)
}

export const getSiteSettings = cachedQuery(
  async (): Promise<Record<string, unknown>> => {
    const rows = await prisma.siteSetting.findMany({ select: { key: true, value: true } })
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },
  ['site-settings'],
  { tags: [cacheTags.siteSettings], revalidate: REVALIDATE.content },
)

/**
 * The photograph behind the homepage hero.
 *
 * Resolution order:
 *   1. `site.heroImageId`, so an operator can choose the image from the admin.
 *   2. The Perito Moreno destination's hero, so a fresh install shows a real
 *      photograph rather than the drawn fallback. The glacier rather than the
 *      town: it is the reason people come, and a street-level shot of El
 *      Calafate undersells the destination at the one moment a visitor
 *      decides whether to keep reading.
 *
 * Returns null only when neither exists, which the Hero handles by drawing a
 * Patagonian scene — a generic stock landscape presented as El Calafate would
 * misrepresent the destination, so there is deliberately no stock fallback.
 */
export const getHeroImage = cachedQuery(
  async (): Promise<MediaRef | null> => {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'site.heroImageId' },
      select: { value: true },
    })

    const chosenId = typeof setting?.value === 'string' ? setting.value : null
    if (chosenId) {
      const chosen = await prisma.media.findUnique({
        where: { id: chosenId },
        select: mediaSelect,
      })
      if (chosen) return chosen
    }

    for (const slug of ['glaciar-perito-moreno', 'el-calafate']) {
      const destination = await prisma.destination.findUnique({
        where: { slug },
        select: { heroImage: { select: mediaSelect } },
      })
      if (destination?.heroImage) return destination.heroImage
    }
    return null
  },
  ['hero-image'],
  { tags: [cacheTags.siteSettings, cacheTags.destinations], revalidate: REVALIDATE.content },
)
