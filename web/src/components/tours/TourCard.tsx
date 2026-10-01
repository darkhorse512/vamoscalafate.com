import Link from 'next/link'
import { ArrowRight, Clock, MapPin, Mountain } from 'lucide-react'
import { ROUTES, formatDurationLabel } from '@vamos/shared'
import type { TourCard as TourCardData } from '@vamos/types'
import { SmartImage } from '@/components/media/SmartImage'
import { cn } from '@/lib/utils'
import { Price } from './Price'

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Baja exigencia',
  MODERATE: 'Exigencia media',
  CHALLENGING: 'Exigencia alta',
}

/**
 * Product card.
 *
 * The whole card is one link via a stretched overlay, so the entire surface is
 * clickable while the accessible name stays a single anchor - a card wrapped
 * in an anchor containing more anchors would announce a confusing nest.
 */
export function TourCard({
  tour,
  priority = false,
  className,
}: {
  tour: TourCardData
  /** Set on the first row of the first viewport so the LCP image is eager. */
  priority?: boolean
  className?: string
}) {
  const channel = tour.category.channel
  const href =
    channel === 'traslados'
      ? ROUTES.transfer(tour.slug)
      : channel === 'servicios'
        ? ROUTES.service(tour.slug)
        : ROUTES.tour(tour.slug)

  const cover = tour.images[0]?.media

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-float has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-strong">
        <SmartImage
          media={cover}
          seed={tour.slug}
          alt={tour.name}
          sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
          priority={priority}
          className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-plum-950/55 via-transparent to-transparent" />

        {tour.featured ? (
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-magenta-500 to-magenta-600 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-white shadow-accent">
              Destacada
            </span>
          </div>
        ) : null}

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
          <Clock className="size-3" aria-hidden="true" />
          {formatDurationLabel(tour.durationMinutes)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-primary">
          {tour.category.name}
        </p>

        <h3 className="mt-2 font-display text-[1.0625rem] font-semibold leading-snug text-heading">
          <Link href={href} className="before:absolute before:inset-0 focus:outline-none">
            {tour.name}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {tour.summary}
        </p>

        <ul className="mb-4 mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground">
          {tour.location ? (
            <li className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{tour.location}</span>
            </li>
          ) : null}

          {tour.difficulty !== 'EASY' ? (
            <li className="inline-flex items-center gap-1.5">
              <Mountain className="size-3.5 shrink-0" aria-hidden="true" />
              {DIFFICULTY_LABEL[tour.difficulty]}
            </li>
          ) : null}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
          <Price cents={tour.fromPriceCents} currency={tour.currency} from size="md" />
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-primary-soft px-3.5 py-1.5 text-[0.8125rem] font-semibold text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
            Ver detalle
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  )
}
