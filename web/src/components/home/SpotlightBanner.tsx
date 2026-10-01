import { ArrowRight, Check, Clock, MapPin } from 'lucide-react'
import { ROUTES, formatDurationLabel } from '@vamos/shared'
import type { SpotlightTour } from '@/server/queries/home'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/media/SmartImage'
import { PhotoCredits } from '@/components/media/PhotoCredit'
import { Price } from '@/components/tours/Price'

/**
 * Full-width feature banner for a single experience.
 *
 * A layered photo composition on one side and the facts that decide a
 * booking — duration, place, price — on the other. Everything shown comes
 * from the tour record, so the banner cannot drift from the product page.
 */
export function SpotlightBanner({ tour }: { tour: SpotlightTour }) {
  const [main, second, third] = tour.images

  return (
    <section className="relative isolate overflow-hidden bg-aurora text-white">
      <div className="container-page grid items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16">
        {/* ── Composition ──────────────────────────────────────────────── */}
        <div className="reveal relative mx-auto aspect-[5/4] w-full max-w-xl lg:max-w-none">
          <div className="absolute inset-y-0 left-0 right-[14%] overflow-hidden rounded-[1.25rem] shadow-float ring-1 ring-white/10">
            <SmartImage
              media={main}
              seed={`${tour.slug}-main`}
              alt={tour.name}
              sizes="(max-width: 1023px) 86vw, 42vw"
            />
          </div>

          {second ? (
            <div className="animate-float absolute -bottom-6 right-0 aspect-[4/3] w-[44%] overflow-hidden rounded-card border-4 border-plum-950 shadow-float">
              <SmartImage media={second} seed={`${tour.slug}-second`} alt="" sizes="22vw" />
            </div>
          ) : null}

          {third ? (
            <div className="absolute -top-5 right-[6%] hidden aspect-square w-[24%] overflow-hidden rounded-card border-4 border-plum-950 shadow-float sm:block">
              <SmartImage media={third} seed={`${tour.slug}-third`} alt="" sizes="14vw" />
            </div>
          ) : null}

          <div className="absolute -left-3 top-8 rounded-card bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur-xl sm:-left-6">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/70">
              Duración
            </p>
            <p className="mt-0.5 font-display text-xl font-bold">
              {formatDurationLabel(tour.durationMinutes)}
            </p>
          </div>
        </div>

        {/* ── Copy ─────────────────────────────────────────────────────── */}
        <div className="reveal">
          <p className="inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-magenta-300">
            <span className="accent-rule" aria-hidden="true" />
            Experiencia imperdible · {tour.categoryName}
          </p>

          <h2 className="mt-4 font-display text-display-md font-bold leading-[1.08] text-white">
            {tour.name}
          </h2>

          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-white/80">
            {tour.summary}
          </p>

          {tour.highlights.length > 0 ? (
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {tour.highlights.map((highlight) => (
                <li key={highlight} className="flex gap-2.5 text-[0.875rem] leading-snug text-white/85">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-magenta-500/20 text-magenta-300">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                  {highlight}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8125rem] text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {formatDurationLabel(tour.durationMinutes)}
            </span>
            {tour.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {tour.location}
              </span>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col gap-5 border-t border-white/15 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="[&_*]:!text-white">
              <Price cents={tour.fromPriceCents} currency={tour.currency} from size="lg" />
            </div>
            <ButtonLink href={ROUTES.tour(tour.slug)} size="lg" variant="accent" className="shadow-accent">
              Ver fechas y reservar
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <PhotoCredits images={tour.images} className="mt-6 !text-white/45" />
        </div>
      </div>
    </section>
  )
}
