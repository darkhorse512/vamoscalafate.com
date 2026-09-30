import type { Metadata } from 'next'
import type { SeoMetadata } from '@vamos/types'
import { SITE, absoluteUrl, truncate } from '@vamos/shared'

/**
 * Metadata builder.
 *
 * Every indexable page goes through `buildMetadata`, which guarantees a
 * canonical URL, an absolute OG image and coherent title/description - the
 * three things most often missed when metadata is written page by page.
 *
 * Admin-set SeoMetadata always wins over the derived defaults.
 */

const TITLE_SUFFIX = SITE.name
const MAX_TITLE = 60
const MAX_DESCRIPTION = 160

export type BuildMetadataArgs = {
  title: string
  description: string
  path: string
  imageUrl?: string | null
  imageAlt?: string | null
  /** Admin overrides from the SEO editor. */
  seo?: Pick<
    SeoMetadata,
    'title' | 'description' | 'canonicalUrl' | 'ogTitle' | 'ogDescription' | 'ogImageUrl' | 'noindex' | 'nofollow'
  > | null
  type?: 'website' | 'article'
  publishedTime?: Date | string | null
  modifiedTime?: Date | string | null
  /** Set for pages that must never be indexed, e.g. checkout. */
  noindex?: boolean
}

function withSuffix(title: string): string {
  if (title === TITLE_SUFFIX || title.includes(TITLE_SUFFIX)) return truncate(title, MAX_TITLE + 12)
  const full = `${title} | ${TITLE_SUFFIX}`
  return full.length <= MAX_TITLE + 20 ? full : truncate(title, MAX_TITLE)
}

export function buildMetadata(args: BuildMetadataArgs): Metadata {
  const seo = args.seo

  const title = seo?.title?.trim() || args.title
  const description = truncate(seo?.description?.trim() || args.description, MAX_DESCRIPTION)
  const canonical = seo?.canonicalUrl?.trim() || absoluteUrl(args.path)

  const ogImage = seo?.ogImageUrl?.trim() || args.imageUrl || absoluteUrl(SITE.defaultOgImage)
  const noindex = args.noindex || seo?.noindex || false
  const nofollow = seo?.nofollow || false

  return {
    title: withSuffix(title),
    description,
    alternates: { canonical },
    robots: {
      index: !noindex,
      follow: !nofollow,
      googleBot: {
        index: !noindex,
        follow: !nofollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: args.type ?? 'website',
      title: seo?.ogTitle?.trim() || title,
      description: seo?.ogDescription?.trim() || description,
      url: canonical,
      siteName: SITE.name,
      locale: SITE.locale,
      images: [{ url: ogImage, width: 1200, height: 630, alt: args.imageAlt ?? title }],
      ...(args.type === 'article'
        ? {
            publishedTime: args.publishedTime
              ? new Date(args.publishedTime).toISOString()
              : undefined,
            modifiedTime: args.modifiedTime
              ? new Date(args.modifiedTime).toISOString()
              : undefined,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: seo?.ogTitle?.trim() || title,
      description: seo?.ogDescription?.trim() || description,
      images: [ogImage],
    },
  }
}

/** Metadata for pages that must stay out of the index entirely. */
export function noindexMetadata(title: string, description: string): Metadata {
  return {
    title: withSuffix(title),
    description,
    robots: { index: false, follow: false, nocache: true },
  }
}
