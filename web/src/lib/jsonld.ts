import { LOCATION, SITE, absoluteUrl, toDate } from '@vamos/shared'
import type { BlogPostDetail, DestinationDetail, HotelDetail, TourDetail } from '@vamos/types'

/**
 * JSON-LD structured data.
 *
 * Every builder here describes what the page genuinely is. Two rules, applied
 * without exception:
 *
 *  · `aggregateRating` is emitted ONLY when approved reviews actually exist.
 *    Marking up a rating with no reviews behind it is a Google policy
 *    violation and misleads people reading search results.
 *
 *  · `Offer` prices come from real option rows, and `availability` reflects
 *    the real publication status.
 */

type JsonLd = Record<string, unknown>

export function organizationSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    areaServed: {
      '@type': 'Place',
      name: `${LOCATION.city}, ${LOCATION.province}, ${LOCATION.country}`,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: LOCATION.city,
      addressRegion: LOCATION.province,
      postalCode: LOCATION.postalCode,
      addressCountry: LOCATION.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: LOCATION.latitude,
      longitude: LOCATION.longitude,
    },
  }
}

export function websiteSchema(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: 'es-AR',
    publisher: { '@id': `${SITE.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/buscar?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbSchema(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

/**
 * A tour is a purchasable Product with Offers.
 *
 * `aggregateRating` is attached only when approved reviews exist - see the
 * note at the top of this file.
 */
export function tourSchema(tour: TourDetail, path: string): JsonLd {
  const images = tour.images
    .map((i) => i.media.url)
    .filter(Boolean)
    .slice(0, 6)

  const approvedReviews = tour.reviews.filter((r) => r.status === 'APPROVED')

  const offers = tour.options.map((option) => ({
    '@type': 'Offer',
    name: option.name,
    price: (option.priceCents / 100).toFixed(2),
    priceCurrency: option.currency,
    availability:
      tour.status === 'PUBLISHED'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    url: absoluteUrl(path),
    // Prices are reviewed seasonally; a one-year validity is honest about that.
    priceValidUntil: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: tour.name,
    description: tour.summary,
    ...(images.length ? { image: images } : {}),
    brand: { '@type': 'Brand', name: SITE.name },
    category: tour.category.name,
    offers:
      offers.length === 1
        ? offers[0]
        : {
            '@type': 'AggregateOffer',
            offerCount: offers.length,
            lowPrice: (Math.min(...tour.options.map((o) => o.priceCents)) / 100).toFixed(2),
            highPrice: (Math.max(...tour.options.map((o) => o.priceCents)) / 100).toFixed(2),
            priceCurrency: tour.currency,
            offers,
          },
    ...(approvedReviews.length > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (
              approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
            ).toFixed(1),
            reviewCount: approvedReviews.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: approvedReviews.slice(0, 5).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.authorName },
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
            ...(r.title ? { name: r.title } : {}),
            reviewBody: r.content,
            datePublished: toDate(r.createdAt).toISOString().slice(0, 10),
          })),
        }
      : {}),
  }
}

/** Only emitted when the FAQ list is non-empty - an empty FAQPage is invalid. */
export function faqSchema(faqs: { question: string; answer: string }[]): JsonLd | null {
  if (faqs.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}

export function articleSchema(post: BlogPostDetail, path: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    ...(post.heroImage?.url ? { image: [post.heroImage.url] } : {}),
    datePublished: post.publishedAt ? toDate(post.publishedAt).toISOString() : undefined,
    dateModified: toDate(post.updatedAt).toISOString(),
    author: post.author
      ? { '@type': 'Person', name: post.author.name }
      : { '@type': 'Organization', name: SITE.name },
    publisher: { '@id': `${SITE.url}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
    inLanguage: 'es-AR',
    ...(post.category ? { articleSection: post.category.name } : {}),
    wordCount: post.content.trim().split(/\s+/).length,
  }
}

/** A destination is a place, not a product - TouristDestination, not Product. */
export function destinationSchema(destination: DestinationDetail, path: string): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: destination.name,
    description: destination.shortIntro,
    ...(destination.heroImage?.url ? { image: [destination.heroImage.url] } : {}),
    url: absoluteUrl(path),
    ...(destination.latitude && destination.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      addressRegion: destination.region,
      addressCountry: LOCATION.countryCode,
    },
    ...(destination.attractions.length
      ? {
          containsPlace: destination.attractions.map((a) => ({
            '@type': 'TouristAttraction',
            name: a.name,
            description: a.summary,
          })),
        }
      : {}),
  }
}

/**
 * Hotels are directory listings, not inventory this platform sells, so no
 * Offer is emitted - only the factual LodgingBusiness description.
 */
export function hotelSchema(hotel: HotelDetail, path: string): JsonLd {
  const approvedReviews = hotel.reviews.filter((r) => r.status === 'APPROVED')

  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: hotel.name,
    description: hotel.summary,
    url: absoluteUrl(path),
    ...(hotel.images.length ? { image: hotel.images.slice(0, 5).map((i) => i.media.url) } : {}),
    ...(hotel.starRating
      ? {
          starRating: { '@type': 'Rating', ratingValue: hotel.starRating, bestRating: 5 },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      ...(hotel.address ? { streetAddress: hotel.address } : {}),
      addressLocality: LOCATION.city,
      addressRegion: LOCATION.province,
      addressCountry: LOCATION.countryCode,
    },
    ...(hotel.latitude && hotel.longitude
      ? { geo: { '@type': 'GeoCoordinates', latitude: hotel.latitude, longitude: hotel.longitude } }
      : {}),
    ...(hotel.phone ? { telephone: hotel.phone } : {}),
    ...(hotel.amenities.length
      ? {
          amenityFeature: hotel.amenities.map((a) => ({
            '@type': 'LocationFeatureSpecification',
            name: a.amenity.name,
            value: true,
          })),
        }
      : {}),
    ...(approvedReviews.length > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (
              approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length
            ).toFixed(1),
            reviewCount: approvedReviews.length,
            bestRating: 5,
          },
        }
      : {}),
  }
}

/**
 * Renders JSON-LD into a script tag.
 *
 * `JSON.stringify` output is escaped so a `</script>` sequence inside any
 * content field cannot break out of the tag - a real XSS vector when the data
 * is admin- or user-authored.
 */
export function jsonLdScript(schema: JsonLd | JsonLd[] | null): { __html: string } | null {
  if (!schema) return null

  const json = JSON.stringify(schema)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')

  return { __html: json }
}
