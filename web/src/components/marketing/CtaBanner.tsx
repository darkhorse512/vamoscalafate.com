import { ArrowRight } from 'lucide-react'
import type { MediaRef } from '@vamos/types'
import { ButtonLink } from '@/components/ui/Button'
import { SmartImage } from '@/components/media/SmartImage'
import { PhotoCredit } from '@/components/media/PhotoCredit'

/** Closing call to action. One primary path, one secondary - never a wall. */
export function CtaBanner({
  eyebrow,
  title,
  description,
  primary,
  secondary,
  media,
}: {
  /** Optional backdrop photograph; without one the band uses the brand aurora. */
  media?: MediaRef | null
  eyebrow?: string
  title: string
  description: string
  primary: { href: string; label: string }
  secondary?: { href: string; label: string }
}) {
  return (
    <section className="relative isolate overflow-hidden bg-aurora">
      {media?.url ? (
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <SmartImage media={media} seed="cta" alt="" sizes="100vw" />
          <div className="absolute inset-0 bg-plum-950/75" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 via-transparent to-magenta-900/40" />
        </div>
      ) : null}

      <div className="reveal container-page py-20 text-center sm:py-28">
        {eyebrow ? (
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-violet-300">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mx-auto mt-3 max-w-3xl font-display text-display-md font-bold leading-tight text-white">
          {title}
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-stone-300">
          {description}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href={primary.href} size="lg" variant="accent">
            {primary.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>

          {secondary ? (
            <ButtonLink
              href={secondary.href}
              size="lg"
              variant="glass"
            >
              {secondary.label}
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {media?.url ? (
        <PhotoCredit media={media} tone="light" className="absolute bottom-3 right-5 text-right" />
      ) : null}
    </section>
  )
}
