import Image from 'next/image'
import type { MediaRef } from '@vamos/types'
import { cn } from '@/lib/utils'
import { PhotoPlaceholder } from './PhotoPlaceholder'

/**
 * Image wrapper that degrades to a designed placeholder.
 *
 * Every consumer passes `sizes` explicitly: without it next/image assumes
 * 100vw and ships a desktop-width file to phones, which is the single most
 * common cause of a poor LCP on an image-led site.
 */
export function SmartImage({
  media,
  alt,
  seed,
  fill = true,
  width,
  height,
  sizes,
  priority = false,
  quality = 78,
  className,
  placeholderLabel,
}: {
  media?: MediaRef | null
  /** Falls back to the media's own alt text; never silently empty. */
  alt: string
  /** Stable key for the placeholder composition. */
  seed: string
  fill?: boolean
  width?: number
  height?: number
  sizes: string
  priority?: boolean
  quality?: number
  className?: string
  placeholderLabel?: string
}) {
  if (!media?.url) {
    return <PhotoPlaceholder seed={seed} className={className} label={placeholderLabel} />
  }

  const resolvedAlt = media.altText?.trim() || alt

  const common = {
    src: media.url,
    sizes,
    quality,
    priority,
    // Above-the-fold images must not be lazy — that delays the LCP element.
    loading: priority ? ('eager' as const) : ('lazy' as const),
    className: cn('object-cover', className),
    ...(media.blurDataUrl
      ? { placeholder: 'blur' as const, blurDataURL: media.blurDataUrl }
      : {}),
  }

  if (fill) return <Image {...common} alt={resolvedAlt} fill />

  return (
    <Image
      {...common}
      alt={resolvedAlt}
      width={width ?? media.width ?? 1200}
      height={height ?? media.height ?? 800}
    />
  )
}
