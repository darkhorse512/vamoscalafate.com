import { prisma } from '@vamos/db'
import { ROUTES, truncate } from '@vamos/shared'
import type { SearchResponse, SearchResult, SearchResultType } from '@vamos/types'

/**
 * Unified site search across tours, hotels, businesses, blog posts and
 * destinations.
 *
 * `contains` + `mode: 'insensitive'` compiles to ILIKE, which is adequate at
 * this catalogue's scale and needs no extra infrastructure. If the catalogue
 * grows past a few thousand rows, replace the per-model queries with a single
 * query against a Postgres `tsvector` column - the `SearchResponse` contract
 * stays the same, so nothing above this layer changes.
 *
 * Results are never cached: search is per-visitor and low-volume, and caching
 * would only serve one person's query to another.
 */

const PER_GROUP = 5

const GROUP_LABELS: Record<SearchResultType, string> = {
  tour: 'Excursiones y traslados',
  hotel: 'Alojamientos',
  business: 'Comercios y servicios',
  blog: 'Guía de viaje',
  destination: 'Destinos',
}

const published = { status: 'PUBLISHED', publishedAt: { not: null, lte: new Date() } } as const

export async function searchSite(
  query: string,
  type: 'todo' | SearchResultType = 'todo',
): Promise<SearchResponse> {
  const term = query.trim()
  if (term.length < 2) return { query: term, total: 0, groups: [] }

  const wants = (candidate: SearchResultType) => type === 'todo' || type === candidate

  const [tours, hotels, businesses, posts, destinations] = await Promise.all([
    wants('tour')
      ? prisma.tour.findMany({
          where: {
            ...published,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { summary: { contains: term, mode: 'insensitive' } },
              { location: { contains: term, mode: 'insensitive' } },
            ],
          },
          take: PER_GROUP,
          orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
          select: {
            id: true, slug: true, name: true, summary: true,
            fromPriceCents: true, currency: true,
            category: { select: { channel: true } },
            images: { where: { isCover: true }, take: 1, select: { media: { select: { url: true, altText: true } } } },
          },
        })
      : [],

    wants('hotel')
      ? prisma.hotel.findMany({
          where: {
            ...published,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { summary: { contains: term, mode: 'insensitive' } },
            ],
          },
          take: PER_GROUP,
          select: {
            id: true, slug: true, name: true, summary: true,
            images: { where: { isCover: true }, take: 1, select: { media: { select: { url: true, altText: true } } } },
          },
        })
      : [],

    wants('business')
      ? prisma.business.findMany({
          where: {
            ...published,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { summary: { contains: term, mode: 'insensitive' } },
            ],
          },
          take: PER_GROUP,
          select: {
            id: true, slug: true, name: true, summary: true,
            category: { select: { channel: true } },
            images: { where: { isCover: true }, take: 1, select: { media: { select: { url: true, altText: true } } } },
          },
        })
      : [],

    wants('blog')
      ? prisma.blogPost.findMany({
          where: {
            ...published,
            OR: [
              { title: { contains: term, mode: 'insensitive' } },
              { excerpt: { contains: term, mode: 'insensitive' } },
              { content: { contains: term, mode: 'insensitive' } },
            ],
          },
          take: PER_GROUP,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true, slug: true, title: true, excerpt: true,
            heroImage: { select: { url: true, altText: true } },
          },
        })
      : [],

    wants('destination')
      ? prisma.destination.findMany({
          where: {
            ...published,
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { shortIntro: { contains: term, mode: 'insensitive' } },
            ],
          },
          take: PER_GROUP,
          select: {
            id: true, slug: true, name: true, shortIntro: true,
            heroImage: { select: { url: true, altText: true } },
          },
        })
      : [],
  ])

  const groups: SearchResponse['groups'] = []

  function push(groupType: SearchResultType, results: SearchResult[]) {
    if (results.length > 0) {
      groups.push({ type: groupType, label: GROUP_LABELS[groupType], results })
    }
  }

  push(
    'tour',
    tours.map((t) => ({
      type: 'tour' as const,
      id: t.id,
      title: t.name,
      excerpt: truncate(t.summary, 130),
      url:
        t.category.channel === 'traslados'
          ? ROUTES.transfer(t.slug)
          : t.category.channel === 'servicios'
            ? ROUTES.service(t.slug)
            : ROUTES.tour(t.slug),
      imageUrl: t.images[0]?.media.url ?? null,
      imageAlt: t.images[0]?.media.altText ?? null,
      priceCents: t.fromPriceCents,
      currency: t.currency,
    })),
  )

  push(
    'destination',
    destinations.map((d) => ({
      type: 'destination' as const,
      id: d.id,
      title: d.name,
      excerpt: truncate(d.shortIntro, 130),
      url: ROUTES.destination(d.slug),
      imageUrl: d.heroImage?.url ?? null,
      imageAlt: d.heroImage?.altText ?? null,
    })),
  )

  push(
    'blog',
    posts.map((p) => ({
      type: 'blog' as const,
      id: p.id,
      title: p.title,
      excerpt: truncate(p.excerpt, 130),
      url: ROUTES.blogPost(p.slug),
      imageUrl: p.heroImage?.url ?? null,
      imageAlt: p.heroImage?.altText ?? null,
    })),
  )

  push(
    'hotel',
    hotels.map((h) => ({
      type: 'hotel' as const,
      id: h.id,
      title: h.name,
      excerpt: truncate(h.summary, 130),
      url: ROUTES.hotel(h.slug),
      imageUrl: h.images[0]?.media.url ?? null,
      imageAlt: h.images[0]?.media.altText ?? null,
    })),
  )

  push(
    'business',
    businesses.map((b) => ({
      type: 'business' as const,
      id: b.id,
      title: b.name,
      excerpt: truncate(b.summary, 130),
      url:
        b.category.channel === 'restaurantes'
          ? ROUTES.restaurant(b.slug)
          : ROUTES.service(b.slug),
      imageUrl: b.images[0]?.media.url ?? null,
      imageAlt: b.images[0]?.media.altText ?? null,
    })),
  )

  return {
    query: term,
    total: groups.reduce((sum, group) => sum + group.results.length, 0),
    groups,
  }
}
