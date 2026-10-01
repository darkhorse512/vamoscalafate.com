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
          className="group relative flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-[1.25rem] bg-inverse shadow-subtle transition-shadow duration-300 hover:shadow-float focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <SmartImage
            media={destination.heroImage}
            seed={destination.slug}
            alt={destination.name}
            sizes="(max-width: 639px) 80vw, (max-width: 1023px) 46vw, 32vw"
            className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-plum-950/90 via-plum-950/20 to-transparent" />

          <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-all duration-300 group-hover:rotate-45 group-hover:bg-magenta-500 group-hover:ring-magenta-500">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>

          <div className="relative p-6">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-violet-300">Destino</p>
            <h3 className="mt-1.5 font-display text-2xl font-semibold leading-tight text-white">
              {destination.name}
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
