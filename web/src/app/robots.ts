import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@vamos/shared'

/**
 * robots.txt.
 *
 * Disallows the funnel and the search space - the pages that would otherwise
 * generate unbounded thin URLs - while leaving the whole content catalogue
 * open. The admin lives on a separate domain with its own robots rules, so it
 * is not referenced here at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/reservar',
          '/checkout',
          '/checkout/',
          '/buscar',
          // Blocks faceted-filter combinations from being crawled as separate
          // pages; the canonical listing URLs remain fully indexable.
          '/*?*orden=',
          '/*?*precioMax=',
          '/*?*duracionMax=',
          '/*?*dificultad=',
          '/*?*fecha=',
          '/*?*utm_',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
