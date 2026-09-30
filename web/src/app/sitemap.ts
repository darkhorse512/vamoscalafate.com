import type { MetadataRoute } from 'next'
import { ROUTES, absoluteUrl } from '@vamos/shared'
import { getPublishedTourSlugs } from '@/server/queries/tours'
import {
  getBlogSlugs, getBusinessSlugs, getDestinationSlugs, getHotelSlugs,
} from '@/server/queries/content'

/**
 * Dynamic sitemap.
 *
 * INCLUDED: the homepage, the section indexes, and every PUBLISHED tour,
 * destination, hotel, business and blog post.
 *
 * EXCLUDED, deliberately (spec §75):
 *   · drafts and archived content - the queries filter on status PUBLISHED
 *   · /reservar, /checkout and /checkout/resultado - transient funnel states
 *   · /buscar - an unbounded space of query-string URLs
 *   · anything under the admin domain, which is a separate application
 *
 * Regenerated on request and cached, so publishing a tour puts it in the
 * sitemap without a rebuild.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tours, destinations, hotels, businesses, posts] = await Promise.all([
    getPublishedTourSlugs(),
    getDestinationSlugs(),
    getHotelSlugs(),
    getBusinessSlugs(),
    getBlogSlugs(),
  ])

  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl(ROUTES.tours), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl(ROUTES.transfers), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl(ROUTES.destinations), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl(ROUTES.blog), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl(ROUTES.hotels), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl(ROUTES.restaurants), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl(ROUTES.services), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl(ROUTES.hotelRegister), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl(ROUTES.contact), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl(ROUTES.faq), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl(ROUTES.terms), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl(ROUTES.privacy), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl(ROUTES.cancellation), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl(ROUTES.cookies), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  const tourRoutes: MetadataRoute.Sitemap = tours.map((tour) => ({
    url: absoluteUrl(
      tour.category.channel === 'traslados' ? ROUTES.transfer(tour.slug) : ROUTES.tour(tour.slug),
    ),
    lastModified: tour.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.9,
  }))

  const destinationRoutes: MetadataRoute.Sitemap = destinations.map((d) => ({
    url: absoluteUrl(ROUTES.destination(d.slug)),
    lastModified: d.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: absoluteUrl(ROUTES.blogPost(p.slug)),
    lastModified: p.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const hotelRoutes: MetadataRoute.Sitemap = hotels.map((h) => ({
    url: absoluteUrl(ROUTES.hotel(h.slug)),
    lastModified: h.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const businessRoutes: MetadataRoute.Sitemap = businesses.map((b) => ({
    url: absoluteUrl(
      b.category.channel === 'restaurantes' ? ROUTES.restaurant(b.slug) : ROUTES.service(b.slug),
    ),
    lastModified: b.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [
    ...staticRoutes,
    ...tourRoutes,
    ...destinationRoutes,
    ...postRoutes,
    ...hotelRoutes,
    ...businessRoutes,
  ]
}
