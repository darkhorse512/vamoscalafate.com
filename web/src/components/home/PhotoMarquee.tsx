import type { MediaRef } from '@vamos/types'
import { SmartImage } from '@/components/media/SmartImage'
import { PhotoCredits } from '@/components/media/PhotoCredit'
import { cn } from '@/lib/utils'

/**
 * Two rows of photographs drifting in opposite directions.
 *
 * Pure CSS: each track contains its set twice and translates by -50%, so the
 * loop is seamless with no JavaScript and no layout measurement. Hovering or
 * focusing pauses it; under reduced motion it becomes a static, scrollable
 * rail (see globals.css).
 *
 * Decorative repetition, so the duplicated half is aria-hidden: a screen
 * reader hears each photograph once.
 */
export function PhotoMarquee({ photos }: { photos: MediaRef[] }) {
  if (photos.length < 4) return null

  const half = Math.ceil(photos.length / 2)
  const rows = [photos.slice(0, half), photos.slice(half)].filter((row) => row.length > 0)

  return (
    <div>
      <div className="space-y-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="marquee mask-fade-x overflow-hidden">
            <ul
              className="marquee-track flex w-max gap-4"
              data-direction={rowIndex % 2 === 1 ? 'reverse' : undefined}
              style={{ '--marquee-duration': `${row.length * 9}s` } as React.CSSProperties}
            >
              {[...row, ...row].map((photo, index) => (
                <li
                  key={`${photo.id}-${index}`}
                  aria-hidden={index >= row.length}
                  className={cn(
                    'relative h-44 shrink-0 overflow-hidden rounded-card sm:h-56',
                    index % 3 === 0 ? 'w-[19rem] sm:w-[24rem]' : 'w-[15rem] sm:w-[19rem]',
                  )}
                >
                  <SmartImage
                    media={photo}
                    seed={photo.id}
                    alt={index >= row.length ? '' : (photo.altText ?? 'Paisaje de la Patagonia austral')}
                    sizes="(max-width: 639px) 70vw, 384px"
                    className="transition-transform duration-700 hover:scale-[1.06]"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container-page">
        <PhotoCredits images={photos} className="mt-5 text-center" />
      </div>
    </div>
  )
}
