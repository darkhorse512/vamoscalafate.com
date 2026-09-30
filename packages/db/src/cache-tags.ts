/**
 * Canonical Next.js cache tag vocabulary.
 *
 * The public site tags its cached data reads with these; the admin app calls
 * the revalidation endpoint with the same strings after a mutation. Keeping
 * the vocabulary in one shared module is what stops a tag typo from silently
 * leaving stale content on the live site.
 */
export const cacheTags = {
  tours: 'tours',
  tour: (slug: string) => `tour:${slug}`,
  tourCategories: 'tour-categories',
  hotels: 'hotels',
  hotel: (slug: string) => `hotel:${slug}`,
  businesses: 'businesses',
  business: (slug: string) => `business:${slug}`,
  destinations: 'destinations',
  destination: (slug: string) => `destination:${slug}`,
  blogPosts: 'blog-posts',
  blogPost: (slug: string) => `blog-post:${slug}`,
  blogCategories: 'blog-categories',
  reviews: 'reviews',
  faqs: 'faqs',
  staticPages: 'static-pages',
  staticPage: (slug: string) => `static-page:${slug}`,
  siteSettings: 'site-settings',
  sitemap: 'sitemap',
} as const

/**
 * Tags to purge when an entity of the given type changes. Listing tags are
 * always included alongside the detail tag, because publishing a tour changes
 * both its own page and every index that could list it.
 */
export function tagsForEntity(
  entity: 'tour' | 'hotel' | 'business' | 'destination' | 'blogPost' | 'staticPage' | 'review' | 'faq' | 'siteSetting',
  slug?: string,
): string[] {
  switch (entity) {
    case 'tour':
      return [cacheTags.tours, cacheTags.sitemap, ...(slug ? [cacheTags.tour(slug)] : [])]
    case 'hotel':
      return [cacheTags.hotels, cacheTags.sitemap, ...(slug ? [cacheTags.hotel(slug)] : [])]
    case 'business':
      return [cacheTags.businesses, cacheTags.sitemap, ...(slug ? [cacheTags.business(slug)] : [])]
    case 'destination':
      return [
        cacheTags.destinations,
        cacheTags.sitemap,
        ...(slug ? [cacheTags.destination(slug)] : []),
      ]
    case 'blogPost':
      return [cacheTags.blogPosts, cacheTags.sitemap, ...(slug ? [cacheTags.blogPost(slug)] : [])]
    case 'staticPage':
      return [
        cacheTags.staticPages,
        cacheTags.sitemap,
        ...(slug ? [cacheTags.staticPage(slug)] : []),
      ]
    case 'review':
      return [cacheTags.reviews, cacheTags.tours]
    case 'faq':
      return [cacheTags.faqs, cacheTags.tours]
    case 'siteSetting':
      return [cacheTags.siteSettings]
    default:
      return []
  }
}
