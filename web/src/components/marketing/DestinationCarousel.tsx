import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import type { DestinationCard } from '@vamos/types'
import { Carousel } from '@/components/ui/Carousel'
import { SmartImage } from '@/components/media/SmartImage'

/**
 * Destination carousel.
 *
 * Taller, more cinematic frames than a tour card: these are places, and the
 * image should carry the section rather than a price.
 */
export function DestinationCarousel({
  destinations,
  ariaLabel,
}: {
  destinations: DestinationCard[]
  ariaLabel: string
}) {
  if (destinations.length === 0) return null

  return (
    <Carousel ariaLabel={ariaLabel} slideClass="basis-[80%] sm:basis-[46%] lg:basis-[32%]">
      {destinations.map((destination) => (
        <Link
          key={destination.id}
          href={ROUTES.destination(destination.slug)}
          className="group relative flex aspect-[4/5] w-full flex-col justify-end overflow-hidden rounded-card focus-visible:ring-2 focus-visible:ring-glacier-600 focus-visible:ring-offset-2"
        >
          <SmartImage
            media={destination.heroImage}
            seed={destination.slug}
            alt={destination.name}
            sizes="(max-width: 639px) 80vw, (max-width: 1023px) 46vw, 32vw"
            className="transition-transform duration-700 group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 scrim-bottom" />

          <div className="relative p-5">
            <h3 className="flex items-start gap-1.5 font-display text-xl font-semibold leading-tight text-white">
              {destination.name}
              <ArrowUpRight
                className="mt-1 size-4 shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden="true"
              />
            </h3>
            <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-white/80">
              {destination.shortIntro}
            </p>
          </div>
        </Link>
      ))}
    </Carousel>
  )
}
