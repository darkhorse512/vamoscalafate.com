import type { MediaRef } from '@vamos/types'
import { cn } from '@/lib/utils'

/**
 * Some Commons records give a profile URL as the author. Show the account
 * name it points at rather than the raw address.
 */
export function authorLabel(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) return value
  try {
    const url = new URL(value)
    const segment = url.pathname.split('/').filter(Boolean).pop()
    const site = url.hostname.replace(/^www\./, '').split('.')[0]
    return segment ? `${segment} (${site})` : url.hostname
  } catch {
    return value
  }
}

/**
 * Renders the photographer credit a Creative Commons licence requires.
 *
 * CC BY and CC BY-SA are permissive but conditional: reuse is allowed only if
 * the author and the licence are named wherever the work appears. Omitting the
 * credit makes the use unlicensed, so this is a legal requirement rather than
 * a courtesy.
 *
 * Images we own outright carry no licence string and render nothing — a credit
 * line on our own photography would be noise.
 */
export function PhotoCredit({
  media,
  className,
  tone = 'dark',
}: {
  media: MediaRef | null | undefined
  className?: string
  /** `light` sits on a photograph or dark backdrop; `dark` on page background. */
  tone?: 'light' | 'dark'
}) {
  if (!media?.license || media.license === 'NONE') return null

  const author = authorLabel(media.attributionText)
  const licence = media.license.trim()

  return (
    <p
      className={cn(
        'text-[0.6875rem] leading-snug',
        tone === 'light' ? 'text-white/55' : 'text-muted-foreground',
        className,
      )}
    >
      {media.sourceUrl ? (
        <a
          href={media.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline-offset-2 hover:underline"
        >
          Foto
        </a>
      ) : (
        'Foto'
      )}
      {author ? (
        <>
          {' de '}
          {media.attributionUrl ? (
            <a
              href={media.attributionUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline-offset-2 hover:underline"
            >
              {author}
            </a>
          ) : (
            author
          )}
        </>
      ) : null}
      {' · '}
      <span>{licence}</span>
    </p>
  )
}

/**
 * A single collapsed credit line for a set of images, for use under a gallery
 * where per-tile credits would overwhelm the photographs themselves. The
 * licence still names every author, which is what the terms require.
 */
export function PhotoCredits({
  images,
  className,
}: {
  images: (MediaRef | null | undefined)[]
  className?: string
}) {
  const credited = images.filter(
    (media): media is MediaRef => Boolean(media?.license) && media?.license !== 'NONE',
  )
  if (credited.length === 0) return null

  // De-duplicate: the same photograph often appears in several slots.
  const seen = new Set<string>()
  const unique = credited.filter((media) => {
    if (seen.has(media.id)) return false
    seen.add(media.id)
    return true
  })

  return (
    <p className={cn('text-[0.6875rem] leading-relaxed text-muted-foreground', className)}>
      <span className="font-medium">Créditos fotográficos: </span>
      {unique.map((media, index) => (
        <span key={media.id}>
          {index > 0 ? ' · ' : ''}
          {media.sourceUrl ? (
            <a
              href={media.sourceUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline-offset-2 hover:underline"
            >
              {authorLabel(media.attributionText) ?? 'Autor desconocido'}
            </a>
          ) : (
            (authorLabel(media.attributionText) ?? 'Autor desconocido')
          )}
          {` (${media.license})`}
        </span>
      ))}
    </p>
  )
}
