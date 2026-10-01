import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { ROUTES } from '@vamos/shared'
import type { TourCard } from '@vamos/types'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/media/SmartImage'
import { Highlight } from './Highlight'

/**
 * "3 Imperdibles en El Calafate" — the moving banner the brief asked for in
 * the middle of the homepage's excursion list.
 *
 * The headline flips between its two messages ("3 imperdibles…" / "¡No podés
 * perderte estos tours!") and leads to a page that explains the three tours
 * and the bundle promotion. The three photographs are the tours' own covers.
 */
export type MustSeeContent = {
  badge: string
  headlineFront: string
  headlineBack: string
  body: string
  cta: { label: string; href: string }
}

export function MustSeeBanner({ tours, content }: { tours: TourCard[]; content: MustSeeContent }) {
  if (tours.length < 3) return null

  return (
    <section
      aria-label="3 excursiones imperdibles en El Calafate"
      className="reveal relative isolate overflow-hidden rounded-[1.75rem] bg-aurora text-white shadow-float"
    >
      <div
        className="pointer-events-none absolute -left-20 -top-24 -z-10 size-72 rounded-full bg-magenta-500/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-magenta-200 ring-1 ring-inset ring-white/20">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {content.badge}
          </p>

          {/* Both messages are in the DOM; screen readers get the first. */}
          <h2 className="flip-headline mt-5 font-display text-[2.125rem] font-bold leading-[1.05] text-white sm:text-[3rem]">
            <span className="flip-headline__inner">
              <span className="flip-headline__face">
                <Highlight text={content.headlineFront} />
              </span>
              <span className="flip-headline__face flip-headline__face--back" aria-hidden="true">
                <Highlight text={content.headlineBack} />
              </span>
            </span>
          </h2>

          <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-white/80">
            <Highlight text={content.body} />
          </p>

          <ButtonLink href={content.cta.href || ROUTES.mustSee} variant="accent" size="lg" className="mt-7 shadow-accent">
            {content.cta.label || 'Ver los 3 imperdibles'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </div>

        <ul className="grid grid-cols-3 gap-3 sm:gap-4">
          {tours.slice(0, 3).map((tour, index) => (
            <li key={tour.id} className={index === 1 ? 'translate-y-6' : ''}>
              <Link
                href={ROUTES.tour(tour.slug)}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-white/15 transition-transform duration-500 hover:-translate-y-1"
              >
                <SmartImage
                  media={tour.images[0]?.media}
                  seed={tour.slug}
                  alt={tour.name}
                  sizes="(max-width: 1023px) 30vw, 18vw"
                  className="transition-transform duration-700 group-hover:scale-[1.08]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-plum-950/85 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-magenta-500 font-display text-sm font-bold">
                  {index + 1}
                </span>
                <span className="absolute inset-x-3 bottom-3 font-display text-sm font-semibold leading-tight sm:text-base">
                  {tour.name.replace(/:.*$/, '')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
