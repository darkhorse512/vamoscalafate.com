import type { MetadataRoute } from 'next'

/**
 * Blanket disallow for the entire admin host.
 *
 * Nothing here is ever public, so there is no allow-list to maintain and no
 * sitemap to expose.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
