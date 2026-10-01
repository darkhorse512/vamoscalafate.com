import { BadgeCheck, Quote, Star } from 'lucide-react'
import type { HomeReview } from '@/server/queries/home'
import { Carousel } from '@/components/ui/Carousel'

/**
 * Traveller reviews. Renders only moderated, approved reviews from real
 * customers and disappears entirely when there are none — an empty state
 * filled with sample quotes would be fabricated social proof.
 */
export function ReviewsCarousel({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length === 0) return null

  return (
    <Carousel ariaLabel="Opiniones de viajeros" slideClass="basis-[86%] sm:basis-[48%] lg:basis-[31.5%]">
      {reviews.map((review) => (
        <figure
          key={review.id}
          className="relative flex h-full w-full flex-col rounded-[1.25rem] border border-border bg-surface p-6 shadow-subtle"
        >
          <Quote className="absolute right-5 top-5 size-8 text-primary/15" aria-hidden="true" />
          <div className="flex gap-0.5" aria-label={`${review.rating} de 5 estrellas`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={i < review.rating ? 'size-4 fill-magenta-500 text-magenta-500' : 'size-4 text-border-strong'}
                aria-hidden="true"
              />
            ))}
          </div>
          {review.title ? (
            <p className="mt-4 font-display text-[1.0625rem] font-semibold text-heading">{review.title}</p>
          ) : null}
          <blockquote className="mt-2 line-clamp-6 flex-1 text-[0.875rem] leading-relaxed text-foreground">
            {review.content}
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-magenta-500 text-sm font-bold text-white">
              {review.authorName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold text-heading">
                {review.authorName}
                {review.isVerified ? (
                  <BadgeCheck className="size-4 text-primary" aria-label="Reserva verificada" />
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {[review.authorCountry, review.tourName].filter(Boolean).join(' · ')}
              </span>
            </span>
          </figcaption>
        </figure>
      ))}
    </Carousel>
  )
}
