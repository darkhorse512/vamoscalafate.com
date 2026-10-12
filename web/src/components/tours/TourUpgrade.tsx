import { Check, Sparkles } from 'lucide-react'
import { formatMoney } from '@vamos/shared'
import type { TourExtraWithMedia } from '@vamos/types'
import { SmartImage } from '@/components/media/SmartImage'
import { cn } from '@/lib/utils'

/**
 * An add-on that deserves its own panel.
 *
 * Captain Club and the Gourmet VIP lounge are not line items in a list of
 * extras: for part of the audience they are the reason the excursion is worth
 * booking at all. A checkbox labelled "Upgrade Captain Club · $25.200" tells
 * nobody what they would be buying, so the upgrade gets the room to say it -
 * what it includes, how many people it holds, and a photograph.
 *
 * The price is stated on the panel rather than revealed in the booking step.
 * The panel sells; it does not bait.
 */
export function TourUpgrade({
  extra,
  currency,
  reverse = false,
}: {
  extra: TourExtraWithMedia
  currency: string
  /** Alternates the image side when a tour offers two upgrades. */
  reverse?: boolean
}) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-navy-950 text-white shadow-float">
      {/*
        Without a photograph the panel is a single column: a half-empty dark
        rectangle beside the text reads as a failed image, not as a design.
      */}
      <div
        className={cn(
          'grid items-stretch gap-0',
          extra.media && 'sm:grid-cols-2',
          extra.media && reverse && 'sm:[&>*:first-child]:order-2',
        )}
      >
        <div className={cn('p-7 sm:p-9', !extra.media && 'sm:max-w-2xl')}>
          {extra.badge ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sunset-600 px-3 py-1 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-white">
              <Sparkles className="size-3" aria-hidden="true" />
              {extra.badge}
            </span>
          ) : null}

          <h3 className="mt-4 font-display text-[1.625rem] font-semibold leading-tight text-white sm:text-[1.875rem]">
            {extra.name}
          </h3>

          {extra.description ? (
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/75">{extra.description}</p>
          ) : null}

          {extra.details.length > 0 ? (
            <ul className="mt-5 space-y-2.5">
              {extra.details.map((detail) => (
                <li key={detail} className="flex items-start gap-2.5 text-[0.875rem] leading-relaxed text-white/85">
                  <Check className="mt-0.5 size-4 shrink-0 text-sky-300" strokeWidth={2.5} aria-hidden="true" />
                  {detail}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-6 border-t border-white/15 pt-5 text-[0.8125rem] text-white/70">
            <span className="font-display text-xl font-bold text-white">
              {formatMoney(extra.priceCents, currency)}
            </span>{' '}
            {extra.perPerson ? 'por persona' : 'por reserva'} · se suma al reservar
          </p>
        </div>

        {extra.media ? (
          <div className="relative min-h-[14rem] sm:min-h-0">
            <SmartImage
              media={extra.media}
              alt={extra.name}
              seed={extra.id}
              sizes="(min-width: 640px) 28rem, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}
