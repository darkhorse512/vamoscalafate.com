import Image from 'next/image'
import { ArrowRight, Users } from 'lucide-react'
import type { MediaRef } from '@vamos/types'
import { Carousel } from '@/components/ui/Carousel'
import { SmartImage } from '@/components/media/SmartImage'
import { ButtonLink } from '@/components/ui/Button'

export type FleetItem = {
  name: string
  capacity: string
  description: string
  media: MediaRef | null
  /** Fallback file under /public, used when no media id is configured. */
  imageSrc: string
}

/**
 * The vehicles used for transfers.
 *
 * The supplied photographs are catalogue shots of white vehicles on a white
 * background. They are therefore presented on a light tile with generous
 * padding, which is how a vehicle catalogue reads anyway - cutting them out
 * onto the page background made the bodywork look translucent, because the
 * bodywork and the background are the same colour.
 *
 * Capacity is printed only when the operator has filled it in. A seat count
 * depends on how a van is fitted out, and a plausible-looking number here
 * would be a promise nobody made.
 */
export function FleetCarousel({
  items,
  ariaLabel,
  cta,
}: {
  items: FleetItem[]
  ariaLabel: string
  cta?: { label: string; href: string }
}) {
  if (items.length === 0) return null

  return (
    <>
      <Carousel ariaLabel={ariaLabel} slideClass="basis-[84%] sm:basis-[48%] lg:basis-[32%]">
        {items.map((item) => (
          <article
            key={item.name}
            className="flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-subtle transition-shadow duration-300 hover:shadow-raised"
          >
            <div className="relative aspect-[16/9] bg-white">
              {item.media ? (
                <SmartImage
                  media={item.media}
                  alt={item.name}
                  seed={item.name}
                  sizes="(min-width: 1024px) 22rem, (min-width: 640px) 46vw, 84vw"
                  className="object-contain p-3"
                />
              ) : (
                <Image
                  src={item.imageSrc}
                  alt={item.name}
                  fill
                  sizes="(min-width: 1024px) 22rem, (min-width: 640px) 46vw, 84vw"
                  className="object-contain p-3"
                />
              )}
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-display text-lg font-semibold text-heading">{item.name}</h3>
              {item.capacity ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-primary">
                  <Users className="size-3.5" aria-hidden="true" />
                  {item.capacity}
                </p>
              ) : null}
              {item.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
          </article>
        ))}
      </Carousel>

      {cta?.label ? (
        <div className="mt-8 flex justify-center">
          <ButtonLink href={cta.href} variant="outline">
            {cta.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      ) : null}
    </>
  )
}
